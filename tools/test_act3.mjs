import { open } from "./pw.mjs";
const { page, shot, close } = await open();
const ev = (f, a) => page.evaluate(f, a);
// intro
let r = await ev(async () => { const g = window.__game; g.start("intro"); const a = g.cur, p = g.player; const s0 = { ...p.pos, blocked: g.collision.blocked(p.pos.x, p.pos.z) }; const idle = (() => { for (let i = 0; i < 2000; i++) a.update(0.03); return a.phase; })(); p.teleport(-11, 17, 0);
  for (let i = 0; i < 600 && a.phase < 3; i++) { p.update(0.03); a.update(0.03); } const ph = a.phase; await new Promise(r => setTimeout(r, 10500)); return { s0, idle, ph, mode: g.mode }; });
console.log("intro", JSON.stringify(r));
r = await ev(() => { const g = window.__game; g.state = { proof1: true, proof2: true, prisoner: true, clues: {}, matches: 2 }; g.setMode("act3"); const a = g.cur, c = g.collision;
  const b = o => c.blocked(o.x, o.z); return { start: a.startPos, sb: b(a.startPos), cafe: [a.cafe.x, a.cafe.z, b(a.cafe)], salon: [a.salon.x, a.salon.z, b(a.salon)], npcs: a.npcs.map(n => [n.id, Math.round(n.pos.x), Math.round(n.pos.z), b(n.pos)]), gMain: a.gMain.length, gAll: a.gAll.length }; });
console.log("places", JSON.stringify(r));
await shot("a3_start");
r = await ev(() => { const g = window.__game, a = g.cur, p = g.player; let nan = 0; for (let i = 0; i < 3000; i++) { p.update(0.03); a.update(0.03); for (const c of a.cars) if (!isFinite(c.m.position.x)) nan++; }
  const c = a.cars[0], m = c.m; const f = [Math.sin(m.rotation.y), Math.cos(m.rotation.y)]; let px = m.position.x, pz = m.position.z; for (let d = 6; d < 20; d += 1) { const x = m.position.x + f[0] * d, z = m.position.z + f[1] * d; if (g.collision.blocked(x, z)) break; px = x; pz = z; }
  p.teleport(px, pz, 0); for (let i = 0; i < 400 && !a.st.over; i++) { p.update(0.03); a.update(0.03); if (i < 3) { p.pos.x = m.position.x + Math.sin(m.rotation.y) * 9; p.pos.z = m.position.z + Math.cos(m.rotation.y) * 9; } }
  return { nan, wanted: a.st.wanted, over: a.st.over, title: document.getElementById("resTitle").textContent, over0: false }; });
console.log("cars", JSON.stringify(r));
r = await ev(() => { const g = window.__game; g.key("Digit1"); const a = g.cur, p = g.player; const car = a.cars[5].m.position; p.teleport(car.x + 14, car.z + 3, 0); p.yaw = Math.atan2(p.pos.x - car.x, p.pos.z - car.z); a.update(0.03); return g.mode; });
await shot("a3_pickup");
r = await ev(() => { const g = window.__game, a = g.cur, p = g.player; const out = {}; p.teleport(a.npcs[2].pos.x + 1, a.npcs[2].pos.z + 1, 0);
  a.st.tU = true; a.talk("uncle"); out.ch = document.getElementById("chBtns").children.length; g.key("Digit1"); out.wantedAfterUncle = a.st.wanted;
  a.talk("journo"); g.key("Digit1"); out.journo = a.st.journo; g.key("KeyF"); out.wantedAfterPhone = a.st.wanted;
  g.state.clues = { a: 1, b: 1 }; a.items[5].act(); out.clues = g.state.clues;
  a.enterCafe(); p.keys.add("KeyE"); for (let i = 0; i < 2200 && !a.st.over; i++) a.update(0.03); p.keys.delete("KeyE");
  out.over = a.st.over; out.title = document.getElementById("resTitle").textContent; out.endings = localStorage.getItem("aynaghor_endings"); return out; });
console.log("finale", JSON.stringify(r));
await shot("a3_ending");
await close();
