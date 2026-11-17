import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Collision } from "./collision.js?v=1794901412";
import { Player, setupTouch } from "./player.js?v=1794901412";
import { buildWorld } from "./world.js?v=1794901412";
import { GameAudio } from "./audio.js?v=1794901412";
import { UI } from "./ui.js?v=1794901412";
import { Act1 } from "./act1.js?v=1794901412";
import { Act2 } from "./act2.js?v=1794901412";
import { Intro, Act3, Ambient } from "./act3.js?v=1794901412";

const $ = id => document.getElementById(id);
const canvas = $("c"), overlay = $("overlay"), hud = $("hud");
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch (e) { $("loadText").textContent = "এই browser-এ WebGL চালু নেই, তাই game চালানো যাচ্ছে না।"; throw e; }
const BASE_PR = Math.min(devicePixelRatio || 1, 1.25); let pr = BASE_PR;
renderer.setPixelRatio(pr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.12, 900);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

const audio = new GameAudio();
const game = window.__game = { ready: false, running: false, fps: 0, scene, camera, renderer, audio, modes: {}, mode: null, cur: null,
  state: { proof1: false, proof2: false, prisoner: false, clues: {}, matches: 0 } };
const ui = game.ui = new UI(game);
const setLoad = (f, text) => { $("bar").firstElementChild.style.width = Math.round(f * 100) + "%"; if (text) $("loadText").textContent = text; };

game.save = extra => { try { localStorage.setItem("aynaghor_save", JSON.stringify({ ...game.state, ...extra })); } catch (e) {} };
game.loadSave = () => { try { return JSON.parse(localStorage.getItem("aynaghor_save") || "null"); } catch (e) { return null; } };
game.relock = () => { if (!isTouch && game.running && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } };
game.setMode = (name, opts) => {
  if (game.cur && game.cur.leave) game.cur.leave();
  ui.fade(false); ui.toggleMap(null); ui.prompt(""); ui.objective(""); ui.status(""); ui.matches(null); ui.flame(false);
  for (const b of ["noise", "seen", "wanted"]) ui.bar(b, null);
  game.mode = name; game.cur = game.modes[name]; game.cur.start(opts || {});
};

async function boot() {
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('700 64px "Hind Siliguri"', "আয়নাঘর"), document.fonts.load('400 16px "Hind Siliguri"', "আ")]),
    new Promise(r => setTimeout(r, 4000))]);
  const [data, gltf] = await Promise.all([
    fetch("assets/mirpur.json?v=1794901412").then(r => { if (!r.ok) throw new Error("mirpur.json " + r.status); return r.json(); }),
    new Promise((res, rej) => new GLTFLoader().load("assets/mirpur.glb?v=1794901412", res, e => { if (e.total) setLoad(0.1 + 0.7 * e.loaded / e.total); }, rej)),
    fontsReady]);
  setLoad(0.85, "রাস্তা সাজানো হচ্ছে…");
  await new Promise(r => setTimeout(r, 30));

  const collision = new Collision(data);
  const world = buildWorld(scene, data, gltf, collision);
  const player = new Player(camera, collision, canvas);
  player.onStep = (run, crouch) => audio.step(run, crouch);
  Object.assign(game, { data, world, player, collision });
  const ctx = { game, camera, player, audio, ui, data, world, collision, scene };

  // ---- free-walk mode on the street
  const lm = data.landmarks, places = [
    { n: "মিরপুর ১০ গোলচত্বর", x: 0, z: 0, r: 32 },
    lm.station && { n: "মিরপুর ১০ মেট্রো স্টেশন", x: lm.station.x, z: lm.station.z, r: 45 },
    lm.stadium && { n: "শের-ই-বাংলা স্টেডিয়াম", x: lm.stadium[0], z: lm.stadium[1], r: 170 }].filter(Boolean);
  let here = null;
  game.landmarks = () => { const p = places.find(q => Math.hypot(player.pos.x - q.x, player.pos.z - q.z) < q.r) || null; if (p !== here) { here = p; if (p) ui.toast(p.n); } };
  game.streetCam = () => { camera.near = 0.12; camera.updateProjectionMatrix(); player.col = collision; audio.outdoor = true; };
  game.modes.walk = {
    scene,
    start() { game.streetCam(); player.crouch = false; player.teleport(data.spawn.x, data.spawn.z, Math.atan2(data.spawn.x, data.spawn.z)); player.enabled = true; ui.inventory([]); },
    update(dt) { world.update(dt, camera); game.landmarks(); ui.status(player.crouch ? "বসে চলছেন" : player.running && player.speed > 3.5 ? "দৌড়াচ্ছেন" : ""); },
    onKey() {},
  };
  game.modes.act1 = new Act1(ctx);
  game.modes.act2 = new Act2(ctx);
  game.modes.intro = new Intro(ctx);
  game.modes.act3 = new Act3(ctx);
  game.ambient = new Ambient(ctx, game.modes.act3.gAll);
  game.modes.walk.mapMarks = game.modes.intro.mapMarks = () => [];
  game.diff = 1; try { game.diff = +localStorage.getItem("aynaghor_diff") || 1; } catch (e) {}
  const dbtn = [...document.querySelectorAll("#diff button")], setDiff = d => { game.diff = d; dbtn.forEach(b => b.classList.toggle("on", +b.dataset.d === d)); try { localStorage.setItem("aynaghor_diff", d); } catch (e) {} };
  dbtn.forEach(b => b.onclick = () => setDiff(+b.dataset.d)); setDiff(game.diff);
  game.ctx = ctx;

  // ---- menu / pause
  const menu = (paused) => {
    overlay.classList.remove("hidden"); $("menu").classList.remove("hidden");
    $("btnResume").classList.toggle("hidden", !paused); $("btnContinue").classList.toggle("hidden", paused || !game.loadSave());
  };
  const go = (name, opts) => { overlay.classList.add("hidden"); hud.classList.remove("hidden"); game.running = true; audio.start(); game.relock(); if (name) game.setMode(name, opts); else if (!ui.modal) player.enabled = true; };
  game.start = go;
  game.pause = () => { if (!game.running) return; game.wasEnabled = player.enabled; player.enabled = false; game.running = false; menu(true); };
  $("btnResume").onclick = () => { go(null); player.enabled = game.wasEnabled && !ui.modal; };
  $("btnNew").onclick = () => { game.state = { proof1: false, proof2: false, prisoner: false, clues: {}, matches: 0 }; go(game.modes.intro ? "intro" : "act1"); };
  $("btnWalk").onclick = () => go("walk");
  const how = show => { if (!$("howto")) return; $("howto").classList.toggle("hidden", !show); if (show && game.running) { if (document.pointerLockElement) document.exitPointerLock(); else game.pause(); } };
  if ($("btnHelp")) $("btnHelp").onclick = () => how(true); if ($("howClose")) $("howClose").onclick = () => how(false);
  let seenHow = false; try { seenHow = !!localStorage.getItem("aynaghor_how"); } catch (e) {}
  const firstNew = $("btnNew").onclick;
  $("btnNew").onclick = () => { if (!seenHow && $("howto")) { seenHow = true; try { localStorage.setItem("aynaghor_how", "1"); } catch (e) {} how(true); $("howClose").onclick = () => { how(false); $("howClose").onclick = () => how(false); firstNew(); }; } else firstNew(); };
  $("btnContinue").onclick = () => { const s = game.loadSave() || {}; Object.assign(game.state, s); const m = "act" + (s.act || 1); go(game.modes[m] ? m : "act1", { resume: true }); };
  document.addEventListener("pointerlockchange", () => { if (!isTouch && document.pointerLockElement !== canvas && !game.noLock && !ui.modal) game.pause(); });
  game.key = code => {
    if (!game.running) return;
    if (ui.keys) { ui.keys(code); return; }
    if (code === "Tab") ui.toggleInv();
    if (code === "KeyM") { if (game.cur && game.cur.mapMarks) ui.toggleMap(data, game.cur.mapMarks()); else ui.say("এখানে মানচিত্র কোনো কাজে আসবে না।"); }
    if (game.cur && game.cur.onKey) game.cur.onKey(code);
  };
  addEventListener("keydown", e => {
    if (e.code === "F3") { e.preventDefault(); $("debug").classList.toggle("hidden"); }
    if (e.code === "KeyH" && !ui.modal && $("howto")) $("howto").classList.contains("hidden") ? how(true) : how(false);
    if (!e.repeat) game.key(e.code);
  });
  if (isTouch) {
    $("touch").classList.remove("hidden"); $("help").classList.add("hidden"); setupTouch(player, hud);
    for (const [id, code] of [["btnE", "KeyE"], ["btnF", "KeyF"], ["btnM", "KeyM"]]) $(id).addEventListener("touchstart", e => { e.preventDefault(); game.key(code); }, { passive: false });
  }
  try { const e = JSON.parse(localStorage.getItem("aynaghor_endings") || "[]"); if (e.length) $("endCount").textContent = `দেখা সমাপ্তি: ${String(e.length).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d])}/৫`; } catch (e) {}
  setLoad(1); $("loading").classList.add("hidden"); menu(false);

  let last = performance.now(), frames = 0, t0 = last;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const cur = game.cur || game.modes.walk;
    if (game.running || !game.cur) {
      player.update(game.running ? dt : 0);
      if (game.running) { cur.update(dt); ui.tick(dt); if (cur.scene === scene) game.ambient.update(dt); }
      else world.update(dt, camera);
      const fear = cur.fear || 0;
      if (fear > 0.45) { const a = (fear - 0.45) * 0.02; camera.rotation.x += (Math.random() - 0.5) * a; camera.rotation.y += (Math.random() - 0.5) * a; }
    }
    renderer.render(cur.scene, camera);
    frames++;
    if (now - t0 >= 500) {
      game.fps = Math.round(frames * 1000 / (now - t0)); t0 = now; frames = 0;
      // dynamic resolution: keep the frame rate playable on weak GPUs
      if (game.running && !game.fixedPR) {
        if (game.fps < 28 && pr > 0.5) { pr = Math.max(0.5, pr * 0.85); renderer.setPixelRatio(pr); resize(); }
        else if (game.fps > 55 && pr < BASE_PR) { pr = Math.min(BASE_PR, pr * 1.08); renderer.setPixelRatio(pr); resize(); }
      }
      $("debug").textContent = `${game.fps} fps  res ${pr.toFixed(2)}\nx ${player.pos.x.toFixed(1)}  z ${player.pos.z.toFixed(1)}  ${game.mode || ""}\ndraw ${renderer.info.render.calls}  tri ${renderer.info.render.triangles}`;
    }
  }
  requestAnimationFrame(frame);
  game.ready = true;
}
boot().catch(err => { console.error(err); $("loadText").textContent = "লোড করা যায়নি: " + err.message; game.error = String(err); });
