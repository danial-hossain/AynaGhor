// Low-poly street props built from primitives, merged into one vertex-coloured geometry each (for InstancedMesh).
// All vehicles face local +Z.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  M.compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(M);
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, s = 8) => new THREE.CylinderGeometry(r, r, h, s);
const wheel = (r, x, z) => part(new THREE.TorusGeometry(r, 0.035, 5, 12), 0x111111, x, r + 0.035, z, 0, Math.PI / 2, 0);
const TINT = 0xffffff;   // parts in this colour take the per-instance tint

export function rickshawGeo() {
  return mergeGeometries([
    wheel(0.34, -0.48, -0.45), wheel(0.34, 0.48, -0.45), wheel(0.34, 0, 1.0),
    part(box(0.95, 0.3, 0.62), 0x7a1f1f, 0, 0.66, -0.42),                     // seat
    part(box(0.95, 0.5, 0.08), TINT, 0, 0.95, -0.74),                         // painted back panel
    part(box(0.86, 0.05, 0.55), 0x3a3026, 0, 0.44, 0.08),                     // footboard
    part(new THREE.CylinderGeometry(0.56, 0.56, 0.96, 8, 1, true, 0, Math.PI), TINT, 0, 0.95, -0.42, 0, 0, Math.PI / 2), // hood
    part(box(0.05, 0.05, 1.25), 0x222222, 0, 0.6, 0.42),                      // frame
    part(box(0.05, 0.75, 0.05), 0x222222, 0, 0.72, 1.0, 0.25),                // fork
    part(box(0.5, 0.04, 0.04), 0x222222, 0, 1.08, 0.9),                       // handlebar
    part(box(0.2, 0.06, 0.26), 0x151515, 0, 0.92, 0.35),                      // saddle
    part(box(0.04, 0.4, 0.04), 0x222222, 0, 0.74, 0.35),
  ]);
}
export function cngGeo() {
  const w = (x, z) => part(cyl(0.22, 0.12, 10), 0x0c0c0c, x, 0.22, z, 0, 0, Math.PI / 2);
  return mergeGeometries([
    w(-0.6, -0.75), w(0.6, -0.75), w(0, 1.05),
    part(box(1.3, 0.95, 1.9), TINT, 0, 0.78, -0.15),                          // body
    part(box(0.9, 0.7, 0.6), TINT, 0, 0.65, 1.0),                             // nose
    part(box(1.34, 0.45, 1.5), 0x10151a, 0, 1.38, -0.2),                      // caged window band
    part(box(1.4, 0.07, 2.2), 0x1c1c1c, 0, 1.64, 0.0),                        // roof
    part(box(0.8, 0.4, 0.05), 0x30404a, 0, 1.3, 0.72, -0.25),                 // windshield
    part(box(0.16, 0.1, 0.05), 0xfff0c0, 0, 0.75, 1.31),                      // headlamp
  ]);
}
export function vanGeo() {
  return mergeGeometries([
    wheel(0.34, -0.5, -0.5), wheel(0.34, 0.5, -0.5), wheel(0.34, 0, 1.0),
    part(box(1.1, 0.07, 1.7), 0x6b5236, 0, 0.6, -0.45),                       // wooden flatbed
    part(box(1.1, 0.12, 0.05), TINT, 0, 0.66, -1.3),
    part(box(0.05, 0.05, 1.25), 0x222222, 0, 0.58, 0.45),
    part(box(0.05, 0.75, 0.05), 0x222222, 0, 0.72, 1.0, 0.25),
    part(box(0.5, 0.04, 0.04), 0x222222, 0, 1.08, 0.9),
    part(box(0.2, 0.06, 0.26), 0x151515, 0, 0.92, 0.38),
  ]);
}
export function teaStallGeo() {
  const pole = (x, z) => part(cyl(0.035, 2.15, 5), 0x4a3a2a, x, 1.075, z);
  return mergeGeometries([
    part(box(1.9, 0.9, 0.7), 0x5c4026, 0, 0.45, 0),                           // counter
    part(box(1.9, 0.04, 0.78), 0x8a6a44, 0, 0.92, 0),
    pole(-1.0, -0.6), pole(1.0, -0.6), pole(-1.0, 0.75), pole(1.0, 0.75),
    part(box(2.4, 0.05, 1.7), TINT, 0, 2.18, 0.08, 0.1),                      // tin roof
    part(box(1.9, 0.9, 0.06), 0x3d2c1c, 0, 1.55, -0.55),                      // back shelf
    part(box(1.7, 0.03, 0.22), 0x8a6a44, 0, 1.45, -0.42),
    part(new THREE.SphereGeometry(0.16, 7, 5), 0xb9b9b4, -0.55, 1.08, 0),     // kettle
    part(cyl(0.12, 0.2, 7), 0x333333, 0.5, 1.04, 0.05),                       // stove
    part(box(0.5, 0.25, 0.3), 0xc9b458, 0.2, 1.6, -0.42),                     // biscuit jars
    part(box(1.5, 0.05, 0.28), 0x6b5236, 0, 0.42, 1.05),                      // bench
    part(box(0.06, 0.42, 0.24), 0x4a3a2a, -0.65, 0.21, 1.05), part(box(0.06, 0.42, 0.24), 0x4a3a2a, 0.65, 0.21, 1.05),
  ]);
}
export function lampGeo() {       // arm points to local +Z
  return mergeGeometries([
    part(cyl(0.075, 7.2, 6), 0x3a3d40, 0, 3.6, 0),
    part(box(0.07, 0.07, 1.7), 0x3a3d40, 0, 7.15, 0.8),
    part(box(0.3, 0.1, 0.6), 0x2a2a2a, 0, 7.12, 1.55),
  ]);
}
export function poleGeo() {
  return mergeGeometries([
    part(cyl(0.12, 8.6, 6), 0x6f6f6a, 0, 4.3, 0),
    part(box(1.7, 0.09, 0.09), 0x4a4038, 0, 8.1, 0),
    part(box(1.3, 0.09, 0.09), 0x4a4038, 0, 7.3, 0),
    part(box(0.5, 0.7, 0.4), 0x4d5358, 0.3, 6.3, 0),                          // transformer / junction box
    part(box(0.05, 1.1, 0.3), 0x2c2c2c, -0.14, 5.4, 0),
  ]);
}
export function monumentGeo() {   // golchottor centrepiece
  return mergeGeometries([
    part(cyl(6.2, 0.45, 24), 0x77736c, 0, 0.225, 0),
    part(cyl(5.6, 0.2, 24), 0x254a22, 0, 0.55, 0),
    part(cyl(1.6, 0.7, 8), 0x8d8a84, 0, 1.0, 0),
    part(cyl(1.0, 0.6, 8), 0x9a968f, 0, 1.65, 0),
    part(new THREE.CylinderGeometry(0.28, 0.55, 5.2, 4), 0xb9b5ac, 0, 4.5, 0, 0, Math.PI / 4),
    part(new THREE.OctahedronGeometry(0.7), 0xd8c9a0, 0, 7.6, 0),
  ]);
}

export function treeGeo() {
  return mergeGeometries([
    part(cyl(0.16, 2.6, 6), 0x3a2a1c, 0, 1.3, 0),
    part(new THREE.IcosahedronGeometry(1.7, 0), TINT, 0, 3.6, 0),
    part(new THREE.IcosahedronGeometry(1.2, 0), TINT, 0.9, 3.0, 0.4, 0.5, 1, 0),
    part(new THREE.IcosahedronGeometry(1.1, 0), TINT, -0.8, 3.2, -0.5, 1, 0.3, 0),
  ]);
}
export function tankGeo() {      // rooftop water tank on a small stand
  return mergeGeometries([
    part(cyl(0.75, 1.3, 10), 0x1a1a1c, 0, 1.45, 0), part(cyl(0.3, 0.12, 8), 0x1a1a1c, 0, 2.16, 0),
    part(box(1.3, 0.8, 1.3), 0x77736c, 0, 0.4, 0),
  ]);
}
