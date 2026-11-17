// Headless smoke test: node tools/test_step0.mjs  (serves the repo root itself)
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = process.env.SHOTS || "/tmp/shots"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".ttf": "font/ttf" };
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); s.end(d); } });
}).listen(8123);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("PAGEERROR " + e.message));
page.on("requestfailed", r => errors.push("REQFAILED " + r.url()));
await page.goto("http://localhost:8123/");
await page.waitForFunction(() => window.__game && (window.__game.ready || window.__game.error), null, { timeout: 90000 });
await page.screenshot({ path: `${OUT}/0_title.png` });
const info = await page.evaluate(() => { const g = window.__game; g.noLock = true; g.start(); return { err: g.error, counts: g.world.counts, spawn: g.data.spawn }; });
console.log(JSON.stringify(info));
const view = async (name, x, z, yaw, pitch = 0) => {
  await page.evaluate(([x, z, yaw, pitch]) => { const p = window.__game.player; if (x !== null) p.teleport(x, z, yaw); else p.yaw = yaw; p.pitch = pitch; }, [x, z, yaw, pitch]);
  await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${name}.png` });
};
const shots = JSON.parse(process.env.VIEWS || "[]");
for (const s of shots) await view(...s);
// walking + collision: hold W for a while from spawn, facing the circle, then walk into a building
const p0 = await page.evaluate(() => { const g = window.__game; g.player.teleport(g.data.spawn.x, g.data.spawn.z, Math.atan2(g.data.spawn.x, g.data.spawn.z)); return { ...g.player.pos }; });
await page.keyboard.down("KeyW"); await page.waitForTimeout(300);
const p1 = await page.evaluate(() => { const p = window.__game.player; for (let i = 0; i < 60; i++) p.update(1 / 30); return { ...p.pos }; });   // 2 simulated seconds
await page.keyboard.up("KeyW");
const col = await page.evaluate(async () => {
  const g = window.__game, b = g.data.buildings.find(b => Math.abs(b[1]) < 150 && Math.abs(b[2]) < 150 && b.length > 9);
  let cx = 0, cz = 0, n = (b.length - 1) / 2; for (let i = 1; i < b.length; i += 2) { cx += b[i] / n; cz += b[i + 1] / n; }
  let bad = 0, tries = 0;
  for (let a = 0; a < 16; a++) {                       // approach the building from 16 directions
    const ang = a / 16 * Math.PI * 2, pos = { x: cx + Math.cos(ang) * 40, z: cz + Math.sin(ang) * 40 };
    for (let s = 0; s < 400; s++) { pos.x -= Math.cos(ang) * 0.2; pos.z -= Math.sin(ang) * 0.2; g.collision.resolve(pos, 0.38); tries++; if (g.collision.blocked(pos.x, pos.z)) bad++; }
  }
  return { bad, tries, fps: g.fps, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
});
console.log("moved", Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2), "m | collision", JSON.stringify(col));
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close(); srv.close();
