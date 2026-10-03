import { useEffect, useState } from 'react';
import * as THREE from 'three';

// Sculpting runs once per page load in a worker; every Body3D shares the result.
let promise = null;

function load() {
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./body.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        worker.terminate();
        const out = {};
        for (const [name, m] of Object.entries(e.data)) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
          g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
          if (m.colors) g.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
          g.setIndex(new THREE.BufferAttribute(m.index, 1));
          g.computeBoundingSphere();
          out[name] = g;
        }
        resolve(out);
      };
      worker.onerror = (err) => {
        promise = null;
        reject(err);
      };
    });
  }
  return promise;
}

export function useBodyMeshes() {
  const [meshes, setMeshes] = useState(null);
  useEffect(() => {
    let alive = true;
    load().then((m) => alive && setMeshes(m), () => {});
    return () => {
      alive = false;
    };
  }, []);
  return meshes;
}
