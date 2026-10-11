import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const serverDir = path.join(distDir, "server");
const staticFiles = collectStaticFiles(distDir);

mkdirSync(serverDir, { recursive: true });
mkdirSync(path.join(distDir, ".openai"), { recursive: true });
writeFileSync(
  path.join(distDir, ".openai", "hosting.json"),
  `${JSON.stringify(
    {
      project_id: "appgprj_6acbe6552f04819195e479d28fbf3e01",
      d1: null,
      r2: null,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  path.join(serverDir, "index.js"),
  `import { handleSearchRequest } from "./search.js";

const staticFiles = new Map(${JSON.stringify(staticFiles)});

export default {
  async fetch(request, env, ctx) {
    void ctx;
    const url = new URL(request.url);

    if (url.pathname === "/api/search") {
      return handleSearchRequest(request, env);
    }

    const pathname = normalizePath(url.pathname);
    const asset = staticFiles.get(pathname) || staticFiles.get("/index.html");
    if (!asset) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(asset.body, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": asset.cacheControl,
      },
    });
  },
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/index.html";
  return pathname;
}
`,
);

writeFileSync(
  path.join(serverDir, "search.js"),
  readFileSync(path.join(projectRoot, "src/server/search.js"), "utf8"),
);

function collectStaticFiles(root) {
  const files = [];
  walk(root, "");

  return files.map(([route, filePath]) => [
    route,
    {
      body: readFileSync(filePath, "utf8"),
      contentType: contentTypeFor(filePath),
      cacheControl: route.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    },
  ]);

  function walk(directory, routePrefix) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "server" || entry.name === ".openai") {
        continue;
      }

      const absolute = path.join(directory, entry.name);
      const route = `${routePrefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(absolute, route);
      } else if (entry.isFile()) {
        files.push([route, absolute]);
      }
    }
  }
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
