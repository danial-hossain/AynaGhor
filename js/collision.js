// 2D collision against building footprints (polygons), pillars and round props, using a uniform grid.
const CELL = 20;
const key = (gx, gz) => (gx + 2048) * 4096 + (gz + 2048);

export class Collision {
  constructor(data) {
    this.grid = new Map();
    this.polys = [];     // Float32Array [x0,z0,x1,z1,...]
    this.circles = [];   // [x, z, r]
    this.bounds = data.bounds; this.margin = data.margin ?? 6;
    for (const b of data.buildings) this.addPoly(Float32Array.from(b.slice(1)));
    for (const [x, z] of data.pillars) this.addPoly(Float32Array.from([x - 1, z - 1, x + 1, z - 1, x + 1, z + 1, x - 1, z + 1]));
  }
  _put(minx, minz, maxx, maxz, ref) {
    for (let gx = Math.floor(minx / CELL); gx <= Math.floor(maxx / CELL); gx++)
      for (let gz = Math.floor(minz / CELL); gz <= Math.floor(maxz / CELL); gz++) {
        const k = key(gx, gz); let a = this.grid.get(k);
        if (!a) this.grid.set(k, a = []);
        a.push(ref);
      }
  }
  addPoly(p) {
    let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9;
    for (let i = 0; i < p.length; i += 2) { minx = Math.min(minx, p[i]); maxx = Math.max(maxx, p[i]); minz = Math.min(minz, p[i + 1]); maxz = Math.max(maxz, p[i + 1]); }
    this.polys.push(p); this._put(minx, minz, maxx, maxz, this.polys.length - 1);
  }
  addCircle(x, z, r) {
    this.circles.push([x, z, r]); this._put(x - r, z - r, x + r, z + r, -this.circles.length);
  }
  inside(x, z, p) {
    let c = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2)
      if ((p[i + 1] > z) !== (p[j + 1] > z) && x < (p[j] - p[i]) * (z - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
    return c;
  }
  /** True if the point is inside any solid. */
  blocked(x, z) {
    const a = this.grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!a) return false;
    for (const ref of a) {
      if (ref >= 0) { if (this.inside(x, z, this.polys[ref])) return true; }
      else { const c = this.circles[-ref - 1]; if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < c[2] * c[2]) return true; }
    }
    return false;
  }
  /** Push a circle (pos.x, pos.z, radius r) out of all solids. Mutates pos. */
  resolve(pos, r) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const seen = new Set();
      for (let gx = Math.floor((pos.x - r) / CELL); gx <= Math.floor((pos.x + r) / CELL); gx++)
        for (let gz = Math.floor((pos.z - r) / CELL); gz <= Math.floor((pos.z + r) / CELL); gz++) {
          const a = this.grid.get(key(gx, gz));
          if (!a) continue;
          for (const ref of a) {
            if (seen.has(ref)) continue; seen.add(ref);
            if (ref < 0) {
              const c = this.circles[-ref - 1]; const dx = pos.x - c[0], dz = pos.z - c[1]; const d = Math.hypot(dx, dz), m = c[2] + r;
              if (d < m) { const k = d > 1e-4 ? m / d : 1; pos.x = c[0] + (d > 1e-4 ? dx * k : m); pos.z = c[1] + dz * k; moved = true; }
              continue;
            }
            const p = this.polys[ref];
            let bd = 1e9, bx = 0, bz = 0;
            for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
              const ax = p[j], az = p[j + 1], ex = p[i] - ax, ez = p[i + 1] - az;
              const t = Math.max(0, Math.min(1, ((pos.x - ax) * ex + (pos.z - az) * ez) / (ex * ex + ez * ez + 1e-9)));
              const cx = ax + ex * t, cz = az + ez * t, d = Math.hypot(pos.x - cx, pos.z - cz);
              if (d < bd) { bd = d; bx = cx; bz = cz; }
            }
            const ins = this.inside(pos.x, pos.z, p);
            if (ins || bd < r) {
              let nx = pos.x - bx, nz = pos.z - bz; const l = Math.hypot(nx, nz);
              if (l < 1e-5) continue;
              nx /= l; nz /= l;
              if (ins) { pos.x = bx - nx * r; pos.z = bz - nz * r; }     // go through the nearest wall to the outside
              else { pos.x = bx + nx * r; pos.z = bz + nz * r; }
              moved = true;
            }
          }
        }
      if (!moved) break;
    }
    const b = this.bounds, m = this.margin;
    pos.x = Math.max(b[0] + m, Math.min(b[2] - m, pos.x));
    pos.z = Math.max(b[1] + m, Math.min(b[3] - m, pos.z));
  }
}
