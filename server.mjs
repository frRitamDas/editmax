import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const routes = new Map([
  ["/", "index.html"],
  ["/account", "account.html"],
  ["/sign-in", "sign-in.html"],
  ["/sign-up", "sign-in.html"],
  ["/forgot-password", "sign-in.html"],
  ["/reset-password", "sign-in.html"],
  ["/contact", "contact.html"],
  ["/cookies", "cookies.html"],
  ["/privacy", "privacy.html"],
  ["/terms", "terms.html"],
  ["/support", "support.html"],
  ["/start", "start.html"],
  ["/checkout", "checkout.html"],
  ["/refund", "refund.html"],
  ["/welcome", "welcome.html"]
]);
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".avif", "image/avif"],
  [".mp4", "video/mp4"], [".woff2", "font/woff2"], [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"], [".xml", "application/xml; charset=utf-8"]
]);

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname); }
  catch { response.writeHead(400); response.end("Bad request"); return; }
  if (pathname.includes("\\") || pathname.split("/").includes("..")) {
    response.writeHead(400); response.end("Bad request"); return;
  }
  let relative = routes.get(pathname);
  if (!relative) {
    relative = pathname.replace(/^\/+/, "");
    if (!relative || relative.endsWith("/")) relative += "index.html";
    else if (!path.extname(relative)) relative += ".html";
  }
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types.get(path.extname(file)) || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": path.extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    if (!path.extname(relative) || path.extname(relative) === ".html") {
      try {
        const body = await readFile(path.resolve(root, "404.html"));
        response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        response.end(request.method === "HEAD" ? undefined : body);
        return;
      } catch {}
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`EditMax frontend listening on http://0.0.0.0:${port}`);
});
