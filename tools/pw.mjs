// Shared headless harness: import { open } from "./pw.mjs"
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const OUT = process.env.SHOTS || "/tmp/shots"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".ttf": "font/ttf" };
export async function open(w = 960, h = 540) {
  const srv = http.createServer((q, s) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
    fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); s.end(d); } });
  }).listen(0);
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("PAGEERROR " + e.message));
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForFunction(() => window.__game && (window.__game.ready || window.__game.error), null, { timeout: 120000 });
  await page.evaluate(() => { const g = window.__game; g.noLock = true; g.fixedPR = true; });
  const shot = async name => { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${name}.png` }); };
  const close = async () => { console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors"); await browser.close(); srv.close(); };
  return { page, shot, close, errors };
}
