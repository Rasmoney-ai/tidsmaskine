// Hand scanner: point and scan, nothing else. In VR a beam comes from the hand or controller;
// on desktop you click. Scanned objects glow faintly. Objects that cannot be scanned do not react.
import * as THREE from 'three';

const BEAM = 0xdff0f2, HOVER = 0xffb36b, GLOW = new THREE.Color(0xffd9a0);

export function buildScanner(scene, scannables) {
  const scanned = new Set();
  const hits = scannables.map((s) => s.hit);
  const raycaster = new THREE.Raycaster();
  raycaster.far = 12;

  // One beam + end dot per hand/controller (up to two).
  const beams = [0, 1].map(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: BEAM, transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: BEAM, fog: false }));
    line.frustumCulled = false; line.visible = dot.visible = false; line.renderOrder = 20;
    scene.add(line, dot);
    return { line, dot };
  });
  // A short pulse ring where something was scanned.
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), new THREE.MeshBasicMaterial({ color: HOVER, transparent: true, opacity: 0, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  pulse.renderOrder = 21; scene.add(pulse);
  let pulseT = -1;

  const glowMaterials = (obj) => {
    const mats = [];
    obj.traverse((o) => { if (o.isMesh && o.material && o.material.visible !== false) [].concat(o.material).forEach((m) => { if (m.emissive && !mats.includes(m)) mats.push(m); }); });
    return mats;
  };

  function find(origin, dir) {
    raycaster.set(origin, dir);
    const visible = hits.filter((h, i) => scannables[i].object.parent && isShown(scannables[i].object));
    const hit = raycaster.intersectObjects(visible, false)[0];
    if (!hit) return null;
    return { item: scannables[hits.indexOf(hit.object)], point: hit.point };
  }
  const isShown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

  const api = {
    scanned,
    // Try to scan along a ray (world space). Returns the item id or null.
    scanRay(origin, dir) {
      const f = find(origin, dir);
      if (!f) return null;
      if (!scanned.has(f.item.id)) {
        scanned.add(f.item.id);
        f.item.mats = glowMaterials(f.item.object);
      }
      pulse.position.copy(f.point); pulse.lookAt(origin); pulseT = 0;
      return f.item.id;
    },
    // Called each frame. rays: [{ origin, dir }] from the hands/controllers in VR (empty on desktop).
    update(t, dt, rays, active) {
      beams.forEach((b, i) => {
        const r = rays[i];
        b.line.visible = b.dot.visible = !!(active && r);
        if (!b.line.visible) return;
        const f = find(r.origin, r.dir);
        const end = f ? f.point : r.dir.clone().multiplyScalar(f ? 0 : 3).add(r.origin);
        const pos = b.line.geometry.attributes.position;
        pos.setXYZ(0, r.origin.x, r.origin.y, r.origin.z); pos.setXYZ(1, end.x, end.y, end.z); pos.needsUpdate = true;
        b.line.material.color.set(f ? HOVER : BEAM);
        b.dot.material.color.set(f ? HOVER : BEAM);
        b.dot.position.copy(end); b.dot.visible = !!f;
      });
      // Faint glow on scanned objects.
      for (const s of scannables) if (s.mats) for (const m of s.mats) { m.emissive.copy(GLOW); m.emissiveIntensity = 0.28 + 0.1 * Math.sin(t * 2.2); }
      if (pulseT >= 0) {
        pulseT += dt;
        const k = pulseT / 0.7;
        pulse.scale.setScalar(1 + k * 4); pulse.material.opacity = 0.9 * (1 - k);
        if (k >= 1) { pulseT = -1; pulse.material.opacity = 0; }
      }
    },
    // Is there a scannable object under this ray? (for the desktop cursor)
    hover(origin, dir) { return !!find(origin, dir); },
  };
  return api;
}
