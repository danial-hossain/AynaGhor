import { open } from "./pw.mjs";
const { page, shot, close } = await open();
const ev = (f, a) => page.evaluate(f, a);
await ev(() => { const g = window.__game; g.state.matches = 4; g.state.proof1 = true; g.start("act2"); });
await ev(() => { const g = window.__game; g.player.teleport(4.5, 10.2, -Math.PI / 2); }); await shot("a2_hall");
// patrol simulation: kidnapper should visit waypoints, never enter walls
let r = await ev(() => { const g = window.__game, a = g.cur; g.player.teleport(1.2, 16.5, 0); g.player.crouch = true; let bad = 0; const seen = new Set();
  for (let i = 0; i < 4000; i++) { g.player.update(0.03); a.update(0.03); const c = a.grid.cell(a.kid.position.x, a.kid.position.z); if (a.grid.solid(...c)) bad++; seen.add(a.st.k.wp); }
  return { bad, wps: [...seen], state: a.st.k.state, over: a.st.over }; });
console.log("patrol", JSON.stringify(r));
// noise -> suspicious ; sight -> chase -> caught
r = await ev(() => { const g = window.__game, a = g.cur, p = g.player; p.crouch = false; const k = a.kid.position; k.set(15.75, 0, 10.2); a.st.k.state = "patrol"; a.st.k.path = []; p.teleport(k.x + 3, k.z, 0); a.noiseAt(p.pos, 6); const st1 = a.st.k.state;
  a.st.k.yaw = Math.PI / 2; let st2 = null; for (let i = 0; i < 300 && !a.st.over; i++) { p.update(0.03); a.update(0.03); if (a.st.k.state === "chase") st2 = "chase"; }
  return { st1, st2, over: a.st.over, title: document.getElementById("resTitle").textContent }; });
console.log("detect", JSON.stringify(r));
await shot("a2_caught");
// restart through blocked act1 -> door hinges -> act2
r = await ev(async () => { const g = window.__game; g.key("Digit1"); const a = g.cur; const m = g.mode, blocked = a.st.blocked; a.st.hinges = 1; a.items[2].act(); await new Promise(r => setTimeout(r, 4200)); return { m, blocked, now: g.mode }; });
console.log("blocked act1", JSON.stringify(r));
// ledger, key search, prisoner, hide, exits
r = await ev(() => { const g = window.__game, a = g.cur; a.takeLedger(); "xyz".split("").forEach(c => a.search(c)); a.free(); const hid = a.items.find(i => i.label() && i.label().includes("লুকান")); hid.act(); const hidden = !!a.st.hidden; g.key("KeyE");
  a.stairs(true); const roof = { ...g.player.pos }; return { key: a.st.key, ledger: a.st.ledger, follow: a.st.follow, hidden, roof, inv: g.ui.inv }; });
console.log("items", JSON.stringify(r));
await ev(() => { const g = window.__game; g.player.yaw = -Math.PI / 2; }); await shot("a2_roof");
r = await ev(async () => { const g = window.__game, a = g.cur; a.pris.position.set(g.player.pos.x, 0, g.player.pos.z); a.finish("roof"); await new Promise(r => setTimeout(r, 300)); return { st: g.state, fade: document.getElementById("fadeText").textContent.slice(0, 60) }; });
console.log("finish", JSON.stringify(r));
await close();
