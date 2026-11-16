# EditMax

EditMax is a static, frontend-only video workspace. It lets visitors open a video from their own device, preview it, set trim points, and export the selected clip in the browser where supported. There is no application server, API, account system, analytics, upload service, or external runtime dependency.

## Run locally

Serve this folder with any static file server, for example:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. For video export, use a modern browser that supports `MediaRecorder` and `HTMLMediaElement.captureStream` (Chrome, Edge, and Firefox on desktop are recommended). Because export records the selected portion as it plays, keep the tab open until the download starts.

## Deploy

The site is a static project with no build step. The Vercel project is named `editmaxai` and uses this repository's root directory. `vercel.json` contains clean-URL and security-header settings.

## Privacy

The editor uses a temporary browser object URL for the selected local file and revokes it when the project is cleared or replaced. The file is not sent to a server.
