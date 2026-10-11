import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { handleSearchRequest } from "./src/server/search.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "amalearn-api",
      configureServer(server) {
        server.middlewares.use("/api/search", async (req, res) => {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }

          const request = new Request("http://localhost/api/search", {
            method: req.method,
            headers: req.headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
          });

          const response = await handleSearchRequest(request, process.env);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        });
      },
    },
  ],
});
