// All sound is synthesised with the Web Audio API (no audio files).
export class GameAudio {
  constructor() { this.ctx = null; this.timers = []; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // distant generator hum
    const hum = ctx.createGain(); hum.gain.value = 0.035; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 160;
    for (const f of [49, 50.6, 99.5]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7.3; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(hum.gain); lfo.start();
    lp.connect(hum); hum.connect(this.master);

    // night air
    const air = ctx.createBufferSource(); air.buffer = buf; air.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 420; const ag = ctx.createGain(); ag.gain.value = 0.02;
    air.connect(bp); bp.connect(ag); ag.connect(this.master); air.start();

    const loop = (fn, min, max) => { const go = () => { fn(); this.timers.push(setTimeout(go, (min + Math.random() * (max - min)) * 1000)); }; this.timers.push(setTimeout(go, (min * 0.5 + Math.random() * min) * 1000)); };
    loop(() => this.dog(), 9, 26); loop(() => this.bell(), 14, 40);
  }
  _pan(v) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = v; p.connect(this.master); return p; }
  _burst(dur, freq, q, gain, dest, type = "bandpass") {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.6 + Math.random() * 0.8;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(), t = ctx.currentTime; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  step(running, crouch) {
    if (!this.ctx) return;
    const g = crouch ? 0.04 : running ? 0.22 : 0.11;
    this._burst(0.09, 180 + Math.random() * 80, 1.2, g, null, "lowpass"); this._burst(0.05, 1800 + Math.random() * 900, 2, g * 0.25);
  }
  dog() {
    if (!this.ctx) return; const ctx = this.ctx, out = this._pan(Math.random() * 1.6 - 0.8), far = ctx.createBiquadFilter();
    far.type = "lowpass"; far.frequency.value = 700 + Math.random() * 500; far.connect(out);
    const n = 2 + Math.floor(Math.random() * 3), base = 280 + Math.random() * 120; let t = ctx.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth";
      o.frequency.setValueAtTime(base * 1.5, t); o.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.14);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g); g.connect(far); o.start(t); o.stop(t + 0.2); t += 0.26 + Math.random() * 0.25;
    }
  }
  bell() {
    if (!this.ctx) return; const ctx = this.ctx, out = this._pan(Math.random() * 1.6 - 0.8); let t = ctx.currentTime + 0.05;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      for (const f of [2150, 2890, 4300]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
        g.gain.setValueAtTime(0.018, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4);
      }
      t += 0.16 + Math.random() * 0.08;
    }
  }
}
