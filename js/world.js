// Builds the night-time Mirpur 10 scene: city meshes from the GLB, street detail, lights.
import * as THREE from "three";
import * as P from "./props.js?v=1794901412";

const FOG = 0x0c1018;
const SHOPS = ["মায়ের দোয়া স্টোর", "বিসমিল্লাহ হোটেল", "ভাই ভাই টেলিকম", "নিউ ঢাকা ফার্মেসি", "মিরপুর বিরিয়ানি হাউস", "আল-আমিন জেনারেল স্টোর",
  "রূপসী বাংলা টেইলার্স", "সোনালী জুয়েলার্স", "বন্ধু সাইবার ক্যাফে", "শাহ আলী ইলেকট্রনিক্স", "নূরানী বই ঘর", "ঝিলমিল কসমেটিকস",
  "তাজমহল মিষ্টান্ন ভাণ্ডার", "পদ্মা হার্ডওয়্যার", "রহমান ট্রেডার্স", "স্টার মোবাইল সার্ভিসিং", "গ্রামীণ চা ঘর", "নিউ লাকী সেলুন",
  "ফ্রেন্ডস ফটোকপি ও কম্পিউটার", "আনন্দ বেকারি", "ঢাকা ফ্লেক্সিলোড", "একতা ফল ভাণ্ডার", "সততা ডিপার্টমেন্টাল স্টোর", "মদিনা টেলিকম",
  "রংধনু লন্ড্রি", "বিক্রমপুর মিষ্টি ঘর", "খান ফার্নিচার", "আশা অপটিক্স", "জননী ক্লিনিক", "প্রাইম কোচিং সেন্টার", "হক মটরস", "নিরিবিলি রেস্তোরাঁ"];
const SIGN_COL = [["#8d1b1b", "#fff4d6"], ["#123f7a", "#ffffff"], ["#0d5c3a", "#fff8c9"], ["#e8c93a", "#7a1010"], ["#f2efe6", "#a01818"],
  ["#1b1b1b", "#f5d24a"], ["#5a1a6b", "#ffffff"], ["#d4581c", "#ffffff"]];

function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.55)"); gr.addColorStop(0.6, "rgba(255,255,255,.14)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function fitText(g, text, maxW, size, weight = 700) {
  do { g.font = `${weight} ${size}px "Hind Siliguri", "Noto Sans Bengali", sans-serif`; size -= 3; } while (g.measureText(text).width > maxW && size > 12);
}
function signAtlas() {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 2048; const g = c.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 64; i++) {
    const x = (i % 4) * 512, y = Math.floor(i / 4) * 128, [bg, fg] = SIGN_COL[(i * 5 + Math.floor(i / 8)) % SIGN_COL.length];
    g.fillStyle = bg; g.fillRect(x, y, 512, 128);
    g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 4; g.strokeRect(x + 8, y + 8, 496, 112); g.globalAlpha = 1;
    g.fillStyle = fg; fitText(g, SHOPS[i % SHOPS.length], 460, 70); g.fillText(SHOPS[i % SHOPS.length], x + 256, y + 68);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function textTexture(text, w, h, bg, fg, size) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  fitText(g, text, w - 40, size); g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function shutterTexture() {
  const c = document.createElement("canvas"); c.width = 8; c.height = 32; const g = c.getContext("2d");
  for (let y = 0; y < 32; y++) { const v = 150 + Math.round(70 * Math.abs(Math.sin(y / 32 * Math.PI * 4))); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 8, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function cityMaterials() {
  const L = (color, off = 0) => new THREE.MeshLambertMaterial({ color, polygonOffset: off !== 0, polygonOffsetFactor: -off, polygonOffsetUnits: -off });
  const walls = new THREE.MeshLambertMaterial({ vertexColors: true });
  walls.defines = { USE_UV: "" };
  walls.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec2 wc = floor(vUv); vec2 wf = fract(vUv);
        float wh = fract(sin(dot(wc, vec2(12.9898, 78.233))) * 43758.5453);
        float win = step(0.2, wf.x) * step(wf.x, 0.8) * step(0.3, wf.y) * step(wf.y, 0.82) * step(1.0, wc.y);
        diffuseColor.rgb *= mix(1.0, 0.22, win);
        diffuseColor.rgb *= mix(0.72, 1.0, step(1.0, wc.y));
        diffuseColor.rgb *= 1.0 - 0.25 * step(0.94, wf.y);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float lit = step(0.93, wh);
        totalEmissiveRadiance += win * lit * mix(vec3(1.0, 0.7, 0.36), vec3(0.75, 0.85, 1.0), step(0.985, wh)) * (0.35 + 0.5 * fract(wh * 37.0));`);
  };
  return {
    ground: L(0x716c62), grass: L(0x4a7a40, 1), pitch: L(0x4f8a55, 1), water: L(0x1d3c58, 1),
    sidewalk: L(0xa8a094, 2), path: L(0x8a8478, 3), road: L(0x66666c, 4), road_main: L(0x58585e, 5),
    walls, roofs: L(0x8a857c), concrete: L(0x8d8d88), rail: L(0x3a3a3a), station: L(0xa3a39e), station_roof: L(0x2a7a62),
  };
}

export function buildWorld(scene, data, gltf, collision) {
  const rnd = mulberry(1017);
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.0072);
  scene.add(new THREE.HemisphereLight(0x5a6c9c, 0x1a1612, 1.15));
  const moon = new THREE.DirectionalLight(0x8fa3d8, 0.55); moon.position.set(-0.4, 1, 0.3); scene.add(moon);

  // ---- city meshes
  const mats = cityMaterials();
  const meshes = []; gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const m of meshes) {
    m.geometry.computeVertexNormals();
    m.material = mats[m.name] || mats.concrete;
    m.matrixAutoUpdate = false; m.frustumCulled = false;
    scene.add(m);
  }

  // ---- stars
  const sp = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = rnd() * Math.PI * 2, e = Math.asin(0.12 + rnd() * 0.88);
    sp.set([Math.cos(a) * Math.cos(e) * 700, Math.sin(e) * 700, Math.sin(a) * Math.cos(e) * 700], i * 3);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ color: 0xaab4d0, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7, depthWrite: false }));
  stars.frustumCulled = false; scene.add(stars);

  const glowTex = glowTexture();
  const glows = [];   // [x, y, z, radius, colorHex]  ground light pools
  const halos = [];   // [x, y, z, colorHex]          light-source sprites
  const lightSpots = []; // [x, y, z, colorHex, intensity] candidates for the real point-light pool
  const dummy = new THREE.Object3D();
  const instMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  function instanced(geo, items, place, tint) {
    const im = new THREE.InstancedMesh(geo, instMat, items.length); const col = new THREE.Color();
    items.forEach((it, i) => {
      dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); place(dummy, it, i); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tint ? col.set(tint(it, i)) : col.set(0xffffff));
    });
    im.frustumCulled = false; scene.add(im); return im;
  }

  // ---- street lamps (sodium orange)
  const SODIUM = 0xff9a3c;
  instanced(P.lampGeo(), data.lamps, (d, l) => { d.position.set(l[0], 0, l[1]); d.rotation.y = Math.atan2(l[2], l[3]); });
  for (const l of data.lamps) {
    const dead = rnd() < 0.12;      // a few broken lamps leave dark stretches
    if (dead) continue;
    const hx = l[0] + l[2] * 1.55, hz = l[1] + l[3] * 1.55;
    halos.push([hx, 7.0, hz, SODIUM]); glows.push([hx, 0.24, hz, 11, SODIUM]); lightSpots.push([hx, 6.6, hz, SODIUM, 26]);
  }

  // ---- electric poles + tangled wires
  const poleItems = [], wire = [];
  const sagLine = (ax, ay, az, bx, by, bz, sag, n = 6) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      wire.push(ax + (bx - ax) * t0, ay + (by - ay) * t0 - sag * 4 * t0 * (1 - t0), az + (bz - az) * t0,
                ax + (bx - ax) * t1, ay + (by - ay) * t1 - sag * 4 * t1 * (1 - t1), az + (bz - az) * t1);
    }
  };
  for (const chain of data.poles) {
    const rots = chain.map((p, i) => { const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)]; return Math.atan2(b[0] - a[0], b[1] - a[1]); });
    chain.forEach((p, i) => {
      poleItems.push([p[0], p[1], rots[i]]);
      for (let k = 0; k < 3; k++) {      // service drops to nearby buildings
        const a = rnd() * Math.PI * 2, d = 5 + rnd() * 5;
        sagLine(p[0], 7.3, p[1], p[0] + Math.cos(a) * d, 3.2 + rnd() * 2.6, p[1] + Math.sin(a) * d, 0.3 + rnd() * 0.5, 4);
      }
      if (i === 0) return;
      const q = chain[i - 1];
      for (const [off, y] of [[-0.78, 8.16], [-0.36, 8.16], [0.36, 8.16], [0.78, 8.16], [-0.55, 7.36], [0.55, 7.36], [0.1, 6.5], [-0.15, 6.2]]) {
        const o2 = off + (rnd() - 0.5) * 0.25;
        sagLine(q[0] + Math.cos(rots[i - 1]) * off, y, q[1] - Math.sin(rots[i - 1]) * off,
                p[0] + Math.cos(rots[i]) * o2, y + (rnd() - 0.5) * 0.3, p[1] - Math.sin(rots[i]) * o2, 0.25 + rnd() * 1.2);
      }
    });
  }
  instanced(P.poleGeo(), poleItems, (d, p) => { d.position.set(p[0], 0, p[1]); d.rotation.y = p[2]; });
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(wire, 3)),
    new THREE.LineBasicMaterial({ color: 0x020203 }));
  wires.frustumCulled = false; scene.add(wires);

  // ---- parked rickshaws / CNGs / vans, tea stalls
  const HOODS = [0x1f4fa0, 0xa02222, 0x1c7a3c, 0xc9a51e, 0x6a2a8a, 0x1e8a8a];
  const by = k => data.props.filter(p => p.k === k);
  const place = (d, p) => { d.position.set(p.x, 0, p.z); d.rotation.y = p.r; };
  instanced(P.rickshawGeo(), by("rickshaw"), place, (p, i) => HOODS[i % HOODS.length]);
  instanced(P.cngGeo(), by("cng"), place, () => 0x1f7a34);
  instanced(P.vanGeo(), by("van"), place, (p, i) => HOODS[(i + 2) % HOODS.length]);
  instanced(P.teaStallGeo(), by("tea"), place, (p, i) => [0x5d7f99, 0x7a8a6a, 0x8a6a5a][i % 3]);
  for (const p of data.props) {
    collision.addCircle(p.x, p.z, p.k === "tea" ? 1.25 : p.k === "cng" ? 1.0 : 0.8);
    if (p.k === "tea") {
      const WARM = 0xffc070;
      halos.push([p.x, 1.95, p.z, WARM]); glows.push([p.x + Math.sin(p.r) * 1.2, 0.24, p.z + Math.cos(p.r) * 1.2, 5, WARM]);
      lightSpots.push([p.x + Math.sin(p.r) * 0.6, 1.9, p.z + Math.cos(p.r) * 0.6, WARM, 9]);
    }
  }

  // ---- shop fronts: shutters + Bangla signboards
  const sPos = [], sUv = [], sCol = [], hPos = [], hUv = [], hCol = [], oPos = [], oCol = [];
  const quad = (pos, cx, cz, nx, nz, w, y0, y1, out) => {
    const rx = nz, rz = -nx, ax = cx + nx * out, az = cz + nz * out, hw = w / 2;
    const BL = [ax - rx * hw, y0, az - rz * hw], BR = [ax + rx * hw, y0, az + rz * hw], TR = [BR[0], y1, BR[2]], TL = [BL[0], y1, BL[2]];
    pos.push(...BL, ...BR, ...TR, ...BL, ...TR, ...TL);
  };
  const SHUT = [[0.5, 0.52, 0.55], [0.3, 0.42, 0.55], [0.32, 0.5, 0.38], [0.55, 0.36, 0.28], [0.6, 0.58, 0.5]];
  data.signs.forEach((s, i) => {
    const [x, z, nx, nz, w] = s; const open = rnd() < 0.07, litSign = open || rnd() < 0.14;
    const cell = Math.floor(rnd() * 64), u0 = (cell % 4) / 4, v1 = 1 - Math.floor(cell / 4) / 16, u1 = u0 + 0.25, v0 = v1 - 1 / 16;
    quad(sPos, x, z, nx, nz, w, 2.66, 3.46, 0.14);
    sUv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    const b = litSign ? 0.95 : 0.2 + rnd() * 0.12; for (let k = 0; k < 6; k++) sCol.push(b, b, b);
    if (open) {
      quad(oPos, x, z, nx, nz, w - 0.3, 0.12, 2.5, 0.05);
      for (const t of [0, 0, 1, 0, 1, 1]) oCol.push(0.95 - t * 0.25, 0.72 - t * 0.3, 0.42 - t * 0.25);
      glows.push([x + nx * 2.2, 0.24, z + nz * 2.2, 5.5, 0xffc27a]); lightSpots.push([x + nx * 1.5, 2.2, z + nz * 1.5, 0xffc27a, 12]);
    } else {
      quad(hPos, x, z, nx, nz, w - 0.3, 0.12, 2.5, 0.05);
      hUv.push(0, 0, 1, 0, 1, 9, 0, 0, 1, 9, 0, 9);
      const c = SHUT[Math.floor(rnd() * SHUT.length)]; for (let k = 0; k < 6; k++) hCol.push(...c);
    }
  });
  const geo = (pos, uv, col) => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  const add = (g, m) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; scene.add(o); return o; };
  add(geo(sPos, sUv, sCol), new THREE.MeshBasicMaterial({ map: signAtlas(), vertexColors: true }));
  add(geo(hPos, hUv, hCol), new THREE.MeshLambertMaterial({ map: shutterTexture(), vertexColors: true }));
  add(geo(oPos, null, oCol), new THREE.MeshBasicMaterial({ vertexColors: true }));

  // ---- golchottor monument
  const mon = new THREE.Mesh(P.monumentGeo(), instMat); scene.add(mon);
  collision.addCircle(0, 0, 6.3);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6; glows.push([Math.cos(a) * 9, 0.24, Math.sin(a) * 9, 10, 0xffb060]); }
  halos.push([0, 7.6, 0, 0xffd9a0]); lightSpots.push([0, 5, 4, 0xffb060, 22]);

  // ---- metro station dressing (lit concourse + name boards)
  const st = data.landmarks.station;
  if (st) {
    const ry = Math.atan2(st.dx, st.dz), px = st.dz, pz = -st.dx;     // perpendicular to the track
    const band = new THREE.MeshBasicMaterial({ color: 0x9fc0cf });
    const board = new THREE.MeshBasicMaterial({ map: textTexture("মিরপুর ১০ মেট্রো স্টেশন", 1024, 128, "#0b6b4f", "#ffffff", 84) });
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 146), band);
      b.position.set(st.x + px * 12.1 * s, 10.6, st.z + pz * 12.1 * s); b.rotation.y = ry; scene.add(b);
      for (const k of [-45, 0, 45]) {
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), board);
        sg.position.set(st.x + st.dx * k + px * 12.25 * s, 8.0, st.z + st.dz * k + pz * 12.25 * s);
        sg.rotation.y = Math.atan2(px * s, pz * s); scene.add(sg);
      }
    }
    for (let k = -60; k <= 60; k += 30) {
      glows.push([st.x + st.dx * k, 0.24, st.z + st.dz * k, 13, 0xbcd6e6]);
      lightSpots.push([st.x + st.dx * k, 6.2, st.z + st.dz * k, 0xbcd6e6, 24]);
    }
  }

  // ---- ground light pools + halos
  const glowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }), glows.length);
  const c = new THREE.Color();
  glows.forEach((gl, i) => {
    dummy.position.set(gl[0], gl[1], gl[2]); dummy.rotation.set(0, 0, 0); dummy.scale.set(gl[3] * 2, 1, gl[3] * 2); dummy.updateMatrix();
    glowMesh.setMatrixAt(i, dummy.matrix); glowMesh.setColorAt(i, c.set(gl[4]));
  });
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 2; scene.add(glowMesh);
  const hp = new Float32Array(halos.length * 3), hc = new Float32Array(halos.length * 3);
  halos.forEach((h, i) => { hp.set([h[0], h[1], h[2]], i * 3); c.set(h[3]); hc.set([c.r, c.g, c.b], i * 3); });
  const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.BufferAttribute(hp, 3)); hg.setAttribute("color", new THREE.BufferAttribute(hc, 3));
  const haloPts = new THREE.Points(hg, new THREE.PointsMaterial({ map: glowTex, size: 3.4, sizeAttenuation: true, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  haloPts.frustumCulled = false; haloPts.renderOrder = 3; scene.add(haloPts);

  // ---- pool of real lights that follows the player to the nearest light sources
  const POOL = 4, pool = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(SODIUM, 0, 30, 1.4); scene.add(l); pool.push(l); }
  let timer = 0;
  function update(dt, cam) {
    stars.position.copy(cam.position);
    timer -= dt; if (timer > 0) return; timer = 0.2;
    const px = cam.position.x, pz = cam.position.z;
    const near = lightSpots.map(s => [(s[0] - px) ** 2 + (s[2] - pz) ** 2, s]).sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < POOL; i++) {
      const s = near[i] && near[i][0] < 70 * 70 ? near[i][1] : null, l = pool[i];
      if (!s) { l.intensity = 0; continue; }
      l.position.set(s[0], s[1], s[2]); l.color.set(s[3]); l.distance = s[4]; l.intensity = s[4] * 0.8;
    }
  }
  return { update, counts: { lamps: data.lamps.length, signs: data.signs.length, props: data.props.length, poles: poleItems.length } };
}
