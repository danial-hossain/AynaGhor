import { open } from "./pw.mjs";
const { page, shot, close } = await open();
const ev = (f, a) => page.evaluate(f, a);
await ev(() => window.__game.start("act1"));
await shot("a1_dark");
// find matchbox: must crouch
let r = await ev(() => { const g = window.__game, a = g.cur, p = g.player; p.teleport(-0.75, 0.6, 0); p.yaw = Math.PI; p.pitch = -0.9; p.update(0.016); a.update(0.016); const l1 = a.targetLabel; p.crouch = true; for (let i = 0; i < 30; i++) p.update(0.03); a.update(0.016); g.key("KeyE"); return { standing: l1, hasBox: a.st.hasBox, matches: a.st.matches }; });
console.log("matchbox", JSON.stringify(r));
// light a match and look into the mirror
await ev(() => { const g = window.__game, a = g.cur, p = g.player; p.crouch = false; p.teleport(-0.9, 0.45, Math.PI / 2); p.pitch = 0; g.key("KeyF"); });
await shot("a1_mirror");
await ev(() => { const p = window.__game.player; p.teleport(0.6, 0.45, -Math.PI / 2); });
await shot("a1_codewall");
r = await ev(() => { const g = window.__game, a = g.cur; const bad = a.tryCode("0000"), ok = a.tryCode(a.st.code); a.take("driver"); a.take("phone"); return { bad, ok, inv: g.ui.inv, code: a.st.code }; });
console.log("cupboard", JSON.stringify(r));
await ev(() => { const p = window.__game.player; p.teleport(0.7, -0.9, -Math.PI / 2 + 0.3); }); await shot("a1_cupboard");
// footsteps event: fail then pass
r = await ev(() => { const g = window.__game, a = g.cur; a.st.next = 0; for (let i = 0; i < 400 && !a.st.over; i++) a.update(0.03); return { over: a.st.over, modal: g.ui.modal, title: document.getElementById("resTitle").textContent }; });
console.log("event without hiding", JSON.stringify(r));
await shot("a1_caught");
r = await ev(() => { const g = window.__game, a = g.cur; g.key("Digit1"); a.takeBox(); a.st.next = 0; a.update(0.03); a.lie(true); for (let i = 0; i < 600; i++) a.update(0.03); return { over: a.st.over, ev: a.st.ev, lying: a.st.lying }; });
console.log("event while hiding", JSON.stringify(r));
r = await ev(() => { const g = window.__game, a = g.cur; g.key("KeyE"); a.tryCode(a.st.code); a.take("driver"); for (let i = 0; i < 4; i++) a.useMirror(); return { mirrorOff: a.st.mirrorOff }; });
await ev(() => { const g = window.__game, p = g.player; p.teleport(-0.6, 0.6, Math.PI / 2); g.key("KeyF"); }); await shot("a1_hole");
r = await ev(() => { const g = window.__game, a = g.cur; a.useMirror(); a.useMirror(); return { clue: g.state.clues.a, over: a.st.over, title: document.getElementById("resTitle").textContent, save: localStorage.getItem("aynaghor_save") }; });
console.log("finish", JSON.stringify(r));
await close();
