// Hand scanner: point and scan, nothing else. A handheld tool in VR (on the hand or controller) and
// in the corner of the view on desktop. When something is scanned, a blue hologram copy rises,
// grows and turns in front of you, then rushes into the scanner: it is now on a screen in the capsule.
import * as THREE from 'three';
import { Builder, G, MAT } from './toon.js';

const BEAM = 0xdff0f2, HOVER = 0xffb36b, GLOW = new THREE.Color(0xffd9a0), HOLO = 0x59b7ff;
const TIP = new THREE.Vector3(0, 0.012, -0.19);   // emitter tip in tool space (the tool points along -z)

// The handheld scanner: graphite body, grip, light ring at the tip and a small amber screen.
function buildTool() {
  const tool = new THREE.Group();
  const b = new Builder(1201);
  b.add(G.box(0.032, 0.1, 0.042), 0x24282e, { pos: [0, -0.045, 0.03], rot: [0.35, 0, 0] });      // grip
  b.add(G.cyl(0.021, 0.026, 0.17, 10), 0x2c3138, { pos: [0, 0.012, -0.09], rot: [Math.PI / 2, 0, 0] }); // body
  b.add(G.cyl(0.027, 0.027, 0.02, 10), 0x171a1e, { pos: [0, 0.012, -0.175], rot: [Math.PI / 2, 0, 0] }); // head
  b.add(G.box(0.03, 0.006, 0.05), 0x171a1e, { pos: [0, 0.036, -0.06] });                          // screen bezel
  const mat = MAT.cabin.clone(); mat.side = THREE.FrontSide;
  tool.add(b.mesh(mat));
  const g = new Builder(1202);
  g.add(G.box(0.022, 0.002, 0.038), HOVER, { pos: [0, 0.04, -0.06] });                             // screen
  g.add(G.box(0.004, 0.004, 0.11), 0xdff0f2, { pos: [0.022, 0.012, -0.09] });                      // side light
  tool.add(g.mesh(MAT.glow));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 4, 24), new THREE.MeshBasicMaterial({ color: 0x9fdcff, fog: false, toneMapped: false }));
  ring.position.copy(TIP);
  tool.add(ring);
  tool.userData.ring = ring;
  return tool;
}

// Blue, transparent, softly glowing copy of an object (with bright edges).
function buildHologram(object) {
  const holoMat = new THREE.MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0.45, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.95, depthWrite: false, fog: false, toneMapped: false });
  const copy = new THREE.Group();
  object.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(object.matrixWorld).invert();
  const box = new THREE.Box3();
  const extra = [];   // per-texture hologram materials
  object.traverse((o) => {
    // Skip the invisible hit volume; copy only what you can see.
    if (!o.isMesh || (!Array.isArray(o.material) && o.material.visible === false)) return;
    o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));   // this mesh only, not its children
    // Keep painted details (like the coin's inscription), tinted blue.
    const mats = [].concat(o.material).map((om) => {
      if (!om.map) return holoMat;
      const hm = holoMat.clone(); hm.map = om.map; hm.color.set(0x8fd0ff); hm.opacity = 0.75; extra.push(hm);
      return hm;
    });
    const m = new THREE.Mesh(o.geometry, Array.isArray(o.material) ? mats : mats[0]);
    m.matrixAutoUpdate = false;
    m.matrix.copy(inv).multiply(o.matrixWorld);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), edgeMat));
    copy.add(m);
  });
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.01);
  const flat = size.y < 0.3 * Math.max(size.x, size.z);
  const pivot = new THREE.Group(), inner = new THREE.Group();
  inner.add(copy); pivot.add(inner);
  pivot.renderOrder = 30;
  return { pivot, inner, holoMat, edgeMat, extra, radius, flat };
}

const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };

export function buildScanner(scene, scannables) {
  const scanned = new Set();     // scanned (the object glows)
  const collected = new Set();   // arrived in the scanner (shown in the lab)
  const hits = scannables.map((s) => s.hit);
  const raycaster = new THREE.Raycaster();
  raycaster.far = 12;
  const tool = buildTool();
  tool.visible = false;

  // One beam + end dot per hand/controller (up to two). Beam 0 starts at the scanner tip.
  const beams = [0, 1].map(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: BEAM, transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: BEAM, fog: false }));
    line.frustumCulled = false; line.visible = dot.visible = false; line.renderOrder = 20;
    scene.add(line, dot);
    return { line, dot };
  });

  const isShown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  function find(origin, dir) {
    raycaster.set(origin, dir);
    const visible = hits.filter((h, i) => isShown(scannables[i].object));
    const hit = raycaster.intersectObjects(visible, false)[0];
    return hit ? { item: scannables[hits.indexOf(hit.object)], point: hit.point } : null;
  }
  const glowMaterials = (obj) => {
    const mats = [];
    obj.traverse((o) => { if (o.isMesh && o.material) [].concat(o.material).forEach((m) => { if (m.emissive && !mats.includes(m)) mats.push(m); }); });
    return mats;
  };

  let anim = null;   // the hologram flight in progress
  let flash = 0;     // tip flash when the hologram arrives
  const tipW = new THREE.Vector3(), camPos = new THREE.Vector3(), camDir = new THREE.Vector3(), target = new THREE.Vector3();
  const qLook = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), mLook = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);

  function startHologram(item) {
    const h = buildHologram(item.object);
    item.object.updateMatrixWorld(true);
    item.object.matrixWorld.decompose(h.pivot.position, h.pivot.quaternion, new THREE.Vector3());
    h.start = h.pivot.position.clone(); h.startQ = h.pivot.quaternion.clone();
    h.size = 0.12 / h.radius;   // presented about 25 cm across
    h.t = 0; h.item = item;
    scene.add(h.pivot);
    anim = h;
  }

  const api = {
    scanned, collected, tool,
    // Try to scan along a ray (world space). Returns the item id or null.
    scanRay(origin, dir) {
      const f = find(origin, dir);
      if (!f || anim) return f ? f.item.id : null;
      if (!scanned.has(f.item.id)) {
        scanned.add(f.item.id);
        f.item.mats = glowMaterials(f.item.object);
        startHologram(f.item);
      }
      return f.item.id;
    },
    // Called each frame. rays: [{ origin, dir }] in VR (rays[0] holds the scanner). cam: the viewer's camera.
    update(t, dt, rays, active, cam) {
      tool.updateMatrixWorld(true);
      tipW.copy(TIP).applyMatrix4(tool.matrixWorld);
      beams.forEach((b, i) => {
        const r = rays[i];
        b.line.visible = b.dot.visible = !!(active && r);
        if (!b.line.visible) return;
        const f = find(r.origin, r.dir);
        const from = i === 0 && tool.visible ? tipW : r.origin;
        const end = f ? f.point : r.dir.clone().multiplyScalar(3).add(r.origin);
        const pos = b.line.geometry.attributes.position;
        pos.setXYZ(0, from.x, from.y, from.z); pos.setXYZ(1, end.x, end.y, end.z); pos.needsUpdate = true;
        b.line.material.color.set(f ? HOVER : BEAM);
        b.dot.material.color.set(f ? HOVER : BEAM);
        b.dot.position.copy(end); b.dot.visible = !!f;
      });
      // Faint glow on scanned objects.
      for (const s of scannables) if (s.mats) for (const m of s.mats) { m.emissive.copy(GLOW); m.emissiveIntensity = 0.28 + 0.1 * Math.sin(t * 2.2); }

      // Hologram: rise (0.7 s), come to the viewer (0.8 s), turn in front (1.4 s), rush into the scanner (0.5 s).
      if (anim) {
        const h = anim; h.t += dt;
        cam.getWorldPosition(camPos); cam.getWorldDirection(camDir);
        target.copy(camPos).addScaledVector(camDir, 0.55); target.y -= 0.06;
        const T1 = 0.7, T2 = 1.5, T3 = 2.9, T4 = 3.4;
        const lift = h.start.clone(); lift.y += 0.35;
        mLook.lookAt(camPos, h.pivot.position, up); qLook.setFromRotationMatrix(mLook);
        const spinA = h.t * 1.6;
        qSpin.setFromAxisAngle(up, spinA);
        let s = 1, present = 0;
        if (h.t < T1) {
          const k = smooth(h.t / T1);
          h.pivot.position.lerpVectors(h.start, lift, k); s = 1 + 0.5 * k;
          h.pivot.quaternion.copy(h.startQ).multiply(new THREE.Quaternion().setFromAxisAngle(up, spinA));
        } else if (h.t < T3) {
          const k = smooth((h.t - T1) / (T2 - T1));
          h.pivot.position.lerpVectors(lift, target, k);
          h.pivot.position.y += 0.015 * Math.sin(h.t * 3) * smooth((h.t - T2) / 0.3);
          s = 1.5 + (h.size - 1.5) * k; present = k;
          h.pivot.quaternion.copy(h.startQ).slerp(qLook, k).multiply(qSpin);
        } else {
          const k = smooth((h.t - T3) / (T4 - T3));
          h.pivot.position.lerpVectors(target, tipW, k);
          s = h.size * (1 - 0.95 * k); present = 1 - k;
          h.pivot.quaternion.copy(qLook).multiply(qSpin);
          h.holoMat.opacity = 0.45 + 0.4 * k;
        }
        // Flat objects (the coin) turn their face toward the viewer.
        h.inner.rotation.x = h.flat ? (Math.PI / 2) * present : 0.25 * present;
        h.pivot.scale.setScalar(s);
        h.holoMat.opacity = h.t < T3 ? 0.4 + 0.08 * Math.sin(h.t * 7) : h.holoMat.opacity;
        if (h.t >= T4) {
          scene.remove(h.pivot);
          h.holoMat.dispose(); h.edgeMat.dispose(); h.extra.forEach((m) => m.dispose());
          collected.add(h.item.id);
          anim = null; flash = 1;
        }
      }
      flash = Math.max(0, flash - dt * 2.5);
      const ring = tool.userData.ring;
      ring.scale.setScalar(1 + flash * 0.8);
      ring.material.color.setRGB(0.62 + 0.38 * flash, 0.86 + 0.14 * flash, 1);
    },
    // Is there a scannable object under this ray? (for the desktop cursor)
    hover(origin, dir) { return !!find(origin, dir); },
    get busy() { return !!anim; },
  };
  return api;
}
