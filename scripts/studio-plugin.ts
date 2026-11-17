import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/** Dev-server-only endpoints for the voice studio (/studio). Never part of production builds. */
export function voiceStudio(): Plugin {
  const dir = join(process.cwd(), "public", "audio", "voice");
  const manifestPath = join(dir, "manifest.json");
  const KEY = /^[A-Za-z0-9._-]{1,120}$/;
  const EXT = new Set(["webm", "ogg", "m4a"]);
  const readManifest = () => (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { clips: {} }) as { clips: Record<string, string> };

  return {
    name: "brainzippy-voice-studio",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__studio/")) return next();
        const url = new URL(req.url, "http://localhost");
        const key = url.searchParams.get("key") ?? "";
        if (!KEY.test(key)) {
          res.statusCode = 400;
          return res.end("bad key");
        }
        const m = readManifest();
        if (url.pathname === "/__studio/save" && req.method === "POST") {
          const ext = url.searchParams.get("ext") ?? "";
          if (!EXT.has(ext)) {
            res.statusCode = 400;
            return res.end("bad ext");
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          mkdirSync(join(dir, "human"), { recursive: true });
          for (const e of EXT) if (existsSync(join(dir, "human", `${key}.${e}`))) unlinkSync(join(dir, "human", `${key}.${e}`));
          writeFileSync(join(dir, "human", `${key}.${ext}`), Buffer.concat(chunks));
          m.clips[key] = `human/${key}.${ext}`;
          writeFileSync(manifestPath, JSON.stringify(m, null, 0));
          return res.end("ok");
        }
        if (url.pathname === "/__studio/take" && req.method === "DELETE") {
          for (const e of EXT) if (existsSync(join(dir, "human", `${key}.${e}`))) unlinkSync(join(dir, "human", `${key}.${e}`));
          if (existsSync(join(dir, `${key}.mp3`))) m.clips[key] = `${key}.mp3`;
          else delete m.clips[key];
          writeFileSync(manifestPath, JSON.stringify(m, null, 0));
          return res.end("ok");
        }
        res.statusCode = 404;
        res.end();
      });
    },
  };
}
