"use strict";

const $ = (selector) => document.querySelector(selector);
const video = $("#video-preview");
const fileInput = $("#video-file");
const dropZone = $("#drop-zone");
const status = $("#studio-status");
const startInput = $("#trim-start");
const endInput = $("#trim-end");
const previewButton = $("#preview-selection");
const exportButton = $("#export-button");
const clearButton = $("#clear-project");
const exportFormat = $("#export-format");
const menuButton = $("#menu-toggle");
const navigation = $("#site-navigation");

let currentFile = null;
let currentObjectUrl = null;
let selectionPlaying = false;
let mediaRecorder = null;
let exportStream = null;
let exportTimer = null;

const setStatus = (message, kind = "") => {
  status.textContent = message;
  status.classList.toggle("is-error", kind === "error");
  status.classList.toggle("is-success", kind === "success");
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function safeFileBase(name) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return (
    withoutExtension
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "editmax-video"
  );
}

function getDuration() {
  return Number.isFinite(video.duration) && video.duration > 0
    ? video.duration
    : 0;
}

function getTrimRange() {
  const duration = getDuration();
  if (!duration) return { start: 0, end: 0 };
  const minGap = Math.min(0.1, duration);
  let start = Number.parseFloat(startInput.value);
  let end = Number.parseFloat(endInput.value);
  if (!Number.isFinite(start)) start = 0;
  if (!Number.isFinite(end)) end = duration;
  start = clamp(start, 0, duration);
  end = clamp(end, 0, duration);
  if (end - start < minGap) {
    if (document.activeElement === startInput) {
      if (start + minGap <= duration) end = start + minGap;
      else {
        start = Math.max(0, duration - minGap);
        end = duration;
      }
    } else if (end - minGap >= 0) {
      start = end - minGap;
    } else {
      start = 0;
      end = minGap;
    }
  }
  start = Math.round(start * 100) / 100;
  end = Math.round(end * 100) / 100;
  startInput.value = String(start);
  endInput.value = String(end);
  return { start, end };
}

function refreshTimeline() {
  const duration = getDuration();
  const { start, end } = getTrimRange();
  const selection = $("#selection-fill");
  const playhead = $("#selection-playhead");
  const selectionDuration = $("#selection-duration");
  const videoDuration = $("#video-duration");

  if (!duration) {
    selection.style.left = "0%";
    selection.style.width = "0%";
    playhead.style.left = "0%";
    selectionDuration.textContent = "0:00 selected";
    videoDuration.textContent = "0:00";
    return;
  }

  selection.style.left = `${(start / duration) * 100}%`;
  selection.style.width = `${((end - start) / duration) * 100}%`;
  playhead.style.left = `${(video.currentTime / duration) * 100}%`;
  selectionDuration.textContent = `${formatTime(end - start)} selected`;
  videoDuration.textContent = formatTime(duration);
}

function updateTimeInputs(changedInput) {
  const duration = getDuration();
  if (!duration) return;
  const minGap = Math.min(0.1, duration);
  let start = Number.parseFloat(startInput.value);
  let end = Number.parseFloat(endInput.value);
  if (!Number.isFinite(start)) start = 0;
  if (!Number.isFinite(end)) end = duration;
  start = clamp(start, 0, duration);
  end = clamp(end, 0, duration);

  if (end - start < minGap) {
    if (changedInput === startInput) {
      if (start + minGap <= duration) end = start + minGap;
      else {
        start = Math.max(0, duration - minGap);
        end = duration;
      }
    } else if (end - minGap >= 0) {
      start = end - minGap;
    } else {
      start = 0;
      end = minGap;
    }
  }
  startInput.value = String(Math.round(start * 100) / 100);
  endInput.value = String(Math.round(end * 100) / 100);
  refreshTimeline();
}

function setEditorEnabled(enabled) {
  startInput.disabled = !enabled;
  endInput.disabled = !enabled;
  previewButton.disabled = !enabled;
  exportButton.disabled = !enabled;
  clearButton.disabled = !currentFile;
}

function handleMetadata() {
  const duration = getDuration();
  if (!currentFile || !duration) {
    setStatus(
      "This video doesn't have a readable duration. Try another file.",
      "error",
    );
    setEditorEnabled(false);
    return;
  }
  startInput.min = "0";
  endInput.min = "0";
  startInput.max = String(duration);
  endInput.max = String(duration);
  startInput.value = "0";
  endInput.value = String(Math.round(duration * 100) / 100);
  $("#file-metadata").textContent =
    `${video.videoWidth} × ${video.videoHeight} · ${formatTime(duration)} · ${formatBytes(currentFile.size)}`;
  setEditorEnabled(true);
  refreshTimeline();
  setStatus("Ready to trim. Choose an in-point and an out-point.");
}

function isVideoFile(file) {
  return Boolean(
    file &&
      (file.type.startsWith("video/") ||
        /\.(mp4|mov|m4v|webm|ogv|ogg|mkv|avi)$/i.test(file.name)),
  );
}

function loadFile(file) {
  if (!isVideoFile(file)) {
    setStatus(
      "Please choose a video file (for example MP4, MOV or WebM).",
      "error",
    );
    return;
  }

  resetProject(false);
  currentFile = file;
  currentObjectUrl = URL.createObjectURL(file);
  $("#file-name").textContent = file.name;
  $("#file-metadata").textContent = "Loading video details…";
  $("#file-details").hidden = false;
  $("#upload-empty").hidden = true;
  video.hidden = false;
  video.src = currentObjectUrl;
  video.load();
  setEditorEnabled(false);
  setStatus("Opening your video locally…");
}

function resetProject(showMessage = true) {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.onstop = null;
    try {
      mediaRecorder.stop();
    } catch (_) {
      /* The recorder may already have stopped. */
    }
  }
  if (exportTimer !== null) {
    window.clearInterval(exportTimer);
    exportTimer = null;
  }
  if (exportStream) {
    exportStream.getTracks().forEach((track) => track.stop());
    exportStream = null;
  }
  mediaRecorder = null;
  currentFile = null;
  selectionPlaying = false;
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.hidden = true;
  fileInput.value = "";
  $("#upload-empty").hidden = false;
  $("#file-details").hidden = true;
  startInput.value = "0";
  endInput.value = "0";
  $("#export-progress").hidden = true;
  $("#progress-fill").style.width = "0%";
  exportFormat.disabled = false;
  previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
  setEditorEnabled(false);
  refreshTimeline();
  if (showMessage)
    setStatus("Video removed. Choose another clip whenever you're ready.");
}

function seekTo(time) {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.035) {
      resolve();
      return;
    }
    let timeout = null;
    const finish = () => {
      if (timeout !== null) window.clearTimeout(timeout);
      video.removeEventListener("seeked", finish);
      resolve();
    };
    video.addEventListener("seeked", finish, { once: true });
    timeout = window.setTimeout(finish, 1400);
    try {
      video.currentTime = time;
    } catch (error) {
      video.removeEventListener("seeked", finish);
      window.clearTimeout(timeout);
      reject(error);
    }
  });
}

async function previewSelection() {
  if (!currentFile) return;
  if (selectionPlaying) {
    selectionPlaying = false;
    video.pause();
    previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
    return;
  }

  const { start } = getTrimRange();
  selectionPlaying = true;
  previewButton.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause preview';
  try {
    const playback = video.play();
    const seek = seekTo(start);
    await Promise.all([playback, seek]);
    setStatus("Previewing your selected cut.");
  } catch (_) {
    selectionPlaying = false;
    previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
    setStatus("This video couldn't be played in your browser.", "error");
  }
}

function chooseMimeType(format) {
  if (!window.MediaRecorder) return false;
  const webm = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mp4 = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"];
  const candidates =
    format === "mp4" ? mp4 : format === "webm" ? webm : [...webm, ...mp4];
  if (typeof MediaRecorder.isTypeSupported !== "function")
    return format === "auto" ? null : false;
  const supported = candidates.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  if (supported) return supported;
  return format === "auto" ? null : false;
}

function stopExportAtEnd(end) {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  video.pause();
  if (video.currentTime > end) {
    try {
      video.currentTime = end;
    } catch (_) {
      /* Keep the current frame if seeking isn't available. */
    }
  }
  mediaRecorder.stop();
  if (exportTimer !== null) {
    window.clearInterval(exportTimer);
    exportTimer = null;
  }
}

async function exportSelection() {
  if (!currentFile) return;
  const capture = video.captureStream || video.mozCaptureStream;
  if (!window.MediaRecorder || !capture) {
    setStatus(
      "Export isn't supported by this browser. Try Chrome, Edge or Firefox on desktop; local preview and trim still work.",
      "error",
    );
    return;
  }

  const { start, end } = getTrimRange();
  if (end <= start) {
    setStatus(
      "Set an out-point later than the in-point before exporting.",
      "error",
    );
    return;
  }

  const mimeType = chooseMimeType(exportFormat.value);
  if (mimeType === false) {
    setStatus(
      `This browser can't export ${exportFormat.value.toUpperCase()} from this video. Choose Auto or another format.`,
      "error",
    );
    return;
  }

  const fileName = safeFileBase(currentFile.name);
  const originalPlaybackRate = video.playbackRate;
  const originalControls = video.controls;
  const chunks = [];
  selectionPlaying = false;
  previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
  video.pause();
  video.controls = false;
  try {
    exportStream = capture.call(video);
    mediaRecorder = new MediaRecorder(
      exportStream,
      mimeType ? { mimeType } : undefined,
    );
  } catch (_) {
    if (exportStream) exportStream.getTracks().forEach((track) => track.stop());
    exportStream = null;
    mediaRecorder = null;
    setStatus(
      "This browser couldn't start a local video export. Try Chrome, Edge or Firefox on desktop.",
      "error",
    );
    return;
  }

  const activeRecorder = mediaRecorder;
  const activeStream = exportStream;
  const blobType = activeRecorder.mimeType || mimeType || "video/webm";
  exportButton.disabled = true;
  previewButton.disabled = true;
  clearButton.disabled = true;
  exportFormat.disabled = true;
  $("#export-progress").hidden = false;
  $("#progress-label").textContent = "Preparing export…";
  $("#progress-value").textContent = "0%";
  $("#progress-fill").style.width = "0%";
  setStatus(
    "Recording your cut in this tab. Keep the video playing until the download starts.",
  );

  activeRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  activeRecorder.onerror = () => {
    if (exportTimer !== null) {
      window.clearInterval(exportTimer);
      exportTimer = null;
    }
    video.pause();
    setStatus(
      "The browser stopped the export. Try a shorter clip or another browser.",
      "error",
    );
  };

  activeRecorder.onstop = () => {
    if (exportTimer !== null) {
      window.clearInterval(exportTimer);
      exportTimer = null;
    }
    activeStream.getTracks().forEach((track) => track.stop());
    if (exportStream === activeStream) exportStream = null;
    if (mediaRecorder === activeRecorder) mediaRecorder = null;
    video.playbackRate = originalPlaybackRate;
    video.controls = originalControls;
    exportFormat.disabled = false;
    clearButton.disabled = !currentFile;
    previewButton.disabled = !currentFile;
    exportButton.disabled = !currentFile;
    $("#export-progress").hidden = true;

    const result = new Blob(chunks, { type: blobType });
    if (result.size === 0) {
      setStatus(
        "No video data was recorded. Try previewing the clip, then export again.",
        "error",
      );
      return;
    }
    const extension = result.type.includes("mp4") ? "mp4" : "webm";
    const downloadUrl = URL.createObjectURL(result);
    const download = document.createElement("a");
    download.href = downloadUrl;
    download.download = `${fileName}-editmax-cut.${extension}`;
    download.hidden = true;
    document.body.append(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
    setStatus(
      `Your trimmed clip is downloading as ${extension.toUpperCase()}.`,
      "success",
    );
  };

  try {
    if (Math.abs(video.currentTime - start) >= 0.035) video.currentTime = start;
    video.playbackRate = 1;
    activeRecorder.start(200);
    const playback = video.play();
    await playback;
    exportTimer = window.setInterval(() => {
      const percent = clamp(
        ((video.currentTime - start) / (end - start)) * 100,
        0,
        100,
      );
      $("#progress-fill").style.width = `${percent}%`;
      $("#progress-value").textContent = `${Math.round(percent)}%`;
      $("#progress-label").textContent =
        `Recording clip · ${formatTime(video.currentTime - start)} / ${formatTime(end - start)}`;
      if (!video.paused && video.currentTime >= end) stopExportAtEnd(end);
    }, 80);
  } catch (_) {
    if (activeRecorder.state !== "inactive") {
      try {
        activeRecorder.stop();
      } catch (_) {
        /* The recorder already stopped. */
      }
    } else {
      activeStream.getTracks().forEach((track) => track.stop());
      if (exportStream === activeStream) exportStream = null;
      if (mediaRecorder === activeRecorder) mediaRecorder = null;
      video.controls = originalControls;
      video.playbackRate = originalPlaybackRate;
      exportFormat.disabled = false;
      previewButton.disabled = !currentFile;
      clearButton.disabled = !currentFile;
      exportButton.disabled = !currentFile;
      $("#export-progress").hidden = true;
    }
    setStatus(
      "The video couldn't be played for export. Try a different file or browser.",
      "error",
    );
  }
}

function setupNavigation() {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    menuButton.setAttribute(
      "aria-label",
      expanded ? "Open navigation" : "Close navigation",
    );
    navigation.classList.toggle("is-open", !expanded);
  });
  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      navigation.classList.remove("is-open");
    });
  });
  document.querySelectorAll("[data-scroll-to-editor]").forEach((button) => {
    button.addEventListener("click", () =>
      $("#studio").scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  });
}

setupNavigation();

$("#choose-file").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const [file] = fileInput.files || [];
  if (file) loadFile(file);
});
$("#clear-project").addEventListener("click", () => resetProject());
previewButton.addEventListener("click", previewSelection);
exportButton.addEventListener("click", exportSelection);
startInput.addEventListener("input", () => updateTimeInputs(startInput));
endInput.addEventListener("input", () => updateTimeInputs(endInput));
video.addEventListener("loadedmetadata", handleMetadata);
video.addEventListener("timeupdate", () => {
  refreshTimeline();
  if (selectionPlaying && video.currentTime >= getTrimRange().end) {
    selectionPlaying = false;
    video.pause();
    previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
    setStatus("Preview finished. Adjust the trim or export your cut.");
  }
});
video.addEventListener("pause", () => {
  if (
    selectionPlaying &&
    (!currentFile || video.currentTime < getTrimRange().end)
  ) {
    selectionPlaying = false;
    previewButton.innerHTML = '<span aria-hidden="true">▶</span> Preview cut';
  }
});
video.addEventListener("error", () => {
  if (currentFile)
    setStatus(
      "Your browser couldn't decode this video. Try an MP4 or WebM file.",
      "error",
    );
});
video.addEventListener("ended", () => {
  if (mediaRecorder && mediaRecorder.state === "recording")
    stopExportAtEnd(video.currentTime);
});

dropZone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});
dropZone.addEventListener("dragover", (event) => event.preventDefault());
dropZone.addEventListener("dragleave", (event) => {
  if (!dropZone.contains(event.relatedTarget))
    dropZone.classList.remove("is-dragging");
});
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  const [file] = event.dataTransfer?.files || [];
  if (file) loadFile(file);
});

$("#current-year").textContent = String(new Date().getFullYear());
if (
  !window.MediaRecorder ||
  !(
    "captureStream" in HTMLMediaElement.prototype ||
    "mozCaptureStream" in HTMLMediaElement.prototype
  )
) {
  $("#export-help").textContent =
    "Local export is not supported in this browser. Preview and trim work; try Chrome, Edge or Firefox on desktop to export.";
}
