import { open } from "./pw.mjs";
const { page, shot, close } = await open();
const ev = (f, a) => page.evaluate(f, a);
const r = await ev(async () => {
  const g = window.__game; g.state = { proof1: true, proof2: true, prisoner: true, clues: {}, matches: 2 }; g.setMode("act3"); g.running = true; document.getElementById("overlay").classList.add("hidden"); document.getElementById("hud").classList.remove("hidden");
  const a = g.cur, p = g.player, c = a.cafe, st = a.startPos;
  // stand 120 m from the cafe on the line to the start and face it
  const dx = st.x - c.x, dz = st.z - c.z, d = Math.hypot(dx, dz), q = { x: c.x + dx / d * 120, z: c.z + dz / d * 120 };
  p.teleport(q.x, q.z, Math.atan2(-(c.x - q.x), -(c.z - q.z)));
  await new Promise(r => setTimeout(r, 1500));
  const vis = !document.getElementById("minimap").classList.contains("hidden"), lbl = document.getElementById("miniLbl").textContent;
  g.mini.toggle(); const hid = document.getElementById("minimap").classList.contains("hidden"); g.mini.toggle();
  return { vis, lbl, hid };
});
console.log("minimap", JSON.stringify(r));
await shot("mm_facing_cafe");
await ev(() => { const g = window.__game; g.cur.player = g.player; g.player.yaw += Math.PI / 2; }); await shot("mm_turned");
await ev(() => window.__game.key("KeyM")); await shot("mm_paper");
await close();
