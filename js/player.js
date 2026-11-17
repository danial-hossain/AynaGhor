// First-person controller: WASD + mouse look (pointer lock), Shift run, C crouch, plus touch controls.
const WALK = 3.0, RUN = 5.6, CROUCH = 1.4, RADIUS = 0.38;

export class Player {
  constructor(camera, collision, dom) {
    this.camera = camera; this.col = collision; this.dom = dom;
    this.pos = { x: 0, z: 0 }; this.yaw = 0; this.pitch = 0;
    this.vx = 0; this.vz = 0; this.eye = 1.65; this.bob = 0;
    this.keys = new Set(); this.crouch = false; this.runToggle = false;
    this.stick = { x: 0, y: 0 }; this.enabled = false; this.noise = 0; this.speed = 0;
    this.onStep = null;
    camera.rotation.order = "YXZ";

    addEventListener("keydown", e => {
      this.keys.add(e.code);
      if (e.code === "KeyC" && this.enabled && !e.repeat) this.crouch = !this.crouch;
      if (["Tab", "Space"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup", e => this.keys.delete(e.code));
    addEventListener("blur", () => this.keys.clear());
    addEventListener("mousemove", e => {
      if (document.pointerLockElement !== dom || !this.enabled) return;
      this.look(e.movementX * 0.0022, e.movementY * 0.0022);
    });
  }
  look(dx, dy) {
    this.yaw -= dx; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy));
  }
  teleport(x, z, yaw) { this.pos.x = x; this.pos.z = z; if (yaw !== undefined) this.yaw = yaw; this.vx = this.vz = 0; }
  get running() { return (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.runToggle) && !this.crouch; }

  update(dt) {
    let ix = 0, iz = 0;
    if (this.enabled) {
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iz -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iz += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
      ix += this.stick.x; iz += this.stick.y;
    }
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const max = this.crouch ? CROUCH : this.running ? RUN : WALK;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const tx = (ix * c + iz * s) * max, tz = (-ix * s + iz * c) * max;
    const k = 1 - Math.exp(-dt * 10);
    this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k;

    // move in small sub-steps so thin walls are never tunnelled
    const dist = Math.hypot(this.vx, this.vz) * dt, n = Math.max(1, Math.ceil(dist / 0.2));
    const ox = this.pos.x, oz = this.pos.z;
    for (let i = 0; i < n; i++) {
      this.pos.x += this.vx * dt / n; this.pos.z += this.vz * dt / n;
      this.col.resolve(this.pos, RADIUS);
    }
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    this.speed = moved / Math.max(dt, 1e-4);

    // head bob + footsteps
    const prev = this.bob;
    this.bob += moved * (this.crouch ? 2.4 : 1.9);
    if (Math.floor(this.bob / Math.PI) !== Math.floor(prev / Math.PI) && this.onStep) this.onStep(this.running, this.crouch);
    const amp = Math.min(1, this.speed / WALK) * (this.running ? 0.055 : 0.035);
    const target = this.crouch ? 1.0 : 1.65;
    this.eye += (target - this.eye) * (1 - Math.exp(-dt * 9));
    this.noise = this.speed < 0.3 ? 0 : this.crouch ? 0.15 : this.running ? 1 : 0.45;

    this.camera.position.set(this.pos.x, this.eye + Math.abs(Math.sin(this.bob)) * amp, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bob) * amp * 0.15);
  }
}

/** On-screen joystick + drag-to-look for phones. */
export function setupTouch(player, root) {
  const stick = root.querySelector("#stick"), knob = root.querySelector("#knob");
  const btnRun = root.querySelector("#btnRun"), btnCrouch = root.querySelector("#btnCrouch");
  let sid = null, lid = null, lx = 0, ly = 0;
  const setKnob = (x, y) => { knob.style.transform = `translate(${x * 40}px, ${y * 40}px)`; player.stick.x = x; player.stick.y = y; };
  stick.addEventListener("touchstart", e => { sid = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
  addEventListener("touchstart", e => {
    for (const t of e.changedTouches)
      if (lid === null && t.identifier !== sid && t.target && t.target.tagName === "CANVAS") { lid = t.identifier; lx = t.clientX; ly = t.clientY; }
  }, { passive: true });
  addEventListener("touchmove", e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sid) {
        const r = stick.getBoundingClientRect();
        let x = (t.clientX - (r.left + r.width / 2)) / 50, y = (t.clientY - (r.top + r.height / 2)) / 50;
        const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        setKnob(x, y);
      } else if (t.identifier === lid && player.enabled) {
        player.look((t.clientX - lx) * 0.0052, (t.clientY - ly) * 0.0045); lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; setKnob(0, 0); } if (t.identifier === lid) lid = null; } };
  addEventListener("touchend", end); addEventListener("touchcancel", end);
  btnRun.addEventListener("touchstart", e => { e.preventDefault(); player.runToggle = !player.runToggle; btnRun.classList.toggle("on", player.runToggle); }, { passive: false });
  btnCrouch.addEventListener("touchstart", e => { e.preventDefault(); player.crouch = !player.crouch; btnCrouch.classList.toggle("on", player.crouch); }, { passive: false });
}
