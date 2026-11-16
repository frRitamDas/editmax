(() => {
  "use strict";
  if (window.__editmaxTourReady) return;
  window.__editmaxTourReady = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const posters = {
    "/landing/video/demo-raw.webp": "./assets/31_screen-cutting.webp",
    "/landing/video/demo-cut.webp": "./assets/22_after-poster.webp",
    "/creators/poster/nick-fowler.webp": "./assets/23_nick-fowler.webp",
    "/landing/tour-creators/colin-reich.jpg": "./assets/24_colin-reich.webp",
    "/landing/tour-creators/nick-fowler.jpg": "./assets/23_nick-fowler.webp",
    "/landing/tour-creators/james-white.jpg": "./assets/25_james-white.webp"
  };
  const load = (video) => {
    if (!video || video.dataset.editmaxLoaded) return;
    const poster = video.dataset.poster;
    if (poster && posters[poster]) video.poster = posters[poster];
    if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
    video.dataset.editmaxLoaded = "1";
    try { video.load(); } catch (_) {}
  };
  const safePlay = (video) => {
    if (!video) return;
    load(video);
    const result = video.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  };
  const pause = (video) => { if (video && !video.paused) video.pause(); };

  function initDemoPairs() {
    $$(".td-pair").forEach((pair) => {
      const videos = $$('video', pair);
      videos.forEach((video) => {
        const poster = video.dataset.poster;
        if (poster && posters[poster]) video.poster = posters[poster];
      });
      if (!("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) safePlay(entry.target);
          else pause(entry.target);
        });
      }, { threshold: 0.35 });
      videos.forEach((video) => observer.observe(video));
    });
  }

  function initDecorativeVideos() {
    const videos = $$(".tool-card video, .cut-card video");
    if (!videos.length) return;
    if (!("IntersectionObserver" in window)) {
      videos.forEach((video) => load(video));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          safePlay(video);
          observer.unobserve(video);
        } else pause(video);
      });
    }, { rootMargin: "120px 0px", threshold: 0.15 });
    videos.forEach((video) => observer.observe(video));
  }

  function initSoundButtons() {
    $$(".cut-sound").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".cut-card");
        const video = card && $("video", card);
        if (!video) return;
        const turnSoundOn = video.muted;
        $$(".cut-card video").forEach((other) => {
          if (other !== video) { other.muted = true; other.pause(); }
        });
        video.muted = !turnSoundOn;
        if (turnSoundOn) safePlay(video);
        button.setAttribute("aria-pressed", String(turnSoundOn));
        button.setAttribute("aria-label", `${turnSoundOn ? "Mute" : "Play"} ${card.dataset.creator || "creator"} video${turnSoundOn ? "" : " with sound"}`);
      });
    });
  }

  function initPauseButton() {
    const button = $(".big-pause");
    if (!button) return;
    let paused = false;
    button.addEventListener("click", () => {
      paused = !paused;
      const videos = $$(".td-pair video, .tool-card video, .cut-card video");
      if (paused) videos.forEach(pause);
      else videos.forEach((video) => {
        if (video.closest(".td-pair") || video.closest(".tool-card")) safePlay(video);
      });
      button.setAttribute("aria-pressed", String(paused));
      button.setAttribute("aria-label", paused ? "Play the videos" : "Pause the videos");
    });
  }

  function initDragScroll() {
    const track = $(".tst-track");
    if (!track) return;
    let startX = 0, scrollLeft = 0, pointer = null;
    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      scrollLeft = track.scrollLeft;
      track.classList.add("is-dragging");
      try { track.setPointerCapture(pointer); } catch (_) {}
    });
    track.addEventListener("pointermove", (event) => {
      if (pointer !== event.pointerId) return;
      track.scrollLeft = scrollLeft - (event.clientX - startX);
    });
    const end = (event) => {
      if (pointer !== null && event.pointerId === pointer) {
        pointer = null;
        track.classList.remove("is-dragging");
      }
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    track.addEventListener("lostpointercapture", end);
  }

  function init() {
    initDemoPairs();
    initDecorativeVideos();
    initSoundButtons();
    initPauseButton();
    initDragScroll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
