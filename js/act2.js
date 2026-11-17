// Act 2: the house. Stealth against a patrolling kidnapper (state machine: patrol / suspicious / chase / search),
// noise + vision, hide spots, ledger (proof 2), optional prisoner, two exits (gate key or roof jump).
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

const C = 1.5, H = 2.8;
const MAP = [
  "###################",
  "#V..#..b.#x.O#..h.#",
  "#...#....#...#..P.#",
  "#.1.d..2.d.3.#....#",
  "#...#....#...##p###",
  "##d###d####d##...S#",
  "#.....4.........5.#",
  "#.L.......K.....L.#",
  "##d####d###d###d###",
  "#..h#...#y.T.#t.m##",
  "#...#.6.#....#...##",
  "#z.b#...#..c.#...##",
  "#########G#########"];
const ROOF = ["#######", "#.....#", "#..W..J", "#.....#", "#U....#", "#######"], RX = 60;   // roof placed 60 cells east
const SOLID = "#bhOxyzTGpWJ";
const HIDE = { h: "আলমারির ভেতরে লুকান", b: "খাটের নিচে লুকান", c: "পর্দার আড়ালে লুকান", t: "বাথরুমের কোণে লুকান" };

class Grid {
  constructor() { this.cells = new Map(); }
  key(i, j) { return i * 1000 + j; }
  set(i, j, ch) { this.cells.set(this.key(i, j), ch); }
  at(i, j) { return this.cells.get(this.key(i, j)) || " "; }
  solid(i, j) { const ch = this.at(i, j); return ch === " " || SOLID.includes(ch); }
  cell(x, z) { return [Math.floor(x / C), Math.floor(z / C)]; }
  resolve(pos, r) {
    for (let it = 0; it < 2; it++) {
      const [ci, cj] = this.cell(pos.x, pos.z);
      for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
        if (!this.solid(i, j)) continue;
        const nx = Math.max(i * C, Math.min(pos.x, (i + 1) * C)), nz = Math.max(j * C, Math.min(pos.z, (j + 1) * C));
        let dx = pos.x - nx, dz = pos.z - nz; const d = Math.hypot(dx, dz);
        if (d >= r) continue;
        if (d < 1e-6) { dx = pos.x - (i + 0.5) * C; dz = pos.z - (j + 0.5) * C; if (Math.abs(dx) > Math.abs(dz)) pos.x = dx > 0 ? (i + 1) * C + r : i * C - r; else pos.z = dz > 0 ? (j + 1) * C + r : j * C - r; }
        else { pos.x = nx + dx / d * r; pos.z = nz + dz / d * r; }
      }
    }
  }
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.3);
    for (let k = 1; k < n; k++) { const t = k / n, [i, j] = this.cell(ax + (bx - ax) * t, az + (bz - az) * t); if (this.solid(i, j)) return false; }
    return true;
  }
  path(from, to) {            // BFS over walkable cells; returns list of [i,j] excluding start
    const start = this.key(...from), goal = this.key(...to), prev = new Map([[start, -1]]), q = [from];
    while (q.length) {
      const [i, j] = q.shift(); if (this.key(i, j) === goal) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = this.key(i + di, j + dj); if (!prev.has(k) && !this.solid(i + di, j + dj)) { prev.set(k, this.key(i, j)); q.push([i + di, j + dj]); } }
    }
    if (!prev.has(goal)) return []; const out = []; let k = goal;
    while (k !== start) { out.push([Math.floor(k / 1000), k % 1000]); k = prev.get(k); }
    return out.reverse();
  }
}
const ctr = (i, j) => new THREE.Vector3((i + 0.5) * C, 0, (j + 0.5) * C);

function tex(base, vary) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * vary})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function figure(color, skin = 0x6b4a36) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color }), dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }), sk = new THREE.MeshLambertMaterial({ color: skin });
  const part = (w, h, d, mat, x, y, z, parent = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); parent.add(o); return o; };
  part(0.46, 0.62, 0.26, m, 0, 1.2, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), sk); head.position.y = 1.68; g.add(head); part(0.26, 0.1, 0.27, dark, 0, 1.79, -0.01);
  const limb = (x, y, w, h, d, mat) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); g.add(piv); part(w, h, d, mat, 0, -h / 2, 0, piv); return piv; };
  g.userData.limbs = [limb(-0.12, 0.89, 0.18, 0.89, 0.2, dark), limb(0.12, 0.89, 0.18, 0.89, 0.2, dark), limb(-0.3, 1.48, 0.12, 0.6, 0.14, m), limb(0.3, 1.48, 0.12, 0.6, 0.14, m)];
  part(0.1, 0.1, 0.1, sk, 0, -0.62, 0, g.userData.limbs[2]); part(0.1, 0.1, 0.1, sk, 0, -0.62, 0, g.userData.limbs[3]);
  return g;
}
export function walkAnim(f, phase, amt) {
  const [a, b, c, d] = f.userData.limbs, s = Math.sin(phase) * 0.7 * amt;
  a.rotation.x = s; b.rotation.x = -s; c.rotation.x = -s * 0.8; d.rotation.x = s * 0.8;
}

export class Act2 {
  constructor(ctx) { Object.assign(this, ctx); this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x05070c); this.grid = new Grid(); this.col = this.grid; this.build(); }

  build() {
    const s = this.scene, g = this.grid, L = o => new THREE.MeshLambertMaterial(o);
    const wallT = tex("#7d7868", 0.07), floorT = tex("#4e4a45", 0.1), woodT = tex("#5b4028", 0.1);
    this.spots = {}; this.way = []; this.items = []; const walls = [], P = this;
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); s.add(o); return o; };
    const mWood = L({ map: woodT }), mCloth = L({ color: 0x6d6a5c }), mMetal = L({ color: 0x6a7076 });
    const load = (rows, off, roof) => rows.forEach((row, j) => [...row].forEach((ch, i0) => {
      const i = i0 + off; g.set(i, j, ch); const c = ctr(i, j);
      if (ch === "#") walls.push([c.x, roof ? 0.5 : H / 2, c.z, roof ? 1 : H]);
      if (/[1-6]/.test(ch)) this.way[+ch - 1] = [i, j];
      if ("VKPSGUJOxyzmp".includes(ch)) this.spots[ch] = [i, j];
      if (ch === "b") { box(C * 0.95, 0.12, C * 0.95, mWood, c.x, 0.45, c.z); box(C * 0.9, 0.14, C * 0.9, mCloth, c.x, 0.58, c.z); }
      if (ch === "h") box(C * 0.9, 2.0, C * 0.9, mWood, c.x, 1.0, c.z);
      if (ch === "c") box(C * 0.95, 2.3, 0.05, L({ color: 0x5a2a2a }), c.x, 1.25, c.z + C * 0.3);
      if (ch === "t") box(0.5, 0.5, 0.5, L({ color: 0x3a5a7a }), c.x - 0.3, 0.25, c.z - 0.3);
      if (ch === "T") { box(C * 0.8, 0.5, C * 0.5, mWood, c.x, 0.25, c.z); this.tv = box(0.7, 0.45, 0.06, new THREE.MeshBasicMaterial({ color: 0x8fb0ff }), c.x, 0.78, c.z); }
      if (ch === "O") { box(C * 0.9, 0.75, C * 0.7, mWood, c.x, 0.375, c.z); this.ledger = box(0.3, 0.04, 0.22, L({ color: 0x7a1c1c }), c.x, 0.77, c.z + 0.1); }
      if ("xyz".includes(ch)) box(C * 0.7, 0.8, C * 0.5, mWood, c.x, 0.4, c.z);
      if (ch === "W") { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12), L({ color: 0x20242a })); t.position.set(c.x, 0.7, c.z); s.add(t); }
      if (ch === "p") this.bolt = box(C, 2.1, 0.08, L({ color: 0x3a2c20 }), c.x, 1.05, c.z);
      if (ch === "G") this.gate = box(C, 2.3, 0.1, mMetal, c.x, 1.15, c.z);
      if (ch === "S" || ch === "U") for (let k = 0; k < 4; k++) box(C * 0.8, 0.2, 0.3, L({ color: 0x55524c }), c.x, 0.1 + k * 0.2, c.z - 0.5 + k * 0.3);
      if (ch === "L") { const l = new THREE.PointLight(0xffb060, 3.2, 9, 1.4); l.position.set(c.x, 2.4, c.z); s.add(l); box(0.08, 0.1, 0.08, new THREE.MeshBasicMaterial({ color: 0xffc070 }), c.x, 2.55, c.z); }
      if (HIDE[ch]) this.items.push({ pos: new THREE.Vector3(c.x, 0.9, c.z), range: 1.7, dot: 0.55, label: () => HIDE[ch], act: () => P.hide(c) });
    }));
    load(MAP, 0, false); load(ROOF, RX, true);
    const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(C, 1, C), L({ map: wallT }), walls.length), d = new THREE.Object3D();
    walls.forEach((w, k) => { d.position.set(w[0], w[1], w[2]); d.scale.set(1, w[3], 1); d.updateMatrix(); wm.setMatrixAt(k, d.matrix); }); s.add(wm);
    const Wd = MAP[0].length * C, Dp = MAP.length * C; floorT.repeat.set(12, 8);
    box(Wd, 0.1, Dp, L({ map: floorT }), Wd / 2, -0.05, Dp / 2); box(Wd, 0.1, Dp, L({ color: 0x3c3a36 }), Wd / 2, H + 0.05, Dp / 2);
    box(ROOF[0].length * C, 0.1, ROOF.length * C, L({ color: 0x5a5852 }), (RX + ROOF[0].length / 2) * C, -0.05, ROOF.length * C / 2);
    box(9, 0.3, 9, L({ color: 0x4a4944 }), (RX + ROOF[0].length) * C + 6, -1.2, 4.5);                   // neighbour's roof
    s.add(new THREE.AmbientLight(0x4a5a80, 0.22)); const moon = new THREE.DirectionalLight(0x8fa3d8, 0.5); moon.position.set(0.3, 1, 0.2); s.add(moon);
    this.tvLight = new THREE.PointLight(0x7090ff, 2, 7, 1.5); this.tvLight.position.copy(this.tv.position).add(new THREE.Vector3(0, 0.2, 0.6)); s.add(this.tvLight);

    // bathroom mirror (hidden clue)
    const m = ctr(...this.spots.m); const glass = new Reflector(new THREE.PlaneGeometry(0.6, 0.8), { textureWidth: 256, textureHeight: 340, color: 0xdde4e4 });
    glass.position.set(m.x + C / 2 - 0.02, 1.5, m.z); glass.rotation.y = -Math.PI / 2; s.add(glass);

    // actors
    this.kid = figure(0x16161a); s.add(this.kid);
    this.torch = new THREE.SpotLight(0xfff2d0, 60, 14, 0.5, 0.45, 1.2); this.torch.position.set(0, 1.35, 0.2); this.torch.target.position.set(0, 0.9, 6); this.kid.add(this.torch, this.torch.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.rotation.x = -Math.PI / 2; cone.position.set(0, 1.2, 3.2); this.kid.add(cone);
    this.pris = figure(0x8a8068); s.add(this.pris);
    this.flame = new THREE.PointLight(0xffa040, 0, 12, 1.2); s.add(this.flame);


    // notes left behind by earlier prisoners
    [[6, 2, "দেয়ালের কোণে গোঁজা কাগজ:\n“আজ এগারো দিন। ওরা বলে কেউ আমার খোঁজ করছে না। মা, আমি বেঁচে আছি। — সজীব, মিরপুর ১১”"],
     [2, 10, "ছেঁড়া খবরের কাগজের টুকরো:\n“মিরপুরে এক মাসে তিন তরুণ নিখোঁজ, থানায় জিডি নিতে গড়িমসির অভিযোগ…”\nপাশে কলমে লেখা: ‘ওসি সাব দেইখা নিবেন’"],
     [11, 10, "টেবিলের নিচে পড়ে থাকা রসিদ:\n“পিকআপ ভাড়া: রাত ১টা–৪টা। মাল: ১ জন। জমা: রফিক।”"]].forEach(([i, j, text]) => {
      const c = ctr(i, j), pm = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), L({ color: 0xd8d2c0 })); pm.rotation.x = -Math.PI / 2; pm.rotation.z = i; pm.position.set(c.x + 0.3, 0.02, c.z - 0.3); s.add(pm);
      this.items.push({ pos: new THREE.Vector3(c.x + 0.3, 0.1, c.z - 0.3), range: 1.9, dot: 0.5, label: () => "কাগজটা পড়ুন", act: () => P.ui.choice("চিরকুট", text, [["রেখে দিন", () => {}]]) });
    });
    const near = ch => { const c = ctr(...this.spots[ch]); c.y = 1.0; return c; };
    this.items.push(
      { pos: near("O"), range: 1.8, label: () => P.st.ledger ? null : "হিসাবের খাতাটা নিন", act: () => P.takeLedger() },
      ...["x", "y", "z"].map(ch => ({ pos: near(ch), range: 1.7, label: () => P.st.searched[ch] ? null : "ড্রয়ার খুঁজে দেখুন", act: () => P.search(ch) })),
      { pos: near("p"), range: 1.8, label: () => P.st.freed ? null : "দরজার ছিটকিনি খুলুন (ভেতরে কেউ আছে)", act: () => P.free() },
      { pos: near("G"), range: 1.8, label: () => P.st.key ? "চাবি দিয়ে গেট খুলে বেরিয়ে যান" : "মূল গেট (তালাবন্ধ)", act: () => P.st.key ? P.finish("gate") : P.ui.say("ভারী তালা। চাবি ছাড়া খুলবে না। চাবিটা হয় ওর কাছে, নয়তো বাড়ির কোথাও।", 5) },
      { pos: near("S"), range: 1.7, label: () => "সিঁড়ি বেয়ে ছাদে উঠুন", act: () => P.stairs(true) },
      { pos: near("U"), range: 1.7, label: () => "নিচে নামুন", act: () => P.stairs(false) },
      { pos: near("J"), range: 2.0, label: () => "পাশের ছাদে লাফ দিন", act: () => P.finish("roof") },
      { pos: new THREE.Vector3(m.x + 0.5, 1.5, m.z), range: 1.6, label: () => P.game.state.clues.b ? null : "আয়নাটা ভালো করে দেখুন",
        act: () => { if (!P.st.lit) return P.ui.say("অন্ধকারে কিছু বোঝা যাচ্ছে না। আলো লাগবে।"); P.game.state.clues.b = 1; P.ui.say("আয়নার কোণে নখ দিয়ে আঁচড়ানো: “সে তোমার পাড়ার লোক”", 6); } });
  }

  start(opts) {
    const gs = this.game.state, keyAt = "xyz"[Math.floor(Math.random() * 3)];
    this.st = { keyAt, key: false, ledger: gs.proof2, searched: {}, freed: false, follow: false, hidden: null, lit: false, burn: 0, seen: 0, over: false,
      k: { state: "patrol", wp: 0, path: [], wait: 0, lost: 0, last: null, repath: 0, yaw: 0, sawT: 9 }, trail: [] };
    this.grid.set(...this.spots.p, "p"); this.grid.set(...this.spots.G, "G"); this.bolt.visible = true; this.ledger.visible = !gs.proof2;
    const v = ctr(...this.spots.V), k = ctr(...this.spots.K); this.kid.position.copy(k); this.pris.position.copy(ctr(...this.spots.P)); this.pris.visible = true;
    this.player.col = this.grid; this.player.crouch = false; this.player.teleport(v.x + 0.6, v.z + 0.6, -Math.PI / 2); this.player.pitch = 0; this.player.enabled = true;
    this.camera.near = 0.05; this.camera.updateProjectionMatrix(); this.audio.outdoor = false;
    this.inv(); this.objective(); this.ui.matches(gs.matches, 0);
    this.ui.say("ফোকর পেরিয়ে একটা অন্ধকার ঘর। বাড়ির ভেতরে টর্চ হাতে কেউ ঘুরছে। শব্দ করা যাবে না।", 7);
    this.ui.tip("C = নিচু হয়ে নিঃশব্দে চলা · Shift = দৌড় (অনেক শব্দ) · আলমারি বা খাটের কাছে E = লুকানো · টর্চের আলো থেকে দূরে থাকুন", 14);
    this.game.save({ act: 2 });
  }
  objective() {
    const s = this.st;
    this.ui.objective(!s.ledger ? "বাড়ি থেকে বেরোনোর পথ খুঁজুন। প্রমাণ থাকলে সঙ্গে নিন" : s.key ? "গেট দিয়ে অথবা ছাদ দিয়ে বেরিয়ে যান" : "বেরোনোর পথ: গেটের চাবি খুঁজুন অথবা ছাদে উঠুন");
  }
  missions() {
    const s = this.st; if (!s) return [];
    return [["হিসাবের খাতা নিন (প্রমাণ ২)", s.ledger], ["পাশের ঘরের বন্দিকে মুক্ত করুন (ঐচ্ছিক)", s.freed], ["বেরোনোর পথ খুঁজুন: গেটের চাবি অথবা ছাদ", !!(s.key || s.roof)], ["বাড়ি থেকে বেরিয়ে যান", !!(s.over && s.out)], ["গোপন: বাথরুমের আয়না দেখুন", !!this.game.state.clues.b]];
  }
  inv() { const gs = this.game.state, s = this.st, a = ["দেশলাই"]; if (gs.proof1) a.push("ভাঙা ফোন (প্রমাণ ১)"); if (s.ledger) a.push("হিসাবের খাতা (প্রমাণ ২)"); if (s.key) a.push("গেটের চাবি"); this.ui.inventory(a); }
  takeLedger() { this.st.ledger = true; this.ledger.visible = false; this.audio.click(); this.inv(); this.objective(); this.ui.say("খাতায় তারিখ ধরে ধরে লেখা: কোন অফিসারকে কত টাকা দেওয়া হয়েছে। এটাই আসল প্রমাণ।", 6); }
  search(ch) {
    const s = this.st; s.searched[ch] = true; this.audio.creak(); this.noiseAt(this.player.pos, 5);
    if (ch === s.keyAt) { s.key = true; this.ui.say("ড্রয়ারে একটা চাবির গোছা! মূল গেটের চাবি মনে হচ্ছে।", 5); this.inv(); this.objective(); }
    else this.ui.say("পুরনো কাগজপত্র ছাড়া কিছু নেই।");
  }
  free() {
    const s = this.st; s.freed = s.follow = true; this.grid.set(...this.spots.p, "."); this.bolt.visible = false; this.audio.unlock(); this.noiseAt(this.player.pos, 6);
    this.ui.say("বন্দি: “আল্লাহ… আপনিও ধরা পড়েছিলেন? আমাকে তিন দিন ধরে আটকে রেখেছে। আমি আপনার পেছন পেছন আসছি।”", 7);
  }
  stairs(up) {
    const c = ctr(...this.spots[up ? "U" : "S"]); this.player.teleport(c.x + (up ? 1.2 : -1.2), c.z + (up ? -1.0 : 0.3)); this.st.trail = [];
    if (up) this.st.roof = true;
    if (up) this.ui.say("ছাদ। পাশের বাড়ির ছাদটা হাত দুয়েক দূরে, একটু নিচে। লাফ দেওয়া যাবে।", 5);
    if (this.st.follow) this.pris.position.set(this.player.pos.x, 0, this.player.pos.z);
  }
  hide(c) {
    const s = this.st, k = s.k;
    s.hidden = { c, back: { ...this.player.pos }, bad: k.state === "chase" && k.sawT < 1.2 }; this.player.enabled = false;
    if (s.lit) { s.lit = false; this.audio.blow(); }
  }
  noiseAt(pos, radius) {
    const k = this.st.k, d = Math.hypot(this.kid.position.x - pos.x, this.kid.position.z - pos.z);
    if (d < radius && (k.state === "patrol" || k.state === "search" || k.state === "suspicious")) { k.state = "suspicious"; k.last = { x: pos.x, z: pos.z }; k.path = []; k.repath = 0; k.wait = 3; }
  }
  caught(why) {
    const s = this.st; if (s.over) return; s.over = true; this.player.enabled = false; this.audio.thud(0.6);
    this.ui.result("ধরা পড়েছেন", why + "\nসে আপনাকে টেনে আবার সেই ঘরে নিয়ে গেছে। আয়নার ফোকরটা এবার তক্তা মেরে বন্ধ।", [["আবার চেষ্টা করুন", () => this.game.setMode("act1", { blocked: true })]]);
  }
  finish(how) {
    const s = this.st, gs = this.game.state; if (s.over) return;
    const pd = Math.hypot(this.pris.position.x - this.player.pos.x, this.pris.position.z - this.player.pos.z);
    s.over = s.out = true; this.player.enabled = false; gs.proof2 = s.ledger; gs.prisoner = s.follow && pd < 7; this.game.save({ act: 3 });
    const txt = (how === "roof" ? "পাশের ছাদে লাফিয়ে, সিঁড়ি বেয়ে আপনি রাস্তায় নেমে এলেন।" : "গেট খুলে নিঃশব্দে রাস্তায় বেরিয়ে এলেন।")
      + (gs.prisoner ? "\nবন্দি মানুষটাও আপনার সঙ্গে বেরিয়েছে। সে হাসপাতালের দিকে চলে গেল।" : s.freed ? "\nবন্দি মানুষটা পেছনে পড়ে গেছে…" : "\nপাশের ঘরের মানুষটা ভেতরেই রয়ে গেল…")
      + (s.ledger ? "" : "\nহিসাবের খাতাটা আনা হয়নি।");
    this.ui.fade(true, txt + "\n\nকিন্তু মিরপুরের রাস্তায় এখন পুলিশই শত্রু।");
    setTimeout(() => this.game.setMode(this.game.modes.act3 ? "act3" : "act1"), 6500);
  }
  onKey(code) {
    const s = this.st, gs = this.game.state; if (!s || s.over) return;
    if (code === "KeyF") {
      if (s.lit) { s.lit = false; this.audio.blow(); }
      else if (s.hidden) return; else if (gs.matches > 0) { gs.matches--; s.lit = true; s.burn = 15 / this.game.diff; this.audio.match(); } else this.ui.say("দেশলাইয়ের কাঠি শেষ।");
    }
    if (code === "KeyE") {
      if (s.hidden) { if (!s.hidden.bad) { this.player.pos.x = s.hidden.back.x; this.player.pos.z = s.hidden.back.z; } s.hidden = null; this.player.enabled = true; }
      else if (this.target) this.target.act();
    }
  }

  update(dt) {
    const s = this.st; if (!s) return; const cam = this.camera, p = this.player, g = this.grid, k = s.k, kp = this.kid.position, gs = this.game.state;
    if (s.hidden) { cam.position.set(s.hidden.c.x, 0.55, s.hidden.c.z); }
    if (s.lit && (s.burn -= dt) <= 0) s.lit = false;
    this.flame.intensity += ((s.lit ? 2.4 + Math.random() * 0.6 : 0) - this.flame.intensity) * Math.min(1, dt * 12);
    this.flame.position.copy(cam.position).add(new THREE.Vector3(0.22, -0.2, -0.35).applyQuaternion(cam.quaternion));
    this.ui.matches(gs.matches, s.lit ? s.burn / 15 : 0); this.ui.flame(s.lit);
    this.tvLight.intensity = 1.2 + Math.random() * 1.6;

    // prisoner follows the player's trail
    const moving = p.speed > 0.3;
    if (s.follow && !s.over) {
      if (!s.trail.length || Math.hypot(s.trail[s.trail.length - 1].x - p.pos.x, s.trail[s.trail.length - 1].z - p.pos.z) > 0.4) s.trail.push({ x: p.pos.x, z: p.pos.z });
      while (s.trail.length > 4) { const t = s.trail[0], d = Math.hypot(t.x - this.pris.position.x, t.z - this.pris.position.z); if (d < 0.15) s.trail.shift(); else { const st = Math.min(d, 4.5 * dt); this.pris.position.x += (t.x - this.pris.position.x) / d * st; this.pris.position.z += (t.z - this.pris.position.z) / d * st; this.pris.rotation.y = Math.atan2(t.x - this.pris.position.x, t.z - this.pris.position.z); s.pp = (s.pp || 0) + st * 2.6; walkAnim(this.pris, s.pp, 1); break; } }
      this.pris.visible = !s.hidden;
    }
    const noise = s.hidden ? 0 : Math.max(p.noise, s.follow && moving ? 0.45 : 0);
    this.ui.bar("noise", noise, "শব্দ");
    if (noise > 0 && !s.over) this.noiseAt(p.pos, noise * 8 * (g.los(kp.x, kp.z, p.pos.x, p.pos.z) ? 1 : 0.6));

    // ---- kidnapper
    if (!s.over) {
      const dx = p.pos.x - kp.x, dz = p.pos.z - kp.z, dist = Math.hypot(dx, dz);
      const range = s.lit ? 14 : p.crouch ? 6 : 10, facing = Math.cos(k.yaw) * dz + Math.sin(k.yaw) * dx;
      const sees = !s.hidden && dist < range && (dist < 1.2 || facing / (dist || 1) > 0.78) && g.los(kp.x, kp.z, p.pos.x, p.pos.z);
      k.sawT = sees ? 0 : k.sawT + dt;
      s.seen = Math.max(0, Math.min(1, s.seen + (sees ? (dist < 4 ? 2.2 : 1.1) * this.game.diff : -0.5) * dt));
      this.ui.bar("seen", k.state === "chase" ? 1 : s.seen, k.state === "chase" ? "সে আপনাকে তাড়া করছে!" : k.state === "suspicious" || k.state === "search" ? "সে কিছু টের পেয়েছে" : "নজর");
      if (s.seen >= 1 && k.state !== "chase") { k.state = "chase"; k.path = []; k.repath = 0; this.audio.thud(0.5); this.ui.say("“অ্যাই! দাঁড়া!”", 2.5); }
      if (s.hidden && s.hidden.bad && dist < 2.2) return this.caught("লুকানোর সময় সে আপনাকে দেখে ফেলেছিল।");
      if (sees && dist < 0.95) return this.caught("সে আপনাকে ধরে ফেলেছে।");

      let speed = 1.5, target = null;
      if (k.state === "chase") {
        speed = 4.3 + (this.game.diff - 1) * 2.2; if (sees) { k.last = { x: p.pos.x, z: p.pos.z }; k.lost = 0; } else if ((k.lost += dt) > 3.5) { k.state = "search"; k.wait = 6; }
        target = k.last;
      } else if (k.state === "suspicious" || k.state === "search") {
        speed = 2.3; target = k.last;
        if (target && Math.hypot(target.x - kp.x, target.z - kp.z) < 1.0) { target = null; k.yaw += dt * 1.6; if ((k.wait -= dt) <= 0) { k.state = "patrol"; k.path = []; } }
      } else {
        const w = this.way[k.wp], c = ctr(...w);
        if (Math.hypot(c.x - kp.x, c.z - kp.z) < 0.4) { k.yaw += dt * 1.2; if ((k.wait -= dt) <= 0) { k.wp = (k.wp + 1) % this.way.length; k.wait = 1.6; k.path = []; } }
        else target = c;
      }
      if (target) {
        if ((k.repath -= dt) <= 0 || !k.path.length) { k.path = g.path(g.cell(kp.x, kp.z), g.cell(target.x, target.z)); k.repath = 0.4; }
        let goal = k.path.length ? ctr(...k.path[0]) : target;
        if (k.path.length && Math.hypot(goal.x - kp.x, goal.z - kp.z) < 0.25) { k.path.shift(); goal = k.path.length ? ctr(...k.path[0]) : target; }
        if (k.path.length <= 1 && g.los(kp.x, kp.z, target.x, target.z)) goal = target;
        else if (!k.path.length && k.state !== "patrol") { k.state = "search"; k.last = { x: kp.x, z: kp.z }; k.wait = 3; goal = kp; }
        const gx = goal.x - kp.x, gz = goal.z - kp.z, gd = Math.hypot(gx, gz);
        if (gd > 0.05) {
          kp.x += gx / gd * Math.min(gd, speed * dt); kp.z += gz / gd * Math.min(gd, speed * dt);
          let dy = Math.atan2(gx, gz) - k.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); k.yaw += dy * Math.min(1, dt * 7);
          k.phase = (k.phase || 0) + dt * speed * 2.4; k.moving = 1;
          if ((k.stepT = (k.stepT || 0) - dt) <= 0) { k.stepT = speed > 3 ? 0.28 : 0.6; this.audio.thud(Math.max(0, 0.22 * (1 - dist / 14))); }
        }
      }
      walkAnim(this.kid, k.phase || 0, k.moving || 0); k.moving = 0;
      this.kid.rotation.y = k.yaw;
      this.fear = k.state === "chase" ? 1 : Math.max(s.seen, dist < 5 ? 0.7 : 0);
    }

    // interaction
    this.target = null;
    if (!s.over && !s.hidden) {
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir); let best = 0;
      for (const it of this.items) {
        const d = it.pos.clone().sub(cam.position), dl = d.length(); if (dl > it.range) continue;
        const dot = d.normalize().dot(dir); if (dot < (it.dot || 0.75) || dot < best) continue;
        const lab = it.label(); if (lab) { best = dot; this.target = it; this.targetLabel = lab; }
      }
    }
    this.ui.prompt(s.over ? "" : s.hidden ? "[E] বেরিয়ে আসুন" : this.target ? `[E] ${this.targetLabel}` : "");
    this.ui.status(s.hidden ? "লুকিয়ে আছেন" : p.crouch ? "বসে চলছেন (প্রায় নিঃশব্দ)" : p.running && p.speed > 3.5 ? "দৌড়াচ্ছেন (অনেক শব্দ)" : "");
  }
}
