// Act 1: the locked room. Matches (light as a resource), mirror-reversed code, cupboard keypad,
// screwdriver, mirror frame -> ventilation hole. Footsteps event: hide in the dark on the bed.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { Collision } from "./collision.js?v=1795085710";

export const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const W = 2.2, D = 2.0, H = 2.8;                 // room half-width (x), half-depth (z), height
const MIRROR_Z = 0.45;

function noiseTex(base, vary, stains = 30, size = 256) {
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * vary})`; g.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
  for (let i = 0; i < stains; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(20,25,15,.28)"); gr.addColorStop(1, "rgba(20,25,15,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function codeTex(code) {      // written mirror-reversed: only readable in the mirror
  const c = document.createElement("canvas"); c.width = 1024; c.height = 384; const g = c.getContext("2d");
  g.translate(1024, 0); g.scale(-1, 1);
  g.font = '700 250px "Hind Siliguri", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  [...bn(code)].forEach((ch, i) => {
    g.save(); g.translate(150 + i * 240, 200 + (Math.random() - 0.5) * 30); g.rotate((Math.random() - 0.5) * 0.16);
    g.fillStyle = "rgba(120,22,14,.92)"; g.fillText(ch, 0, 0); g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class Act1 {
  constructor(ctx) {          // ctx: { camera, player, audio, ui }
    Object.assign(this, ctx);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x000000);
    this.col = new Collision({ bounds: [-W, -D, W, D], margin: 0.4, buildings: [], pillars: [] });
    this.items = [];          // interactables
    this.build();
  }

  build() {
    const s = this.scene, L = (o) => new THREE.MeshLambertMaterial(o);
    const wallT = noiseTex("#6f7a66", 0.06), floorT = noiseTex("#5a554d", 0.08, 50), woodT = noiseTex("#5b4028", 0.1, 10);
    wallT.repeat.set(2, 1.4); floorT.repeat.set(3, 3);
    const mWall = L({ map: wallT }), mFloor = L({ map: floorT }), mWood = L({ map: woodT }), mDark = L({ color: 0x1b1b1b }), mMetal = L({ color: 0x70757a });
    const box = (w, h, d, m, x, y, z, parent = s) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
    const solid = (x0, z0, x1, z1) => this.col.addPoly(Float32Array.from([x0, z0, x1, z0, x1, z1, x0, z1]));

    // shell
    box(W * 2, 0.1, D * 2, mFloor, 0, -0.05, 0); box(W * 2, 0.1, D * 2, L({ color: 0x4a4a44 }), 0, H + 0.05, 0);
    box(W * 2, H, 0.1, mWall, 0, H / 2, -D - 0.05); box(W * 2, H, 0.1, mWall, 0, H / 2, D + 0.05);
    box(0.1, H, D * 2, mWall, -W - 0.05, H / 2, 0); box(0.1, H, D * 2, mWall, W + 0.05, H / 2, 0);

    // faint night glow from a barred ventilator high on the north wall
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ color: 0x1a2740 })); vent.position.set(-1.2, 2.45, -D + 0.01); s.add(vent);
    for (let i = -2; i <= 2; i++) box(0.02, 0.25, 0.02, mDark, -1.2 + i * 0.09, 2.45, -D + 0.02);
    this.ambient = new THREE.AmbientLight(0x35486a, 0.12); s.add(this.ambient);
    const moon = new THREE.PointLight(0x4a6aa0, 0.25, 5, 1.5); moon.position.set(-1.2, 2.3, -D + 0.4); s.add(moon);

    // door (locked) with a peephole slot
    box(0.95, 2.05, 0.06, L({ color: 0x3a2c20 }), 1.2, 1.025, -D + 0.03); box(0.08, 0.03, 0.05, mMetal, 0.85, 1.0, -D + 0.08);
    this.slot = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.07), new THREE.MeshBasicMaterial({ color: 0x000000 })); this.slot.position.set(1.2, 1.55, -D + 0.065); s.add(this.slot);
    this.slotLight = new THREE.SpotLight(0xfff0d0, 0, 7, 0.5, 0.5, 1); this.slotLight.position.set(1.2, 1.55, -D + 0.1);
    this.slotLight.target.position.set(0.2, 0.8, 1.2); s.add(this.slotLight, this.slotLight.target);

    // bed along the south wall
    const bx = -0.95, bz = D - 0.52;
    box(2.0, 0.08, 0.95, mWood, bx, 0.42, bz); box(1.95, 0.14, 0.9, L({ color: 0x77705f, map: floorT }), bx, 0.53, bz);
    box(0.45, 0.1, 0.6, L({ color: 0x8a8474 }), bx - 0.7, 0.63, bz);
    for (const [dx, dz] of [[-0.95, -0.43], [0.95, -0.43], [-0.95, 0.43], [0.95, 0.43]]) box(0.07, 0.42, 0.07, mWood, bx + dx, 0.21, bz + dz);
    solid(bx - 1.0, bz - 0.48, bx + 1.0, bz + 0.48);
    this.bed = new THREE.Vector3(bx, 0.6, bz);
    this.matchbox = box(0.06, 0.02, 0.04, L({ color: 0xb03a2a }), bx + 0.2, 0.01, bz - 0.1);

    // cupboard in the north-east corner, door facing west
    const cx = W - 0.3, cz = -1.25;
    box(0.55, 1.9, 0.04, mWood, cx, 0.95, cz - 0.5); box(0.55, 1.9, 0.04, mWood, cx, 0.95, cz + 0.5); box(0.04, 1.9, 1.0, mWood, cx + 0.26, 0.95, cz);
    box(0.55, 0.04, 1.0, mWood, cx, 1.9, cz); box(0.55, 0.04, 1.0, mWood, cx, 0.02, cz); box(0.5, 0.03, 0.96, mWood, cx, 1.0, cz);
    this.cupDoor = new THREE.Group(); this.cupDoor.position.set(cx - 0.28, 0, cz - 0.5); s.add(this.cupDoor);
    box(0.04, 1.86, 1.0, L({ map: woodT, color: 0xc0b090 }), 0, 0.95, 0.5, this.cupDoor);
    box(0.03, 0.14, 0.1, mMetal, -0.03, 1.1, 0.9, this.cupDoor);                                 // keypad lock
    solid(cx - 0.3, cz - 0.52, cx + 0.3, cz + 0.52);
    this.cup = new THREE.Vector3(cx - 0.3, 1.1, cz);
    this.screwdriver = new THREE.Group(); this.screwdriver.position.set(cx - 0.05, 1.04, cz - 0.2); s.add(this.screwdriver);
    box(0.03, 0.03, 0.1, L({ color: 0xc9a020 }), 0, 0, -0.08, this.screwdriver); box(0.008, 0.008, 0.14, mMetal, 0, 0, 0.04, this.screwdriver);
    this.phone = box(0.07, 0.012, 0.14, L({ color: 0x0c0c0e }), cx - 0.05, 1.03, cz + 0.2);
    this.screwdriver.visible = this.phone.visible = false;

    // mirror on the west wall; ventilation hole behind it
    this.mirror = new THREE.Group(); this.mirror.position.set(-W + 0.03, 1.45, MIRROR_Z); this.mirror.rotation.y = Math.PI / 2; s.add(this.mirror);
    const glass = new Reflector(new THREE.PlaneGeometry(0.72, 1.12), { textureWidth: 512, textureHeight: 800, color: 0xdde4e4 });
    glass.position.z = 0.012; this.mirror.add(glass);
    const fr = L({ color: 0x3a2a1a });
    box(0.84, 0.06, 0.03, fr, 0, 0.59, 0, this.mirror); box(0.84, 0.06, 0.03, fr, 0, -0.59, 0, this.mirror);
    box(0.06, 1.24, 0.03, fr, -0.39, 0, 0, this.mirror); box(0.06, 1.24, 0.03, fr, 0.39, 0, 0, this.mirror);
    this.screws = [[-0.39, 0.59], [0.39, 0.59], [-0.39, -0.59], [0.39, -0.59]].map(([x, y]) => box(0.025, 0.025, 0.02, mMetal, x, y, 0.02, this.mirror));
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ color: 0x020202 }));
    hole.position.set(-W + 0.012, 1.25, MIRROR_Z); hole.rotation.y = Math.PI / 2; s.add(hole);
    this.mirrorPos = new THREE.Vector3(-W + 0.05, 1.45, MIRROR_Z);
    this.planks = new THREE.Group(); s.add(this.planks);
    for (let k = 0; k < 4; k++) box(0.04, 0.16, 0.9, mWood, -W + 0.03, 0.98 + k * 0.19, MIRROR_Z + (k % 2 ? 0.04 : -0.04), this.planks).rotation.x = (k % 2 ? 0.06 : -0.05);

    // code on the east wall, opposite the mirror
    this.codeMat = new THREE.MeshLambertMaterial({ transparent: true, depthWrite: false });
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.86), this.codeMat); cp.position.set(W - 0.01, 1.5, MIRROR_Z); cp.rotation.y = -Math.PI / 2; s.add(cp);
    this.codePos = cp.position.clone();

    // small props
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.28, 10), L({ color: 0x35506a })); bucket.position.set(-W + 0.35, 0.14, -D + 0.4); s.add(bucket);
    box(0.25, 0.02, 0.25, mMetal, 0.2, 0.01, D - 0.3);

    // match light
    this.flame = new THREE.PointLight(0xffa040, 0, 16, 1.1); s.add(this.flame); this.fear = 0;

    const P = this;
    this.items = [
      { pos: this.matchbox.position, range: 1.7, dot: 0.5,
        label: () => P.st.hasBox ? null : P.player.crouch ? "দেশলাইয়ের বাক্স নিন" : "বিছানার নিচে কিছু একটা আছে… (C চেপে নিচু হন)", act: () => P.player.crouch && P.takeBox() },
      { pos: this.bed, range: 1.6, dot: 0.6, label: () => "বিছানায় শুয়ে পড়ুন", act: () => P.lie(true) },
      { pos: new THREE.Vector3(1.2, 1.1, -D), range: 1.6, label: () => P.st.blocked && P.st.hasDriver ? `দরজার কব্জার স্ক্রু খুলুন (${bn(P.st.hinges)}টা বাকি)` : "দরজা",
        act: () => { const s = P.st; if (!(s.blocked && s.hasDriver)) return P.ui.say("বাইরে থেকে তালা দেওয়া। নড়ছেই না।"); if (s.ev !== "idle") return P.ui.say("এখন না! সে দরজার ঠিক ওপাশে।"); s.hinges--; P.audio.screw(); if (s.hinges <= 0) P.finish(); } },
      { pos: this.codePos, range: 2.6, label: () => P.lightLevel() > 0.3 ? "দেয়ালের লেখা দেখুন" : null,
        act: () => { P.st.sawCode = true; P.ui.say("কেউ ইটের টুকরো দিয়ে কিছু লিখে গেছে… কিন্তু অক্ষরগুলো উল্টো। সোজা তাকিয়ে পড়া যাচ্ছে না।", 6); P.objective(); } },
      { pos: this.cup, range: 1.5, label: () => P.st.cupOpen ? null : "আলমারির তালা (৪ সংখ্যার কোড)", act: () => P.ui.openKeypad(c => P.tryCode(c)) },
      { pos: this.screwdriver.position, range: 1.5, label: () => P.st.cupOpen && !P.st.hasDriver ? "স্ক্রু-ড্রাইভার নিন" : null, act: () => P.take("driver") },
      { pos: this.phone.position, range: 1.5, label: () => P.st.cupOpen && !P.st.hasPhone ? "ভাঙা ফোনটা নিন" : null, act: () => P.take("phone") },
      { pos: this.mirrorPos, range: 1.5,
        label: () => P.st.blocked ? "ফোকরটা তক্তা মেরে বন্ধ করা" : P.st.mirrorOff ? (P.st.lit && !P.game.state.clues.a ? "আয়নার পেছনটা দেখুন" : "ফোকর দিয়ে বেরিয়ে যান") : P.st.hasDriver ? `ফ্রেমের স্ক্রু খুলুন (${bn(P.st.screws)}টা বাকি)` : "আয়না", act: () => P.useMirror() },
    ];
  }

  start(opts = {}) {
    const gs = this.game.state, code = String(1000 + Math.floor(Math.random() * 9000));
    this.st = { code, matches: 0, hasBox: false, lit: false, burn: 0, everLit: false, sawCode: false, cupOpen: false, hasDriver: false, hasPhone: false,
      screws: 4, mirrorOff: false, lying: false, ev: "idle", evT: 0, next: 1e9, beat: 0, stepT: 0, over: false, blocked: !!opts.blocked, hinges: 3 };
    const s0 = this.st; this.planks.visible = s0.blocked; this.mirror.visible = !s0.blocked;
    if (s0.blocked) Object.assign(s0, { hasBox: true, matches: Math.max(3, gs.matches), everLit: true, cupOpen: true, hasDriver: true, hasPhone: gs.proof1, sawCode: true, next: 30 });
    if (this.codeMat.map) this.codeMat.map.dispose();
    this.codeMat.map = codeTex(code); this.codeMat.needsUpdate = true;
    this.matchbox.visible = !s0.blocked; this.screwdriver.visible = this.phone.visible = false; this.cupDoor.rotation.y = 0;
    this.mirror.position.set(-W + 0.03, 1.45, MIRROR_Z); this.mirror.rotation.set(0, Math.PI / 2, 0); this.screws.forEach(m => m.visible = true);
    this.slotLight.intensity = 0; this.slot.material.color.set(0x000000);
    this.player.col = this.col; this.player.crouch = false; this.player.teleport(-0.2, 0.9, 0.6); this.player.pitch = 0; this.player.enabled = true;
    this.camera.near = 0.05; this.camera.updateProjectionMatrix();
    this.audio.outdoor = false;
    this.inv(); this.ui.matches(s0.hasBox ? s0.matches : null, 0); this.objective();
    this.ui.say(s0.blocked ? "আবার সেই ঘর। ফোকরটা বন্ধ করে দিয়েছে… কিন্তু স্ক্রু-ড্রাইভারটা টের পায়নি।" : "মাথাটা ঝিমঝিম করছে… কোথায় আমি? চারদিক ঘুটঘুটে অন্ধকার।", 6);
    this.game.save({ act: 1 });
    if (!s0.blocked) this.ui.tip("মাউস ঘুরিয়ে চারপাশ দেখুন · WASD দিয়ে হাঁটুন · কোনো জিনিসের কাছে গিয়ে তাকালে [E] লেখা ভেসে উঠবে", 14);
  }

  objective() {
    const s = this.st;
    if (s.blocked) return this.ui.objective("অন্য পথ খুঁজুন। দরজাটা ভালো করে দেখুন");
    this.ui.objective(!s.hasBox ? "আলোর ব্যবস্থা করুন। হাতড়ে ঘরটা খুঁজে দেখুন" : !s.everLit ? "F চেপে একটা কাঠি জ্বালান"
      : !s.cupOpen ? (s.sawCode ? "উল্টো লেখাটা পড়ার উপায় বের করুন" : "ঘরটা ভালো করে দেখুন। বেরোনোর পথ খুঁজুন")
      : !(s.hasDriver && s.hasPhone) ? "আলমারির ভেতরের জিনিসগুলো নিন" : !s.mirrorOff ? "স্ক্রু-ড্রাইভারটা কোথায় কাজে লাগে?" : "ফোকর দিয়ে বেরিয়ে যান");
  }
  missions() {
    const s = this.st; if (!s) return [];
    return s.blocked ? [["দরজার কব্জা খুলে বের হন", s.over && s.hinges <= 0]]
      : [["আলোর ব্যবস্থা করুন", s.hasBox], ["দেয়ালের কোড পড়ে আলমারি খুলুন", s.cupOpen], ["ভাঙা ফোনটা নিন (প্রমাণ ১)", s.hasPhone], ["আয়নার ফ্রেম খুলুন", s.mirrorOff], ["ঘর থেকে বেরিয়ে যান", s.over && s.mirrorOff], ["গোপন: আয়নার পেছনটা দেখুন", !!this.game.state.clues.a]];
  }
  inv() {
    const s = this.st, a = []; if (s.hasBox) a.push("দেশলাই"); if (s.hasDriver) a.push("স্ক্রু-ড্রাইভার"); if (s.hasPhone) a.push("ভাঙা ফোন (প্রমাণ ১)");
    this.ui.inventory(a);
  }
  lightLevel() { return this.st.lit ? 1 : this.st.hasBox && this.st.matches === 0 ? 0.35 : 0; }

  takeBox() {
    const s = this.st; s.hasBox = true; s.matches = 5; this.matchbox.visible = false; this.audio.click();
    this.ui.say("একটা দেশলাইয়ের বাক্স! ভেতরে মাত্র পাঁচটা কাঠি। হিসাব করে খরচ করতে হবে।", 6);
    this.ui.matches(5, 0); s.next = 40; this.ui.tip("F = কাঠি জ্বালানো / নিভিয়ে ফেলা। প্রতিটা কাঠি অল্প সময় জ্বলে", 10); this.inv(); this.objective();
  }
  toggleMatch() {
    const s = this.st; if (s.over || !s.hasBox) { if (!s.hasBox) this.ui.say("আলো জ্বালানোর মতো কিছু নেই।"); return; }
    if (s.lit) { s.lit = false; s.burn = 0; this.audio.blow(); this.ui.matches(s.matches, 0); return; }
    if (s.matches <= 0) { this.ui.say("কাঠি শেষ। চোখ অন্ধকারে একটু সয়ে এসেছে, আবছা দেখা যাচ্ছে।"); return; }
    if (s.lying) return;
    s.matches--; s.lit = true; s.burn = s.burnMax = 15 / this.game.diff; this.audio.match();
    if (!s.everLit) { s.everLit = true; this.objective(); }
  }
  tryCode(c) {
    if (c !== this.st.code) { this.audio.beep(false); return false; }
    this.st.cupOpen = true; this.audio.unlock(); this.screwdriver.visible = this.phone.visible = true;
    this.ui.say("খুলে গেছে!", 3); this.objective(); return true;
  }
  take(what) {
    const s = this.st; this.audio.click();
    if (what === "driver") { s.hasDriver = true; this.screwdriver.visible = false; this.ui.say("একটা স্ক্রু-ড্রাইভার। কাজে লাগবে।"); }
    else {
      s.hasPhone = true; this.phone.visible = false; this.audio.garble(5);
      this.ui.say("ফোনে একটা ভয়েস মেসেজ: “…টাকাটা ওসি সাহেবের হাতে পৌঁছে গেছে… ছেলেটা সব দেখে ফেলেছে… ওকে আয়না—” [বার্তা কেটে গেছে]", 9);
    }
    this.inv(); this.objective();
  }
  useMirror() {
    const s = this.st;
    if (s.blocked) return this.ui.say("মোটা তক্তা, পেরেক মারা। এদিক দিয়ে আর হবে না।");
    if (s.mirrorOff && s.lit && !this.game.state.clues.a) { this.game.state.clues.a = 1; return this.ui.say("আয়নার পেছনে পুরনো কালিতে লেখা: “যে তোমাকে এনেছে, সে তোমাকে চেনে”", 6); }
    if (s.mirrorOff) return this.finish();
    if (!s.hasDriver) return this.ui.say("পুরনো একটা আয়না। ফ্রেমটা চারটা স্ক্রু দিয়ে দেয়ালে আটকানো। পেছনটা ফাঁপা শোনাচ্ছে।", 5);
    s.screws--; this.screws[s.screws].visible = false; this.audio.screw();
    if (s.screws === 0) {
      s.mirrorOff = true; this.audio.creak();
      this.mirror.position.set(-W + 0.22, 0.62, MIRROR_Z + 1.0); this.mirror.rotation.set(0, Math.PI / 2, 0); this.mirror.rotateX(-0.28);
      this.ui.say("আয়নার পেছনে একটা ভেন্টিলেশনের ফোকর! গা গলিয়ে বেরোনো যাবে।", 5); this.objective();
    }
  }
  lie(down) {
    const s = this.st; s.lying = down; this.player.enabled = !down;
    if (down && s.lit) { s.lit = false; s.burn = 0; this.audio.blow(); }
  }
  caught(why) {
    const s = this.st; if (s.over) return; s.over = true; this.player.enabled = false; this.audio.thud(0.6);
    this.ui.result("ধরা পড়েছেন", why, [["আবার চেষ্টা করুন", () => this.start()]]);
  }
  finish() {
    const s = this.st, gs = this.game.state; if (s.over) return; s.over = true; this.player.enabled = false;
    gs.proof1 = s.hasPhone; gs.matches = s.matches; this.game.save({ act: 2 });
    this.ui.fade(true, s.blocked ? "কব্জা খুলে দরজাটা আলগোছে নামিয়ে রাখলেন…" : "সরু ফোকর দিয়ে হামাগুড়ি দিয়ে এগোচ্ছেন…" + (s.hasPhone ? "" : "\n(ভাঙা ফোনটা ঘরেই রয়ে গেল)"));
    setTimeout(() => this.game.setMode("act2"), 3500);
  }

  onKey(code) {
    const s = this.st; if (!s || s.over) return;
    if (code === "KeyF") this.toggleMatch();
    if (code === "KeyE") { if (s.lying) this.lie(false); else if (this.target) this.target.act(); }
  }

  update(dt) {
    const s = this.st, cam = this.camera; if (!s) return;
    if (s.lying) { cam.position.set(this.bed.x - 0.55, 0.78, this.bed.z); cam.rotation.set(0.5, -Math.PI / 2 - 0.5, 0); }

    // match
    if (s.lit) {
      s.burn -= dt; if (s.burn <= 0) { s.lit = false; this.ui.say(s.matches ? "কাঠিটা পুড়ে শেষ।" : "শেষ কাঠিটাও পুড়ে গেল…"); }
      this.ui.matches(s.matches, Math.max(0, s.burn / s.burnMax));
    }
    const fl = s.lit ? (0.75 + Math.random() * 0.25) * Math.min(1, s.burn / 1.2) * 3.0 : 0;
    this.flame.intensity += (fl - this.flame.intensity) * Math.min(1, dt * 14);
    const f = new THREE.Vector3(0.22, -0.2, -0.35).applyQuaternion(cam.quaternion); this.flame.position.copy(cam.position).add(f);
    this.ambient.intensity += ((this.lightLevel() === 0.35 ? 0.9 : 0.12) - this.ambient.intensity) * Math.min(1, dt * 0.5);
    this.ui.flame(s.lit);

    s.dark = s.lit ? Math.max(0, (s.dark || 0) - dt * 0.3) : Math.min(1, (s.dark || 0) + dt / 80); this.fear = Math.max(s.dark, s.ev !== "idle" ? 0.95 : 0);
    if (s.hasBox && !s.cupOpen && !s.blocked) {       // escalating hints so nobody gets stuck on the mirror puzzle
      s.hintT = (s.hintT || 0) + dt;
      if (s.hintT > 50 && !s.h1) { s.h1 = 1; this.ui.tip("ইঙ্গিত: দেয়ালের লাল লেখাটা উল্টো। উল্টো লেখা সোজা দেখায় কোথায়?", 12); }
      if (s.hintT > 110 && !s.h2) { s.h2 = 1; this.ui.objective("আয়নার সামনে দাঁড়িয়ে কাঠি জ্বালান: আয়নার ভেতরে পেছনের দেয়ালের ৪টা সংখ্যা পড়ুন, তারপর আলমারিতে গিয়ে E চেপে বসান"); }
    }
    // cupboard door swing
    const want = s.cupOpen ? -1.9 : 0; this.cupDoor.rotation.y += (want - this.cupDoor.rotation.y) * Math.min(1, dt * 3);

    // interaction target
    this.target = null;
    if (!s.over && !s.lying) {
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir); let best = 0;
      for (const it of this.items) {
        const d = it.pos.clone().sub(cam.position), dist = d.length(); if (dist > it.range) continue;
        const dot = d.normalize().dot(dir); if (dot < (it.dot || 0.8) || dot < best) continue;
        const lab = it.label(); if (lab) { best = dot; this.target = it; this.targetLabel = lab; }
      }
    }
    this.ui.prompt(s.over ? "" : s.lying ? "[E] উঠে পড়ুন" : this.target ? `[E] ${this.targetLabel}` : "");

    // footsteps event
    if (s.over) return;
    s.next -= dt;
    if (s.ev === "idle" && s.next <= 0) { s.ev = "approach"; s.evT = 8; s.stepT = 0; this.ui.say("পায়ের শব্দ! কেউ আসছে… আলো নিভিয়ে (F) বিছানায় শুয়ে পড়ুন (E)!", 7); }
    else if (s.ev === "approach") {
      s.evT -= dt; s.stepT -= dt; s.beat -= dt;
      if (s.stepT <= 0) { s.stepT = 0.55; this.audio.thud(0.08 + 0.4 * (1 - s.evT / 8)); }
      if (s.beat <= 0) { s.beat = 0.8; this.audio.heartbeat(); }
      if (s.evT <= 0) { s.ev = "check"; s.evT = 3.2; this.audio.creak(); this.slotLight.intensity = 30; this.slot.material.color.set(0xfff0d0); }
    } else if (s.ev === "check") {
      s.evT -= dt; s.beat -= dt; if (s.beat <= 0) { s.beat = 0.6; this.audio.heartbeat(); }
      if (s.lit) return this.caught("দরজার ফাঁক দিয়ে সে আলো দেখে ফেলেছে।");
      if (!s.lying) return this.caught("আপনি বিছানায় ছিলেন না। সে বুঝে গেছে আপনি জেগে উঠে কিছু করছেন।");
      if (s.mirrorOff) return this.caught("খোলা আয়না আর ফোকরটা তার চোখে পড়ে গেছে।");
      if (s.evT <= 0) { s.ev = "leave"; s.evT = 4; s.stepT = 0; this.slotLight.intensity = 0; this.slot.material.color.set(0x000000); this.audio.click(); }
    } else if (s.ev === "leave") {
      s.evT -= dt; s.stepT -= dt;
      if (s.stepT <= 0) { s.stepT = 0.55; this.audio.thud(0.05 + 0.3 * (s.evT / 4)); }
      if (s.evT <= 0) { s.ev = "idle"; s.next = 50 + Math.random() * 30; this.ui.say("চলে গেছে… আপাতত।", 3); }
    }
  }
}
