// HUD + modal UI (all text Bangla). Modals work with keyboard (while the pointer is locked) and with mouse/touch.
const $ = id => document.getElementById(id);
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

export class UI {
  constructor(game) { this.game = game; this.modal = null; this.sayT = 0; this.toastT = 0; this.keys = null; }
  tick(dt) {
    if (this.sayT > 0 && (this.sayT -= dt) <= 0) $("subtitle").classList.remove("show");
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $("toast").classList.remove("show");
  }
  say(text, sec = 4) { $("subtitle").textContent = text; $("subtitle").classList.add("show"); this.sayT = sec; }
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
