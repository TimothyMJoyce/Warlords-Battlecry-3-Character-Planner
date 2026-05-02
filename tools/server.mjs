import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import {
  resolveGameInstallDir,
  resolveGraphicsArchivePath,
  resolveHeroDataArchivePath,
  resolvePortraitArchivePath,
} from "./wbc3-paths.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const startingPort = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".bmp": "image/bmp",
  ".png": "image/png",
};

const server = createServer(async (request, response) => {
  try {
    const host = request.headers.host ?? "127.0.0.1";
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(url, response);
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requested));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch (error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

async function handleApiRequest(url, response) {
  if (url.pathname === "/api/local/paths") {
    const body = await getLocalPathStatus();
    sendJson(response, 200, body);
    return;
  }

  sendJson(response, 404, { error: "Unknown API endpoint" });
}

async function getLocalPathStatus() {
  const entries = await Promise.all([
    inspectLocalPath("Game Install", () => resolveGameInstallDir()),
    inspectLocalPath("HeroData", () => resolveHeroDataArchivePath()),
    inspectLocalPath("Portraits", () => resolvePortraitArchivePath()),
    inspectLocalPath("Graphics", () => resolveGraphicsArchivePath()),
  ]);

  return {
    desktopMode: true,
    generatedAt: new Date().toISOString(),
    paths: entries,
  };
}

async function inspectLocalPath(label, resolver) {
  try {
    return {
      label,
      ok: true,
      path: await resolver(),
    };
  } catch (error) {
    return {
      label,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function listen(port, attemptsLeft = 10) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    mkdir(dist, { recursive: true })
      .then(() => writeFile(resolve(dist, "server-url.txt"), url))
      .catch(() => {});
    console.log(`WBC3 planner running at ${url}`);
  });
}

listen(startingPort);
