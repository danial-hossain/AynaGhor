// HUD + modal UI (all text Bangla). Modals work with keyboard (while the pointer is locked) and with mouse/touch.
const $ = id => document.getElementById(id);
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

export class UI {
  constructor(game) { this.game = game; this.modal = null; this.sayT = 0; this.toastT = 0; this.keys = null; }
  tick(dt) {
    if (this.sayT > 0 && (this.sayT -= dt) <= 0) $("subtitle").classList.remove("show");
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $("toast").classList.remove("show");
    if (this.tipT > 0 && (this.tipT -= dt) <= 0) $("tip").classList.remove("show");
  }
  say(text, sec = 4) { $("subtitle").textContent = text; $("subtitle").classList.add("show"); this.sayT = sec; }
  tip(text, sec = 8) { $("tip").textContent = text; $("tip").classList.add("show"); this.tipT = sec; }
  /** Hand-drawn paper map: streets and landmarks, but never the player's own position. */
  toggleMap(data, marks) {
    const el = $("map"); if (!el.classList.contains("hidden") || !data) { el.classList.add("hidden"); return; }
    const c = $("mapCanvas"), g = c.getContext("2d"), S = 720, R = 360, X = x => x + R, Y = z => z + R;
    g.fillStyle = "#d8c8a2"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,60,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * S, Math.random() * S, 3 + Math.random() * 30, 1 + Math.random() * 3); }
    g.lineCap = g.lineJoin = "round";
    for (const r of data.roads) {
      if (r.k < 1) continue; g.strokeStyle = r.k >= 3 ? "rgba(40,28,18,.9)" : "rgba(60,44,28,.55)"; g.lineWidth = r.k >= 3 ? 5 : r.k === 2 ? 2 : 1; g.beginPath();
      for (let i = 0; i < r.p.length; i += 2) { const x = X(r.p[i]) + (Math.random() - 0.5) * 1.5, y = Y(r.p[i + 1]) + (Math.random() - 0.5) * 1.5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    const st = data.landmarks.station, all = [{ x: 0, z: 0, t: "গোলচত্বর" }, st && { x: st.x, z: st.z, t: "মেট্রো স্টেশন" }, ...marks].filter(Boolean);
    if (st) { g.strokeStyle = "rgba(30,90,70,.8)"; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(st.x - st.dx * 500), Y(st.z - st.dz * 500)); g.lineTo(X(st.x + st.dx * 500), Y(st.z + st.dz * 500)); g.stroke(); g.setLineDash([]); }
    g.textAlign = "center"; g.font = '700 19px "Hind Siliguri", sans-serif';
    for (const m of all) {
      const x = X(m.x), y = Y(m.z); g.strokeStyle = g.fillStyle = m.c || "#5a1a10"; g.lineWidth = 3;
      if (m.cross) { g.beginPath(); g.moveTo(x - 8, y - 8); g.lineTo(x + 8, y + 8); g.moveTo(x + 8, y - 8); g.lineTo(x - 8, y + 8); g.stroke(); } else { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); }
      g.fillStyle = "rgba(216,200,162,.8)"; const w = g.measureText(m.t).width; g.fillRect(x - w / 2 - 3, y + 10, w + 6, 24); g.fillStyle = m.c || "#3a1208"; g.fillText(m.t, x, y + 28);
    }
    g.fillStyle = "#3a1208"; g.font = '700 26px "Hind Siliguri", sans-serif'; g.fillText("উ", 676, 60); g.beginPath(); g.moveTo(676, 14); g.lineTo(668, 34); g.lineTo(684, 34); g.fill();
    g.font = '400 15px "Hind Siliguri", sans-serif'; g.fillText("(আপনি কোথায় আছেন, তা নিজেকেই বুঝে নিতে হবে)", 360, 706);
    el.classList.remove("hidden");
  }
  toast(text) { $("toast").textContent = text; $("toast").classList.add("show"); this.toastT = 3.5; }
  objective(text) { $("objective").textContent = text ? "লক্ষ্য: " + text : ""; }
  prompt(text) { if ($("prompt").textContent !== text) $("prompt").textContent = text; }
  status(text) { if ($("stance").textContent !== text) $("stance").textContent = text; }
  matches(n, frac = 0) {
    $("matchHud").classList.toggle("hidden", n === null); if (n === null) return;
    $("matchCount").textContent = "দেশলাই: " + bn(n); $("burn").firstElementChild.style.width = Math.round(frac * 100) + "%";
  }
  flame(on) { $("flame").classList.toggle("hidden", !on); }
  bar(id, frac, label) {      // id: noise | seen | wanted ; frac null hides
    const el = $("bar_" + id); el.classList.toggle("hidden", frac === null); if (frac === null) return;
    el.firstElementChild.textContent = label; el.lastElementChild.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
  }
  inventory(list) { this.inv = list; $("inv").innerHTML = "<b>সঙ্গে আছে</b>" + (list.length ? list.map(x => `<span>${x}</span>`).join("") : "<span>কিছু নেই</span>"); }
  toggleInv() { $("inv").classList.toggle("hidden"); }
  fade(on, text = "") { $("fade").classList.toggle("on", on); $("fadeText").textContent = text; }

  _open(kind) { this.modal = kind; this.game.player.enabled = false; if (document.pointerLockElement) document.exitPointerLock(); }
  _close() { this.modal = null; this.keys = null; for (const id of ["keypad", "result", "choice"]) $(id).classList.add("hidden"); this.game.relock(); }
  _buttons(el, buttons, after) {
    el.innerHTML = "";
    buttons.forEach(([label, fn], i) => {
      const b = document.createElement("button"); b.textContent = `${bn(i + 1)}. ${label}`;
      b.onclick = () => { this._close(); if (after) after(); fn(); }; el.appendChild(b);
    });
    this.keys = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(code), i = m ? +m[1] - 1 : code === "Enter" ? 0 : -1; if (el.children[i]) el.children[i].click(); return true; };
  }
  result(title, text, buttons) {
    this._open("result"); $("resTitle").textContent = title; $("resText").textContent = text; $("result").classList.remove("hidden");
    this._buttons($("resBtns"), buttons);
  }
  choice(who, text, options) {
    this._open("choice"); $("chWho").textContent = who; $("chText").textContent = text; $("choice").classList.remove("hidden");
    this._buttons($("chBtns"), options, () => { this.game.player.enabled = true; });
  }
  openKeypad(cb) {
    this._open("keypad"); let v = ""; const disp = $("kpDisp"), show = () => disp.textContent = bn(v).padEnd(4, "•");
    const done = () => { this._close(); this.game.player.enabled = true; };
    const press = d => {
      if (d === "x") return done();
      if (d === "<") v = v.slice(0, -1); else if (v.length < 4) { v += d; this.game.audio.beep(); }
      show();
      if (v.length === 4) { if (cb(v)) done(); else { $("keypad").classList.add("shake"); setTimeout(() => { $("keypad").classList.remove("shake"); v = ""; show(); }, 400); } }
    };
    const grid = $("kpGrid"); grid.innerHTML = "";
    for (const d of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "<", "0", "x"]) {
      const b = document.createElement("button"); b.textContent = d === "<" ? "⌫" : d === "x" ? "বন্ধ" : bn(d); b.onclick = () => press(d); grid.appendChild(b);
    }
    show(); $("keypad").classList.remove("hidden");
    this.keys = code => { const m = /^(?:Digit|Numpad)(\d)$/.exec(code); if (m) press(m[1]); else if (code === "Backspace") press("<"); else if (code === "Escape" || code === "KeyE") press("x"); return true; };
  }
}
