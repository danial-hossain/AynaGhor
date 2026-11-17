import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Collision } from "./collision.js";
import { Player, setupTouch } from "./player.js";
import { buildWorld } from "./world.js";
import { GameAudio } from "./audio.js";

const $ = id => document.getElementById(id);
const canvas = $("c"), overlay = $("overlay"), hud = $("hud");
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.12, 900);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

const audio = new GameAudio();
const game = window.__game = { ready: false, running: false, fps: 0, scene, camera, renderer };

const setLoad = (f, text) => { $("bar").firstElementChild.style.width = Math.round(f * 100) + "%"; if (text) $("loadText").textContent = text; };

async function boot() {
  const fontsReady = Promise.race([
    Promise.all([document.fonts.load('700 64px "Hind Siliguri"', "আয়নাঘর"), document.fonts.load('400 16px "Hind Siliguri"', "আ")]),
    new Promise(r => setTimeout(r, 4000))]);
  const [data, gltf] = await Promise.all([
    fetch("assets/mirpur.json").then(r => { if (!r.ok) throw new Error("mirpur.json " + r.status); return r.json(); }),
    new Promise((res, rej) => new GLTFLoader().load("assets/mirpur.glb", res, e => { if (e.total) setLoad(0.1 + 0.7 * e.loaded / e.total); }, rej)),
    fontsReady]);
  setLoad(0.85, "রাস্তা সাজানো হচ্ছে…");
  await new Promise(r => setTimeout(r, 30));

  const collision = new Collision(data);
  const world = buildWorld(scene, data, gltf, collision);
  const player = new Player(camera, collision, canvas);
  player.teleport(data.spawn.x, data.spawn.z, Math.atan2(data.spawn.x, data.spawn.z));
  player.onStep = (run, crouch) => audio.step(run, crouch);
  Object.assign(game, { data, world, player, collision });

  // landmark name toasts
  const lm = data.landmarks, places = [
    { n: "মিরপুর ১০ গোলচত্বর", x: 0, z: 0, r: 32 },
    lm.station && { n: "মিরপুর ১০ মেট্রো স্টেশন", x: lm.station.x, z: lm.station.z, r: 45 },
    lm.stadium && { n: "শের-ই-বাংলা স্টেডিয়াম", x: lm.stadium[0], z: lm.stadium[1], r: 170 }].filter(Boolean);
  let here = null, toastT = 0;
  const toast = t => { $("toast").textContent = t; $("toast").classList.add("show"); toastT = 3.5; };

  function start() {
    overlay.classList.add("hidden"); hud.classList.remove("hidden");
    player.enabled = true; game.running = true; audio.start();
    if (!isTouch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  }
  function pause() {
    if (!game.running) return;
    player.enabled = false; game.running = false; overlay.classList.remove("hidden");
    $("start").textContent = "চালিয়ে যান";
  }
  game.start = start; game.pause = pause;
  $("start").addEventListener("click", start);
  document.addEventListener("pointerlockchange", () => { if (!isTouch && document.pointerLockElement !== canvas && !game.noLock) pause(); });
  addEventListener("keydown", e => { if (e.code === "F3") { e.preventDefault(); $("debug").classList.toggle("hidden"); } });
  if (isTouch) { $("touch").classList.remove("hidden"); $("help").classList.add("hidden"); setupTouch(player, hud); }

  setLoad(1); $("loading").classList.add("hidden"); $("start").classList.remove("hidden");

  let last = performance.now(), acc = 0, frames = 0, t0 = last;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    player.update(dt); world.update(dt, camera);
    renderer.render(scene, camera);
    frames++;
    if (now - t0 >= 500) {
      game.fps = Math.round(frames * 1000 / (now - t0)); t0 = now; frames = 0;
      $("debug").textContent = `${game.fps} fps\nx ${player.pos.x.toFixed(1)}  z ${player.pos.z.toFixed(1)}\ndraw ${renderer.info.render.calls}  tri ${renderer.info.render.triangles}`;
    }
    if (game.running) {
      $("stance").textContent = player.crouch ? "বসে চলছেন" : player.running && player.speed > 3.5 ? "দৌড়াচ্ছেন" : "";
      const p = places.find(q => Math.hypot(player.pos.x - q.x, player.pos.z - q.z) < q.r) || null;
      if (p !== here) { here = p; if (p) toast(p.n); }
      if (toastT > 0 && (toastT -= dt) <= 0) $("toast").classList.remove("show");
    }
  }
  requestAnimationFrame(frame);
  game.ready = true;
}
boot().catch(err => { console.error(err); $("loadText").textContent = "লোড করা যায়নি: " + err.message; game.error = String(err); });
