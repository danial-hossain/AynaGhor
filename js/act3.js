// Intro (the abduction) and Act 3 (Mirpur night: corrupt police patrols, wanted level, allies you may or may not
// be able to trust, phone tracking, cyber-café upload finale) + the five endings. Both run on the real street map.
import * as THREE from "three";
import { figure, walkAnim } from "./act2.js?v=1795116672";
import { rickshawGeo } from "./props.js?v=1795116672";

const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const CREDIT = "\n\nমানচিত্রের তথ্য © OpenStreetMap contributors (ODbL)";
const ENDINGS = {
  1: ["সত্যের আয়না", "আপলোড শেষ। ভোর হওয়ার আগেই ভয়েস মেসেজ আর হিসাবের খাতার পাতাগুলো হাজারো ফোনে ছড়িয়ে পড়েছে। হাসপাতালের বিছানা থেকে সেই বন্দি মানুষটা সাক্ষ্য দিয়েছে। আয়না এবার ওদের দিকে ঘোরানো: যারা অন্ধকারে লেনদেন করত, সবাই তাদের মুখ দেখছে।"],
  2: ["একা মুক্তি", "আপলোড শেষ। সত্যটা বেরিয়ে গেছে, আপনিও বেঁচে গেছেন। কিন্তু ওই বাড়ির ভেতরে আরেকজন ছিল। তার কী হলো, কেউ জানে না। আয়নায় নিজের মুখের দিকে তাকাতে আজ একটু কষ্ট হয়।"],
  3: ["নীরব পলায়ন", "আপনি মিরপুর ছেড়ে চলে গেলেন। কেউ আপনাকে আর খুঁজে পায়নি। কিন্তু প্রমাণ প্রকাশ পায়নি, লেনদেন চলছেই। পরের সপ্তাহে একই রাস্তা থেকে আরেকজন হারিয়ে গেল।"],
  4: ["বিশ্বাসঘাতক", "যার হাতে প্রমাণ তুলে দিয়েছিলেন, সে একটা ফোন করল। দশ মিনিট পর জিপ এসে থামল। প্রমাণ পুড়িয়ে ফেলা হয়েছে। আর আপনি আবার সেই অন্ধকার ঘরে। এবার আয়নাটাও নেই।"],
  5: ["আয়নাঘর", "আপলোড শেষ। কিন্তু তিনটা আয়নার লেখা মিলিয়ে আপনি আরেকটা সত্য জেনে গেছেন: “যে তোমাকে এনেছে, সে তোমাকে চেনে… সে তোমার পাড়ার লোক… তার নাম রফিক।” রফিক ভাই। পাড়ার সেই বড় ভাই, যে ছোটবেলায় আপনাকে সাইকেল চালানো শিখিয়েছিল। টর্চ হাতে অন্ধকার বাড়িতে যে হাঁটছিল, সে-ই। আয়না কখনো মিথ্যা বলে না; আমরাই তাকাতে ভয় পাই।"],
};
export function showEnding(game, n, alt) {
  let seen = []; try { seen = JSON.parse(localStorage.getItem("aynaghor_endings") || "[]"); if (!seen.includes(n)) seen.push(n); localStorage.setItem("aynaghor_endings", JSON.stringify(seen)); localStorage.removeItem("aynaghor_save"); } catch (e) {}
  game.ui.fade(true);
  game.ui.result(`সমাপ্তি ${bn(n)}: ${ENDINGS[n][0]}`, (alt || ENDINGS[n][1]) + `\n\nদেখা সমাপ্তি: ${bn(seen.length)}/৫` + CREDIT, [["আবার খেলুন", () => location.reload()]]);
}

function vehicle(kind) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c });
  const add = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const body = L(kind === "jeep" ? 0x1a2a4a : 0xc9c9c2);
  add(1.9, 0.8, 4.4, body, 0, 0.85, 0); add(1.8, 0.7, kind === "jeep" ? 2.6 : 1.5, kind === "jeep" ? body : L(0xb0b0aa), 0, 1.6, kind === "jeep" ? -0.3 : 0.7);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) add(0.25, 0.7, 0.7, L(0x0a0a0a), x, 0.35, z);
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff4d0 }); add(0.35, 0.2, 0.05, hl, -0.6, 0.9, 2.21); add(0.35, 0.2, 0.05, hl, 0.6, 0.9, 2.21);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.rotation.x = -Math.PI / 2; cone.position.set(0, 1.0, 17); g.add(cone);
  if (kind === "jeep") { g.userData.bar = new THREE.MeshBasicMaterial({ color: 0xff2020 }); add(1.2, 0.14, 0.3, g.userData.bar, 0, 2.02, 0.2); }
  return g;
}

class Street {      // shared helpers for the two street modes
  constructor(ctx) { Object.assign(this, ctx); this.root = new THREE.Group(); this.root.visible = false; this.scene.add(this.root); }
  leave() { this.root.visible = false; this.audio.engine(0); }
  los(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 2.5); for (let k = 1; k < n; k++) { const t = k / n; if (this.collision.blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
}

/** Late-night street life: a few pedestrians and moving rickshaws (decorative only). */
export class Ambient {
  constructor(ctx, graph) {
    this.g = graph.filter(n => Math.hypot(n.x, n.z) < 300 && n.n.length); this.a = []; const root = new THREE.Group(); ctx.scene.add(root);
    const cols = [0x5a4a3a, 0x3a4a5a, 0x6a5a2a, 0x4a3a4a, 0x2a4a3a, 0x70685a], rm = new THREE.MeshLambertMaterial({ vertexColors: true }), rg = rickshawGeo();
    for (let i = 0; i < 10; i++) {
      const rick = i >= 6, m = new THREE.Group(), f = figure(cols[i % cols.length]);
      if (rick) { m.add(new THREE.Mesh(rg, rm)); f.scale.setScalar(0.92); f.position.set(0, 0.12, 0.3); f.userData.limbs[0].rotation.x = f.userData.limbs[1].rotation.x = -1.0; }
      m.add(f); root.add(m); const a = this.g[Math.floor(Math.random() * this.g.length)];
      this.a.push({ m, f, rick, a, b: a.n[0], t: Math.random(), sp: rick ? 3.4 : 1.1 + Math.random() * 0.4, off: rick ? 1.6 : 3.4, ph: Math.random() * 6 });
    }
  }
  update(dt) {
    for (const o of this.a) {
      const dx = o.b.x - o.a.x, dz = o.b.z - o.a.z, len = Math.hypot(dx, dz) || 1; o.t += o.sp * dt / len;
      if (o.t >= 1) { const prev = o.a; o.a = o.b; o.t = 0; let opts = o.a.n.filter(n => n !== prev && Math.hypot(n.x, n.z) < 310); if (!opts.length) opts = [prev]; o.b = opts[Math.floor(Math.random() * opts.length)]; continue; }
      o.m.position.set(o.a.x + dx * o.t - dz / len * o.off, o.rick ? 0.16 : 0.08, o.a.z + dz * o.t + dx / len * o.off);
      let dy = Math.atan2(dx, dz) - o.m.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.m.rotation.y += dy * Math.min(1, dt * 4);
      if (!o.rick) { o.ph += dt * o.sp * 3.2; walkAnim(o.f, o.ph, 0.8); }
    }
  }
}

export class Intro extends Street {
  constructor(ctx) {
    super(ctx);
    this.pickup = vehicle("pickup"); this.jeep = vehicle("jeep"); this.jeep.position.set(-14, 0, 13); this.jeep.rotation.y = 2.2;
    this.men = [figure(0x20242c), figure(0x1a1a1a)]; this.men[0].position.set(-11.5, 0, 16.5); this.men[1].position.set(-10.4, 0, 17.3);
    this.root.add(this.pickup, this.jeep, ...this.men);
  }
  start() {
    const d = this.data; this.game.streetCam(); this.root.visible = true; this.pickup.position.set(-8, 0, 19); this.pickup.rotation.y = 1.2;
    this.player.crouch = false; const k = 1 + 55 / Math.hypot(d.spawn.x, d.spawn.z); this.player.teleport(d.spawn.x * k, d.spawn.z * k, Math.atan2(d.spawn.x, d.spawn.z)); this.collision.resolve(this.player.pos, 0.4); this.player.enabled = true;
    this.t = 0; this.phase = 0; this.ui.inventory([]);
    this.ui.objective("বাসায় ফিরুন। গোলচত্বর পেরিয়ে সোজা");
    this.ui.say("রাত দুইটা সতেরো। টিউশনি থেকে ফিরতে আজ বড্ড দেরি হয়ে গেল। রাস্তা প্রায় ফাঁকা।", 6);
    this.ui.tip("W A S D = হাঁটা · মাউস = চারপাশ দেখা · Shift = দৌড় · M = মানচিত্র", 12);
  }
  update(dt) {
    const p = this.player, P = this.pickup.position; this.t += dt; this.world.update(dt, this.camera); this.game.landmarks();
    const d = Math.hypot(p.pos.x + 11, p.pos.z - 17);
    if (this.phase === 0 && d < 12) { this.phase = 1; this.t = 0; this.ui.say("পিলারের আড়ালে একটা পিকআপ… একজন লোক পুলিশের জিপের লোকটার হাতে মোটা একটা ব্যাগ তুলে দিচ্ছে। টাকা?", 5); }
    else if (this.phase === 1 && this.t > 4.5) { this.phase = 2; this.t = 0; this.ui.say("ওরা আপনার দিকে তাকাল। পিকআপের ইঞ্জিন চালু হলো।", 4); this.ui.objective("পালান!"); }
    else if (this.phase === 2) {
      const dx = p.pos.x - P.x, dz = p.pos.z - P.z, dd = Math.hypot(dx, dz), sp = 9 + this.t * 2;
      P.x += dx / dd * sp * dt; P.z += dz / dd * sp * dt; this.pickup.rotation.y = Math.atan2(dx, dz); this.audio.engine(Math.min(1, 12 / dd)); this.fear = 0.9;
      if (dd < 3.2) {
        this.phase = 3; this.t = 0; p.enabled = false; this.fear = 0; this.audio.engine(0); this.audio.thud(0.7); this.ui.objective("");
        this.ui.fade(true, ""); const A = this.audio;
        [[600, () => { A.thud(0.5); this.ui.fade(true, "…কয়েকটা হাত আপনাকে জাপটে ধরল।"); }], [2200, () => { A.unlock(); A.thud(0.6); }], [3000, () => { A.engine(0.6); this.ui.fade(true, "…দরজা বন্ধ হওয়ার শব্দ। ইঞ্জিনের গর্জন।"); }],
          [5600, () => { A.garble(1.5); this.ui.fade(true, "…চাপা গলা: “ছেলেটা সব দেখে ফেলেছে।”"); }], [8200, () => { A.engine(0); A.thud(0.6); }], [9500, () => this.game.setMode("act1")]].forEach(([ms, f]) => setTimeout(f, ms));
      }
    }
  }
  onKey() {}
}

export class Act3 extends Street {
  constructor(ctx) {
    super(ctx); const d = this.data, r = this.root, P = this;
    // road graphs: jeeps keep to the bigger roads, the pickup also prowls residential streets
    const graph = minK => {
      const nodes = new Map(), key = (x, z) => x + "," + z, get = (x, z) => { const k = key(x, z); if (!nodes.has(k)) nodes.set(k, { x, z, n: [] }); return nodes.get(k); };
      for (const rd of d.roads) { if (rd.k < minK) continue; for (let i = 2; i < rd.p.length; i += 2) { const a = get(rd.p[i - 2], rd.p[i - 1]), b = get(rd.p[i], rd.p[i + 1]); if (a !== b) { a.n.push(b); b.n.push(a); } } }
      return [...nodes.values()].filter(n => Math.hypot(n.x, n.z) < 420);
    };
    this.gMain = graph(3); this.gAll = graph(2);
    this.cars = []; for (let i = 0; i < 6; i++) { const m = vehicle(i === 5 ? "pickup" : "jeep"); r.add(m); this.cars.push({ m, kind: i === 5 ? "pickup" : "jeep", g: i === 5 ? this.gAll : this.gMain }); }
    this.beam = new THREE.SpotLight(0xfff0d0, 0, 45, 0.42, 0.5, 1.2); r.add(this.beam, this.beam.target);

    // places
    const pick = (list, f) => list.reduce((b, it) => (f(it) < f(b) ? it : b));
    const lampS = pick(d.lamps.filter(l => Math.abs(l[0]) < 250 && Math.abs(l[1]) < 250), l => l[0] - l[1]);                 // south-west corner
    this.startPos = { x: lampS[0] + lampS[2] * 0.6, z: lampS[1] + lampS[3] * 0.6 };
    const cs = pick(d.signs, s => Math.hypot(s[0] - 185, s[1] + 175)); this.cafe = { x: cs[0] + cs[2] * 1.3, z: cs[1] + cs[3] * 1.3, s: cs };
    const sal = pick(d.signs, s => Math.hypot(s[0] - 70, s[1] + 60)); this.salon = { x: sal[0] + sal[2] * 0.9, z: sal[1] + sal[3] * 0.9, s: sal };
    const board = (s, text, bg, fg, y, w) => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 160; const g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, 1024, 160); g.fillStyle = fg;
      let fs = 88; do { fs -= 4; g.font = `700 ${fs}px "Hind Siliguri", sans-serif`; } while (g.measureText(text).width > 960 && fs > 24);
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 86);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.156), new THREE.MeshBasicMaterial({ map: t })); m.position.set(s[0] + s[2] * 0.3, y, s[1] + s[3] * 0.3); m.rotation.y = Math.atan2(s[2], s[3]); r.add(m);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), new THREE.MeshBasicMaterial({ color: 0xcfe4ff })); door.position.set(s[0] + s[2] * 0.25, 1.25, s[1] + s[3] * 0.25); door.rotation.y = m.rotation.y; r.add(door);
      const l = new THREE.PointLight(0xbcd8ff, 30, 16, 1.4); l.position.set(s[0] + s[2] * 2, 2.5, s[1] + s[3] * 2); r.add(l);
    };
    board(cs, "বন্ধু সাইবার ক্যাফে · ২৪ ঘণ্টা খোলা", "#f2d21c", "#14213d", 4.3, 7.5); board(sal, "নিউ লাকী সেলুন", "#b3261e", "#ffffff", 4.2, 5);
    const st = d.landmarks.station, tea = pick(d.props.filter(p => p.k === "tea"), p => Math.hypot(p.x + 107, p.z - 129)), rk = pick(d.props.filter(p => p.k === "rickshaw"), p => Math.hypot(p.x + 30, p.z - 70));
    const jl = pick(d.lamps, l => Math.abs(Math.hypot(l[0] - this.cafe.x, l[1] - this.cafe.z) - 28));
    const free = (x, z) => { for (let rad = 0; rad < 12; rad += 0.8) for (let k = 0; k < 8; k++) { const px = x + Math.cos(k * 0.785) * rad, pz = z + Math.sin(k * 0.785) * rad; if (!this.collision.blocked(px, pz)) return [px, pz]; } return [x, z]; };
    const npc = (id, x0, z0, color, name) => { const [x, z] = free(x0, z0); const f = figure(color); f.position.set(x, 0, z); r.add(f); const o = { id, name, pos: new THREE.Vector3(x, 1.2, z), f }; return o; };
    this.npcs = [
      npc("uncle", tea.x + Math.sin(tea.r) * 1.6, tea.z + Math.cos(tea.r) * 1.6, 0x7a6a50, "চা-দোকানি মামা"),
      npc("rick", rk.x + 1.1, rk.z + 0.4, 0x4a5a3a, "রিকশাওয়ালা"),
      npc("journo", jl[0] + jl[2] * 0.8, jl[1] + jl[3] * 0.8, 0x6a3a5a, "সাংবাদিক"),
      npc("cop", st.x + st.dz * 4, st.z - st.dx * 4, 0x23324d, "পুলিশ কনস্টেবল")];
    this.items = [
      ...this.npcs.map(n => ({ pos: n.pos, range: 3, label: () => `${n.name}-এর সঙ্গে কথা বলুন`, act: () => P.talk(n.id) })),
      { pos: new THREE.Vector3(this.cafe.x, 1.3, this.cafe.z), range: 3.2, label: () => "সাইবার ক্যাফেতে ঢুকে আপলোড শুরু করুন", act: () => P.enterCafe() },
      { pos: new THREE.Vector3(this.salon.x, 1.3, this.salon.z), range: 3, label: () => P.game.state.clues.c ? null : "সেলুনের কাচের দরজায় আয়নাটা দেখুন",
        act: () => { P.game.state.clues.c = 1; P.ui.say("স্ট্রিট লাইটের আলোয় আয়নার ধুলোয় আঙুলে লেখা একটা নাম: “রফিক”", 6); } }];
    const HN = { tea: "চায়ের দোকানের পেছনে লুকান", cng: "সিএনজির আড়ালে লুকান", van: "ভ্যানের নিচে লুকান", rickshaw: "রিকশার আড়ালে লুকান" };
    for (const pr of d.props) this.items.push({ pos: new THREE.Vector3(pr.x, 0.9, pr.z), range: 2.4, label: () => HN[pr.k], act: () => P.hide() });
    this.marks = [{ x: this.cafe.x, z: this.cafe.z, t: "সাইবার ক্যাফে", c: "#a01010", cross: true }, { x: this.startPos.x, z: this.startPos.z, t: "যে বাড়ি থেকে পালিয়েছেন", c: "#444" },
      { x: tea.x, z: tea.z, t: "মামার চায়ের দোকান", c: "#444" }, { x: rk.x, z: rk.z, t: "রিকশা স্ট্যান্ড", c: "#444" }];
  }

  start() {
    const gs = this.game.state, d = this.data; this.game.streetCam(); this.root.visible = true;
    this.st = { wanted: 0, seen: 0, unseen: 0, cool: 0, hunt: null, over: false, tU: Math.random() < 0.5, tR: Math.random() < 0.5, journo: false, upload: null, asked: false, bar: 0, tap: 0 };
    const far = g => { let n; do n = g[Math.floor(Math.random() * g.length)]; while (Math.hypot(n.x - this.startPos.x, n.z - this.startPos.z) < 160); return n; };
    for (const c of this.cars) { c.a = far(c.g); c.b = c.a.n[0] || c.a; c.t = 0; c.m.position.set(c.a.x, 0, c.a.z); }
    this.player.crouch = false; this.player.teleport(this.startPos.x, this.startPos.z, Math.atan2(this.startPos.x, this.startPos.z) + Math.PI * 0); this.player.pitch = 0; this.player.enabled = true;
    this.inv(); this.objective(); this.game.save({ act: 3 });
    this.ui.say("মিরপুরের রাস্তা। নীল জিপগুলো টহল দিচ্ছে, ওরা ওদেরই লোক। হেডলাইটের আলোয় পড়া যাবে না। গলি দিয়ে চলুন।", 8);
    this.ui.tip("M = মানচিত্র · রিকশা, সিএনজি বা চায়ের দোকানের পাশে E = লুকানো · F = ফোন করা (ঝুঁকি আছে)", 14);
  }
  mapMarks() { return this.marks; }
  missions() {
    const s = this.st; if (!s) return [];
    return this.proof() ? [["সাংবাদিকের সঙ্গে দেখা করুন (ঐচ্ছিক)", s.journo], ["সাইবার ক্যাফেতে পৌঁছান", !!(s.upload || s.done)], ["প্রমাণ আপলোড করুন", !!s.done], ["গোপন: সেলুনের আয়না দেখুন", !!this.game.state.clues.c]]
      : [["মিরপুর ছেড়ে পালান", false]];
  }
  hide() {
    const s = this.st; if (s.seen > 0.35) return this.ui.say("ওরা এদিকেই তাকিয়ে আছে! এখন লুকিয়ে লাভ নেই, সরে পড়ুন!");
    s.hidden = true; this.player.enabled = false; this.player.crouch = true; this.ui.say("নিঃশ্বাস বন্ধ করে বসে আছেন…", 3);
  }
  proof() { const gs = this.game.state; return gs.proof1 || gs.proof2; }
  inv() { const gs = this.game.state, a = []; if (gs.proof1) a.push("ভাঙা ফোন (প্রমাণ ১) · F চেপে ফোন করা যায়"); if (gs.proof2) a.push("হিসাবের খাতা (প্রমাণ ২)"); this.ui.inventory(a); }
  objective() {
    this.ui.objective(!this.proof() ? "হাতে কোনো প্রমাণ নেই। মিরপুর ছেড়ে পালান (যেকোনো দিকে অনেক দূর হেঁটে)"
      : "প্রমাণ নিয়ে “বন্ধু সাইবার ক্যাফে”তে পৌঁছান: উত্তর-পূর্বে, গোলচত্বর আর মেট্রো লাইন পেরিয়ে। কাকে বিশ্বাস করবেন ভেবে নিন");
  }
  alert(n, where) { const s = this.st; s.wanted = Math.max(0, Math.min(3, s.wanted + n)); s.unseen = 0; if (where) s.hunt = { x: where.x, z: where.z }; }
  caught(why) {
    const s = this.st; if (s.over) return; s.over = true; this.player.enabled = false; this.audio.thud(0.7); this.audio.engine(0);
    this.ui.result("ধরা পড়েছেন", why, [["আবার চেষ্টা করুন (রাস্তার শুরু থেকে)", () => this.game.setMode("act3")]]);
  }
  end(n, alt) { const s = this.st; if (s.over) return; s.over = true; this.player.enabled = false; this.audio.engine(0); showEnding(this.game, n, alt); }

  talk(id) {
    const s = this.st, ui = this.ui, P = this, has = this.proof(), bye = ["সরে পড়ুন", () => {}];
    const give = ok => ["প্রমাণগুলো তার হাতে তুলে দিন", () => ok ? ui.say("“না বাবা, এ জিনিস আমার কাছে রেখো না। যার কাজ, তার হাতে দাও: সাংবাদিক আপা সাইবার ক্যাফের সামনেই থাকে।”", 7) : P.end(4)];
    if (id === "uncle") {
      ui.choice("চা-দোকানি মামা", s.tU ? "“এত রাতে একা? মুখ শুকনা কেন বাবা… নীল জিপ দেখলে গলিতে ঢুকে পড়বা। ওরা সব এক দলের।”" : "“আরে আরে, এদিকে আসো! কোথা থেকে আসতেছ? হাতে ওইটা কী? দেখি দেখি…”",
        [["সাহায্য চান", () => { if (s.tU) { s.wanted = 0; s.hunt = null; ui.say(`“দোকানের পেছনে একটু বসো, জিপটা যাক। সাংবাদিক আপাকে পাবা ‘বন্ধু সাইবার ক্যাফে’র সামনে, মেট্রো লাইন পার হয়ে উত্তর-পূর্বে। আর শোনো, ${s.tR ? "মোড়ের রিকশাওয়ালা ছেলেটা ভালো মানুষ।" : "মোড়ের রিকশাওয়ালাটারে বিশ্বাস কইরো না, থানায় ওর যাওয়া-আসা আছে।"}”`, 10); }
          else { ui.say("“বসো বসো, চা খাও… আমি একটা ফোন কইরা আসি।” সে দোকানের পেছনে গিয়ে ফিসফিস করে কথা বলছে!", 6); P.alert(2, P.player.pos); } }], ...(has ? [give(s.tU)] : []), bye]);
    } else if (id === "rick") {
      ui.choice("রিকশাওয়ালা", s.tR ? "“ভাই, ওই সাদা পিকআপটা সারা রাত ঘুরতাছে, কারে জানি খুঁজে। উইঠা পড়েন, চিপা গলি দিয়া নামায়া দিমু।”" : "“কই যাইবেন? উঠেন উঠেন! থানার সামনে দিয়া একটা শর্টকাট আছে, দুই মিনিটে পৌঁছায়া দিমু।”",
        [["রিকশায় উঠুন", () => { if (s.tR) { P.player.teleport(P.cafe.x - 30, P.cafe.z + 26); P.alert(-1); ui.say("গলির পর গলি পেরিয়ে সে আপনাকে নামিয়ে দিল। “ক্যাফেটা সামনেই ভাই। আল্লাহ ভরসা।”", 6); } else P.caught("রিকশা সোজা গিয়ে থামল মেট্রো স্টেশনের নিচে, কনস্টেবলের সামনে। “স্যার, মাল আইনা দিছি।”"); }], ...(has ? [give(s.tR)] : []), bye]);
    } else if (id === "journo") {
      ui.choice("সাংবাদিক", has ? "“আপনিই সেই ছেলে? …প্রমাণ আমার হাতে থাকলে সকালের আগে ওরা আমাকেও তুলে নেবে। এখনই অনলাইনে তুলে দিন। ক্যাফের সার্ভারের পাসওয়ার্ড দিচ্ছি, আপলোড দ্রুত হবে। দরজাটা ভেতর থেকে ঠেকিয়ে রাখবেন।”" : "“প্রমাণ ছাড়া আমি এক লাইনও ছাপতে পারব না ভাই। ওরা মামলা ঠুকে দেবে।”",
        [...(has ? [["পাসওয়ার্ড নিন", () => { s.journo = true; ui.say("পাসওয়ার্ড পেয়েছেন। এখন সাইবার ক্যাফেতে ঢুকুন।", 5); }]] : []), bye]);
    } else {
      ui.choice("পুলিশ কনস্টেবল", "“অ্যাই, দাঁড়াও। ভয় নাই, আমি আছি তো। কী হইছে খুইলা বলো… চলো, থানায় বইসা কথা কই।”",
        [["তার সঙ্গে থানায় যান", () => P.caught("থানার গেটের ভেতরে সেই সাদা পিকআপটা দাঁড়িয়ে ছিল।")], ...(has ? [["প্রমাণগুলো তাকে দেখান", () => P.end(4)]] : []), ["সরে পড়ুন", () => { ui.say("পেছন থেকে ওয়াকিটকির শব্দ: “ছেলেটা স্টেশনের নিচে…”", 5); P.alert(1, P.player.pos); }]]);
    }
  }
  enterCafe() {
    const s = this.st; if (!this.proof()) return this.ui.say("আপলোড করার মতো কোনো প্রমাণ হাতে নেই।");
    s.upload = { p: 0, door: 100, burst: 4, total: s.journo ? 50 : 75, warned: false }; this.player.enabled = false; this.audio.engine(0);
    this.ui.fade(true, "ক্যাফের ভেতরে একটাই কম্পিউটার চালু।\nআপলোড শুরু হয়েছে…"); this.ui.objective("আপলোড শেষ না হওয়া পর্যন্ত টিকে থাকুন");
  }
  onKey(code) {
    const s = this.st; if (!s || s.over) return;
    if (code === "KeyE") { if (s.upload) s.tap = 1.0; else if (s.hidden) { s.hidden = false; this.player.enabled = true; this.player.crouch = false; } else if (this.target) this.target.act(); }
    if (code === "KeyF" && !s.upload) {
      if (!this.game.state.proof1) return this.ui.say("ফোন নেই।");
      const dx = this.cafe.x - this.player.pos.x, dz = this.cafe.z - this.player.pos.z;
      this.ui.say(`ফোনে সাংবাদিক: “বন্ধু সাইবার ক্যাফেতে আসুন, আপনার থেকে ${dz < -40 ? "উত্তর" : dz > 40 ? "দক্ষিণ" : ""}${Math.abs(dx) > 40 ? (dx > 0 ? "-পূর্ব" : "-পশ্চিম") : ""} দিকে, প্রায় ${bn(Math.round(Math.hypot(dx, dz) / 10) * 10)} মিটার।” …লাইনে খট করে একটা শব্দ হলো। কেউ আড়ি পাতছে!`, 9);
      this.alert(1, this.player.pos);
    }
  }

  update(dt) {
    const s = this.st; if (!s) return; const p = this.player, cam = this.camera;
    this.world.update(dt, cam);
    if (s.upload) return this.updUpload(dt);
    this.game.landmarks();
    // vehicles
    const active = 2 + s.wanted; let seen = false, nearest = 1e9, nearCar = null; s.bar += dt;
    this.cars.forEach((c, i) => {
      const on = c.kind === "pickup" || i < active; c.m.visible = on; if (!on || s.over) return;
      const hunting = s.hunt && s.wanted > 0, sp = (c.kind === "pickup" ? 6 : 7.5) * (hunting ? 1.5 : 1);
      const len = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z) || 1; c.t += sp * dt / len;
      if (c.t >= 1) {
        const prev = c.a; c.a = c.b; c.t = 0; let opts = c.a.n.filter(n => n !== prev); if (!opts.length) opts = c.a.n;
        const tgt = hunting ? s.hunt : c.kind === "pickup" ? p.pos : null;
        c.b = tgt && Math.random() < 0.85 ? opts.reduce((b, n) => Math.hypot(n.x - tgt.x, n.z - tgt.z) < Math.hypot(b.x - tgt.x, b.z - tgt.z) ? n : b) : opts[Math.floor(Math.random() * opts.length)];
      }
      const x = c.a.x + (c.b.x - c.a.x) * c.t, z = c.a.z + (c.b.z - c.a.z) * c.t, yaw = Math.atan2(c.b.x - c.a.x, c.b.z - c.a.z);
      c.m.position.set(x, 0, z); let dy = yaw - c.m.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.m.rotation.y += dy * Math.min(1, dt * 5);
      if (c.m.userData.bar) c.m.userData.bar.color.set(s.wanted > 0 ? (Math.floor(s.bar * 4) % 2 ? 0xff2020 : 0x2040ff) : 0x401010);
      const dx = p.pos.x - x, dz = p.pos.z - z, dist = Math.hypot(dx, dz); if (dist < nearest) { nearest = dist; nearCar = c; }
      const fwd = (Math.sin(c.m.rotation.y) * dx + Math.cos(c.m.rotation.y) * dz) / (dist || 1);
      const sees = !s.hidden && dist < (p.crouch ? 24 : 40) * (0.6 + 0.4 * this.game.diff) && (fwd > 0.86 || dist < 6) && this.los(x, z, p.pos.x, p.pos.z);
      if (sees) { seen = true; if (dist < 5.5 && s.wanted > 0) this.caught(c.kind === "pickup" ? "পিকআপটা পাশে এসে থামল। দরজা খুলে গেল।" : "জিপ থেকে দুজন লাফিয়ে নেমে আপনাকে ধরে ফেলল।"); }
    });
    if (s.over) return;
    s.cool -= dt; s.seen = Math.max(0, Math.min(1, s.seen + (seen ? 1.4 : -0.6) * dt));
    if (seen && s.seen >= 1) { s.hunt = { x: p.pos.x, z: p.pos.z }; s.unseen = 0; if (s.cool <= 0) { this.alert(1, p.pos); s.cool = 9; this.audio.thud(0.5); this.ui.say(s.wanted >= 3 ? "পুরো এলাকা ঘিরে ফেলছে! লুকান!" : "ওরা আপনাকে দেখে ফেলেছে! গলিতে ঢুকে পড়ুন!", 4); } }
    else if (!seen && s.wanted > 0 && (s.unseen += dt * (s.hidden ? 2.5 : 1)) > 25 * this.game.diff) { this.alert(-1); s.unseen = 0; if (!s.wanted) { s.hunt = null; this.ui.say("ওরা আপাতত খোঁজা থামিয়েছে।", 4); } }
    this.ui.bar("wanted", s.wanted / 3, "খোঁজ: " + "★".repeat(s.wanted) + "☆".repeat(3 - s.wanted)); this.ui.bar("seen", s.seen, seen ? "হেডলাইটে পড়েছেন!" : "নজর");
    this.audio.engine(Math.max(0, 1 - nearest / 70)); this.fear = Math.max(s.seen, s.wanted / 4);
    if (nearCar) { const m = nearCar.m, f = new THREE.Vector3(Math.sin(m.rotation.y), 0, Math.cos(m.rotation.y)); this.beam.position.set(m.position.x + f.x * 2.3, 1.0, m.position.z + f.z * 2.3); this.beam.target.position.set(m.position.x + f.x * 30, 0, m.position.z + f.z * 30); this.beam.intensity = 260; }

    // leaving Mirpur
    const out = Math.max(Math.abs(p.pos.x), Math.abs(p.pos.z)) > 345;
    if (out && !s.asked) { s.asked = true; this.ui.choice("মিরপুরের শেষ প্রান্ত", "সামনে অন্ধকার বড় রাস্তা। এখান থেকে চলে গেলে আর কেউ আপনাকে খুঁজে পাবে না। কিন্তু প্রমাণও আর প্রকাশ পাবে না।", [["মিরপুর ছেড়ে চলে যান", () => this.end(3)], ["ফিরে যান", () => {}]]); }
    if (!out && Math.max(Math.abs(p.pos.x), Math.abs(p.pos.z)) < 320) s.asked = false;

    // interaction
    this.target = null; const dir = new THREE.Vector3(); cam.getWorldDirection(dir); let best = 0;
    if (!s.hidden) for (const it of this.items) {
      const ddx = it.pos.x - cam.position.x, ddz = it.pos.z - cam.position.z; if (ddx * ddx + ddz * ddz > it.range * it.range) continue;
      const d = it.pos.clone().sub(cam.position);
      const dot = d.normalize().dot(dir); if (dot < 0.5 || dot < best) continue; const lab = it.label(); if (lab) { best = dot; this.target = it; this.targetLabel = lab; }
    }
    this.ui.prompt(s.hidden ? "[E] বেরিয়ে আসুন" : this.target ? `[E] ${this.targetLabel}` : "");
    this.ui.status(s.hidden ? "লুকিয়ে আছেন" : p.crouch ? "বসে চলছেন" : p.running && p.speed > 3.5 ? "দৌড়াচ্ছেন" : "");
  }
  updUpload(dt) {
    const s = this.st, u = s.upload, hold = this.player.keys.has("KeyE") || s.tap > 0; s.tap -= dt;
    u.p += dt / u.total; const left = (1 - u.p) * u.total;
    this.ui.bar("wanted", u.p, `আপলোড: ${bn(Math.floor(u.p * 100))}%`);
    if (left <= Math.min(50, u.total - 6)) {
      if (!u.warned) { u.warned = true; this.audio.thud(0.7); this.ui.fade(true, "বাইরে জিপ থামার শব্দ। ওরা দরজায় ধাক্কা দিচ্ছে!\n\nE চেপে ধরে রেখে দরজা ঠেকান"); }
      u.door += (hold ? 7 : -15 * this.game.diff) * dt; if ((u.burst -= dt) <= 0) { u.burst = 2.5 + Math.random() * 2.5; u.door -= hold ? 5 : 14; this.audio.thud(0.6); }
      u.door = Math.min(100, u.door); this.ui.bar("seen", u.door / 100, hold ? "দরজা ঠেকিয়ে রেখেছেন" : "দরজা: E চেপে ধরুন!"); this.fear = 1 - u.door / 100;
      if (u.door <= 0) { s.upload = null; this.ui.bar("seen", null); return this.caught("দরজা ভেঙে ওরা ঢুকে পড়েছে। আপলোড শেষ হয়নি।"); }
    }
    if (u.p >= 1) { s.done = true; const gs = this.game.state, c = gs.clues; const n = c.a && c.b && c.c ? 5 : gs.proof1 && gs.proof2 && gs.prisoner ? 1 : 2;
      this.end(n, n === 2 && gs.prisoner ? "আপলোড শেষ। বন্দি মানুষটাও বেঁচে গেছে। কিন্তু প্রমাণ অর্ধেক: একটা টুকরো ওই বাড়িতেই রয়ে গেছে। মামলা টিকবে কি না, কেউ জানে না। আয়নায় সত্যের অর্ধেকটা মুখই দেখা গেল।" : null); }
  }
}
