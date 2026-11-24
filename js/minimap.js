// Live minimap (heading-up). The street layer is drawn once into an offscreen canvas, then cropped and rotated every frame.
const BN = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
export class Minimap {
  constructor(data, root, canvas, label, opt = {}) {
    this.root = root; this.cv = canvas; this.lbl = label; this.g = canvas.getContext("2d"); this.data = data;
    this.S = opt.low ? 1.4 : 2; this.R = 400; this.view = 85; this.on = true; this.n = 0; this.build();
  }
  build() {
    const { S, R, data } = this, N = Math.round(R * 2 * S), c = this.base = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d");
    const X = x => (x + R) * S, Y = z => (z + R) * S;
    g.fillStyle = "#0e1620"; g.fillRect(0, 0, N, N);
    g.fillStyle = "#1d2a38"; g.strokeStyle = "#2c3e52"; g.lineWidth = 1;
    for (const b of data.buildings) { g.beginPath(); for (let i = 1; i + 1 < b.length; i += 2) { const x = X(b[i]), y = Y(b[i + 1]); i === 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.closePath(); g.fill(); }
    g.lineCap = g.lineJoin = "round";
    for (const pass of [0, 1]) for (const r of data.roads) {
      if (r.k < 1) continue; const w = Math.max(1.5, (r.w || 5)) * S; g.beginPath();
      for (let i = 0; i < r.p.length; i += 2) { const x = X(r.p[i]), y = Y(r.p[i + 1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      if (pass === 0) { g.strokeStyle = "#566678"; g.lineWidth = w + 2 * S * 0.5; } else { g.strokeStyle = r.k >= 3 ? "#d8c9a0" : r.k === 2 ? "#a9a48f" : "#7f8a95"; g.lineWidth = w; }
      g.stroke();
    }
    const st = data.landmarks.station;
    if (st) { g.strokeStyle = "rgba(90,200,160,.8)"; g.lineWidth = 3 * S; g.setLineDash([10 * S, 7 * S]); g.beginPath(); g.moveTo(X(st.x - st.dx * 500), Y(st.z - st.dz * 500)); g.lineTo(X(st.x + st.dx * 500), Y(st.z + st.dz * 500)); g.stroke(); g.setLineDash([]); }
    g.fillStyle = "#e8c070"; g.beginPath(); g.arc(X(0), Y(0), 5 * S, 0, 7); g.fill();            // golchottor
    g.fillStyle = "#cfe6dc"; g.font = `700 ${11 * S}px "Hind Siliguri", sans-serif`; g.textAlign = "center";
    g.fillText("গোলচত্বর", X(0), Y(0) - 8 * S); if (st) g.fillText("মেট্রো স্টেশন", X(st.x), Y(st.z) - 8 * S);
  }
  show(v) { this.root.classList.toggle("hidden", !v || !this.on); }
  toggle() { this.on = !this.on; this.root.classList.toggle("hidden", !this.on); return this.on; }
  draw(p, marks, t) {
    if (!this.on) return; if ((this.n++ & 1)) return;       // every other frame is plenty
    const { g, cv, S, R } = this, W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, k = W / (this.view * 2), r = W / 2 - 3;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    g.fillStyle = "#0b1118"; g.fillRect(0, 0, W, H);
    g.translate(cx, cy); g.rotate(p.yaw); g.scale(k / S, k / S); g.translate(-(p.pos.x + R) * S, -(p.pos.z + R) * S);
    g.drawImage(this.base, 0, 0);
    g.restore();
    // markers (screen space, heading-up)
    const s = Math.sin(p.yaw), c = Math.cos(p.yaw); let goal = null;
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip(); g.textAlign = "center"; g.font = `700 ${W * 0.056}px "Hind Siliguri", sans-serif`;
    for (const m of marks) {
      const dx = m.x - p.pos.x, dz = m.z - p.pos.z, d = Math.hypot(dx, dz);
      let x = (dx * c - dz * s) * k, y = (dx * s + dz * c) * k, far = false; const m0 = Math.hypot(x, y), lim = r - 9;
      if (m0 > lim) { x *= lim / m0; y *= lim / m0; far = true; }
      x += cx; y += cy; const col = m.cross ? "#ff4a3a" : "#e8e0c8";
      if (m.cross) { goal = { m, d }; const pul = 1 + 0.25 * Math.sin(performance.now() / 260); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 9 * pul, 0, 7); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
      else { g.fillStyle = col; g.beginPath(); g.arc(x, y, far ? 2.5 : 4, 0, 7); g.fill(); }
      if (!far && (m.cross || d < this.view * 0.8)) { g.lineWidth = 3; g.strokeStyle = "rgba(8,12,18,.9)"; g.strokeText(m.t, x, y + 18); g.fillStyle = m.cross ? "#ffb0a0" : "#d5d0bd"; g.fillText(m.t, x, y + 18); }
    }
    g.restore();
    // ring, north tick, player arrow
    g.strokeStyle = "rgba(233,196,143,.8)"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    const nx = cx + Math.sin(-p.yaw) * (r - 12) * -1, ny = cy - Math.cos(-p.yaw) * (r - 12);
    g.fillStyle = "#ff8a6a"; g.font = `700 ${W * 0.07}px "Hind Siliguri", sans-serif`; g.fillText("উ", nx, ny + W * 0.025);
    g.fillStyle = "#4aa8ff"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - 11); g.lineTo(cx + 8, cy + 9); g.lineTo(cx, cy + 4); g.lineTo(cx - 8, cy + 9); g.closePath(); g.fill(); g.stroke();
    if (this.lbl) this.lbl.textContent = goal ? `${goal.m.t}: ${BN(Math.round(goal.d))} মি` : "";
  }
}
