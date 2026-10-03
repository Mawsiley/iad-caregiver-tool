// Procedurally sculpted older-adult body.
// The body is a signed distance field (SDF) built from ~60 smoothly blended
// primitives, then meshed with marching cubes. Smooth blending gives one
// continuous, organic skin surface instead of separate mannequin parts.
// Figure faces +Z, the figure's LEFT is +X, units are metres, feet at y = 0.
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';
import { REGION_INDEX } from '../data/knowledge.js';

/* ───────── SDF primitives ───────── */
function ellipsoid(c, r) {
  const [cx, cy, cz] = c;
  const [rx, ry, rz] = r;
  const rmin = Math.min(rx, ry, rz);
  return {
    c, R: Math.max(rx, ry, rz),
    f(x, y, z) {
      const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
      const k0 = Math.sqrt(px * px + py * py + pz * pz);
      const qx = px / rx, qy = py / ry, qz = pz / rz;
      const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
      return k1 === 0 ? -rmin : (k0 * (k0 - 1)) / k1;
    },
  };
}
const sphere = (c, r) => ellipsoid(c, [r, r, r]);

// Capsule whose radius tapers from r1 (at a) to r2 (at b).
function cone(a, b, r1, r2) {
  const [ax, ay, az] = a;
  const bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az;
  const bb = bx * bx + by * by + bz * bz;
  return {
    c: [ax + bx / 2, ay + by / 2, az + bz / 2],
    R: Math.sqrt(bb) / 2 + Math.max(r1, r2),
    f(x, y, z) {
      const px = x - ax, py = y - ay, pz = z - az;
      let h = (px * bx + py * by + pz * bz) / bb;
      h = h < 0 ? 0 : h > 1 ? 1 : h;
      const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
    },
  };
}

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
const smax = (a, b, k) => -smin(-a, -b, k);

/* ───────── Anatomy ───────── */
const SIDES = [1, -1];

// Every primitive carries an anatomical tag; regionFor() turns tag + position into a body region.
function torsoParts(add) {
  add(ellipsoid([0, 1.285, -0.006], [0.152, 0.15, 0.098]), 0.05, 'thorax'); // rib cage
  add(ellipsoid([0, 1.375, -0.012], [0.165, 0.055, 0.08]), 0.05, 'thorax'); // shoulder girdle
  for (const s of SIDES) {
    add(ellipsoid([s * 0.064, 1.29, 0.048], [0.068, 0.055, 0.045]), 0.04, 'thorax'); // chest
    add(cone([s * 0.04, 1.45, -0.03], [s * 0.16, 1.39, -0.02], 0.04, 0.035), 0.04, 'trap'); // trapezius
    add(ellipsoid([s * 0.176, 1.37, -0.01], [0.06, 0.056, 0.06]), 0.04, 'deltoid');
  }
  add(ellipsoid([0, 1.1, 0.02], [0.145, 0.15, 0.12]), 0.06, 'belly'); // soft belly
  add(ellipsoid([0, 1.0, 0], [0.15, 0.08, 0.105]), 0.05, 'belly'); // waist
}

function pelvisParts(add) {
  add(ellipsoid([0, 0.89, -0.006], [0.163, 0.11, 0.108]), 0.05, 'pelvis'); // pelvis / hips
  for (const s of SIDES) add(ellipsoid([s * 0.066, 0.842, -0.055], [0.084, 0.094, 0.074]), 0.04, 'buttock');
  add(ellipsoid([0, 0.825, 0.04], [0.085, 0.065, 0.058]), 0.04, 'pubis'); // lower belly
}

const UPPER_ARM = (s) => [[s * 0.185, 1.36, -0.012], [s * 0.228, 1.09, -0.028]];

function bodyPrims() {
  const P = [];
  const add = (prim, k, tag) => P.push({ ...prim, k, tag });

  // Head & face
  add(ellipsoid([0, 1.615, -0.008], [0.079, 0.097, 0.097]), 0.02, 'cranium');
  add(ellipsoid([0, 1.565, 0.018], [0.066, 0.068, 0.075]), 0.03, 'face'); // face / jaw
  add(ellipsoid([0, 1.518, 0.05], [0.03, 0.024, 0.03]), 0.02, 'face'); // chin
  for (const s of SIDES) {
    add(ellipsoid([s * 0.042, 1.578, 0.052], [0.028, 0.026, 0.03]), 0.02, 'face'); // cheeks
    add(ellipsoid([s * 0.08, 1.6, -0.008], [0.012, 0.03, 0.02]), 0.008, 'cranium'); // ears
  }
  add(cone([0, 1.618, 0.084], [0, 1.58, 0.106], 0.01, 0.015), 0.012, 'face'); // nose bridge → tip
  add(ellipsoid([0, 1.578, 0.098], [0.019, 0.011, 0.013]), 0.008, 'face'); // nostrils
  add(cone([-0.045, 1.632, 0.074], [0.045, 1.632, 0.074], 0.011, 0.011), 0.015, 'face'); // brow ridge
  add(ellipsoid([0, 1.549, 0.08], [0.022, 0.008, 0.012]), 0.006, 'face'); // lips

  // Neck & trunk
  add(cone([0, 1.46, -0.012], [0, 1.56, -0.006], 0.058, 0.048), 0.03, 'neck');
  torsoParts(add);
  pelvisParts(add);

  for (const s of SIDES) {
    // Arm
    const [sh, el] = UPPER_ARM(s);
    add(cone(sh, el, 0.05, 0.038), 0.03, 'upperArm');
    add(ellipsoid([s * 0.202, 1.24, 0.002], [0.04, 0.08, 0.042]), 0.03, 'upperArm'); // biceps
    add(cone(el, [s * 0.258, 0.855, -0.002], 0.039, 0.026), 0.025, 'forearm');
    add(ellipsoid([s * 0.235, 1.025, -0.014], [0.038, 0.075, 0.036]), 0.03, 'forearm');
    // Hand, palm facing the thigh
    add(ellipsoid([s * 0.264, 0.8, 0.008], [0.017, 0.05, 0.037]), 0.015, 'hand');
    [[0.03, 0.058], [0.012, 0.064], [-0.006, 0.062], [-0.022, 0.05]].forEach(([z, len]) =>
      add(cone([s * 0.265, 0.765, z], [s * 0.268, 0.765 - len, z + 0.002], 0.0085, 0.0072), 0.006, 'hand')
    );
    add(cone([s * 0.258, 0.815, 0.034], [s * 0.254, 0.765, 0.055], 0.011, 0.009), 0.008, 'hand'); // thumb

    // Leg
    add(cone([s * 0.088, 0.86, 0], [s * 0.122, 0.47, 0.006], 0.088, 0.054), 0.025, 'thigh');
    add(ellipsoid([s * 0.108, 0.68, 0.014], [0.066, 0.14, 0.068]), 0.035, 'thigh'); // thigh muscle
    add(ellipsoid([s * 0.122, 0.47, 0.012], [0.05, 0.05, 0.052]), 0.025, 'knee');
    add(ellipsoid([s * 0.122, 0.474, 0.05], [0.024, 0.028, 0.018]), 0.015, 'knee'); // kneecap
    add(cone([s * 0.123, 0.46, 0], [s * 0.132, 0.09, -0.01], 0.05, 0.031), 0.03, 'lowerLeg'); // shin
    add(ellipsoid([s * 0.126, 0.34, -0.03], [0.048, 0.09, 0.048]), 0.035, 'lowerLeg'); // calf
    add(sphere([s * 0.132, 0.075, -0.01], 0.034), 0.02, 'ankle');
    add(cone([s * 0.132, 0.04, -0.035], [s * 0.14, 0.022, 0.12], 0.034, 0.021), 0.025, 'foot');
    add(ellipsoid([s * 0.136, 0.03, 0.04], [0.04, 0.03, 0.09]), 0.025, 'foot');
  }
  return P;
}

// Anatomical tag + surface position → body region id (see REGIONS in data/knowledge.js).
function regionFor(tag, x, y, z) {
  const ax = Math.abs(x);
  const s = x >= 0 ? 'L' : 'R';
  const nearElbow = Math.hypot(ax - 0.228, y - 1.09, z + 0.028) < 0.055;
  const nearKnee = Math.hypot(ax - 0.122, y - 0.47) < 0.07;
  const nearAnkle = Math.hypot(ax - 0.132, y - 0.075) < 0.05;
  switch (tag) {
    case 'cranium': return z > 0.045 && y < 1.665 ? 'face' : 'head';
    case 'face': return 'face';
    case 'neck': return 'neck';
    case 'thorax':
      if (ax > 0.15 && y > 1.3) return 'shoulder' + s;
      return z >= 0 ? 'chest' : 'upperBack';
    case 'trap': return z < -0.012 ? 'upperBack' : ax < 0.09 ? 'neck' : 'shoulder' + s;
    case 'deltoid': return 'shoulder' + s;
    case 'belly': return z >= 0 ? 'abdomen' : y < 1.11 ? 'lowerBack' : 'upperBack';
    case 'pelvis':
    case 'buttock':
    case 'pubis':
      if (ax > 0.13 && z > -0.06) return 'hip' + s;
      if (z < -0.02) return y > 0.915 ? 'lowerBack' : 'buttock' + s;
      return y > 0.86 ? 'abdomen' : 'groin';
    case 'upperArm': return nearElbow ? 'elbow' + s : 'upperArm' + s;
    case 'forearm': return nearElbow ? 'elbow' + s : 'forearm' + s;
    case 'hand': return 'hand' + s;
    case 'thigh':
      if (nearKnee) return 'knee' + s;
      if (y > 0.76 && ax < 0.07) return 'groin';
      if (y > 0.79 && z < -0.03) return 'buttock' + s;
      if (y > 0.79 && ax > 0.15) return 'hip' + s;
      return 'thigh' + s;
    case 'knee': return 'knee' + s;
    case 'lowerLeg': return nearKnee ? 'knee' + s : nearAnkle ? 'ankle' + s : 'lowerLeg' + s;
    case 'ankle': return 'ankle' + s;
    case 'foot': return z < -0.008 && y < 0.075 ? 'heel' + s : nearAnkle && y > 0.05 ? 'ankle' + s : 'foot' + s;
    default: return null;
  }
}

function assignRegions(positions, prims) {
  const region = new Float32Array(positions.length / 3);
  const sums = {};
  for (let v = 0, i = 0; v < positions.length; v += 3, i++) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    let best = Infinity, tag = null;
    for (const p of prims) {
      const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) - p.R > best) continue;
      const d = p.f(x, y, z);
      if (d < best) { best = d; tag = p.tag; }
    }
    const id = regionFor(tag, x, y, z);
    const idx = id ? REGION_INDEX[id] || 0 : 0;
    region[i] = idx;
    if (idx) {
      const s = (sums[id] ||= [0, 0, 0, 0]);
      s[0] += x; s[1] += y; s[2] += z; s[3]++;
    }
  }
  const centers = {};
  for (const [id, [sx, sy, sz, n]] of Object.entries(sums)) centers[id] = [sx / n, sy / n, sz / n];
  return { region, centers };
}
const EYE_SOCKETS = SIDES.map((s) => sphere([s * 0.032, 1.612, 0.086], 0.017));
const LIPS = ellipsoid([0, 1.549, 0.08], [0.022, 0.008, 0.012]);

/* ───────── Field evaluation with culling ───────── */
// Primitives are bucketed by height; a sample only looks at primitives whose bounds
// come within REACH of it. Farther primitives can't change the sign of the field and
// are irrelevant within the near-surface band where exact distances matter.
const REACH = 0.07;
const BUCKET = 0.01;

function makeField(prims, post) {
  const nb = Math.ceil(1.8 / BUCKET);
  const buckets = Array.from({ length: nb }, (_, b) => {
    const y0 = b * BUCKET - 0.05, y1 = y0 + BUCKET;
    return prims.filter((p) => p.c[1] - p.R - REACH < y1 && p.c[1] + p.R + REACH > y0);
  });
  return function field(x, y, z) {
    let d = 1e9;
    const list = buckets[Math.min(nb - 1, Math.max(0, Math.floor((y + 0.05) / BUCKET)))];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2];
      // Skip primitives that can't affect the blend at this point.
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) - p.R > d + p.k) continue;
      d = smin(d, p.f(x, y, z), p.k);
    }
    return post ? post(d, x, y, z) : d;
  };
}

const bodyPost = (d, x, y, z) => {
  for (const e of EYE_SOCKETS) d = smax(d, -e.f(x, y, z), 0.01);
  return Math.max(d, -y);
};

/* ───────── Marching cubes (welded vertices, SDF-gradient normals) ───────── */
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

function polygonize(field, min, max, step, keepTri) {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1;
  const ny = Math.ceil((max[1] - min[1]) / step) + 1;
  const nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const vals = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => (i * ny + j) * nz + k;

  // Sparse sampling: evaluate a coarse grid first, then only refine near the surface.
  const S = 4;
  const cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let i = 0; i < cx; i++)
    for (let j = 0; j < cy; j++)
      for (let k = 0; k < cz; k++)
        coarse[(i * cy + j) * cz + k] = field(min[0] + i * S * step, min[1] + j * S * step, min[2] + k * S * step);
  const band = S * step * 1.8;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      for (let k = 0; k < nz; k++) {
        const dc = coarse[(Math.round(i / S) * cy + Math.round(j / S)) * cz + Math.round(k / S)];
        vals[id(i, j, k)] = Math.abs(dc) > band ? dc : field(min[0] + i * step, min[1] + j * step, min[2] + k * step);
      }

  const pos = [];
  const tris = [];
  const cache = new Map();
  const cv = new Float32Array(8);
  const cidx = new Int32Array(8);
  const edgeVert = new Int32Array(12);

  for (let i = 0; i < nx - 1; i++)
    for (let j = 0; j < ny - 1; j++)
      for (let k = 0; k < nz - 1; k++) {
        let cube = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c];
          cidx[c] = id(i + o[0], j + o[1], k + o[2]);
          cv[c] = vals[cidx[c]];
          if (cv[c] > 0) cube |= 1 << c;
        }
        const bits = edgeTable[cube];
        if (!bits) continue;
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const [a, b] = EDGES[e];
          const ia = cidx[a], ib = cidx[b];
          const lo = ia < ib ? ia : ib;
          const diff = ia < ib ? ib - ia : ia - ib;
          const key = lo * 3 + (diff === 1 ? 0 : diff === nz ? 1 : 2);
          let v = cache.get(key);
          if (v === undefined) {
            const t = cv[a] / (cv[a] - cv[b]);
            const oa = CORNERS[a], ob = CORNERS[b];
            v = pos.length / 3;
            pos.push(
              min[0] + (i + oa[0] + (ob[0] - oa[0]) * t) * step,
              min[1] + (j + oa[1] + (ob[1] - oa[1]) * t) * step,
              min[2] + (k + oa[2] + (ob[2] - oa[2]) * t) * step
            );
            cache.set(key, v);
          }
          edgeVert[e] = v;
        }
        const base = cube << 4;
        for (let t = 0; triTable[base + t] !== -1; t += 3) {
          const v0 = edgeVert[triTable[base + t]];
          const v1 = edgeVert[triTable[base + t + 1]];
          const v2 = edgeVert[triTable[base + t + 2]];
          if (keepTri && !keepTri(pos, v0, v1, v2)) continue;
          tris.push(v0, v1, v2);
        }
      }

  const positions = new Float32Array(pos);
  const normals = new Float32Array(positions.length);
  const h = step * 0.5;
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    let gx = field(x + h, y, z) - field(x - h, y, z);
    let gy = field(x, y + h, z) - field(x, y - h, z);
    let gz = field(x, y, z + h) - field(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    normals[v] = gx / l;
    normals[v + 1] = gy / l;
    normals[v + 2] = gz / l;
  }
  return { positions, normals, index: new Uint32Array(tris) };
}

/* ───────── Colours ───────── */
// Vertex colours are in linear space; convert from sRGB hex.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hex = (h) => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
const SKIN = hex('#c98e70');
const SKIN_WARM = hex('#bf7564');
const LIP = hex('#b0675f');
const BROW = hex('#a9a6a3');

function skinColors(positions) {
  const col = new Float32Array(positions.length);
  const warmSpots = [
    ...SIDES.map((s) => [s * 0.122, 0.474, 0.05, 0.045]), // knees
    ...SIDES.map((s) => [s * 0.228, 1.09, -0.05, 0.04]), // elbows
    ...SIDES.map((s) => [s * 0.044, 1.575, 0.07, 0.03]), // cheeks
    [0, 1.585, 0.11, 0.02], // nose tip
  ];
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v], y = positions[v + 1], z = positions[v + 2];
    let c = SKIN;
    let warm = 0;
    for (const [wx, wy, wz, r] of warmSpots) {
      const d = Math.hypot(x - wx, y - wy, z - wz);
      if (d < r) warm = Math.max(warm, 1 - d / r);
    }
    c = c.map((ch, i) => ch + (SKIN_WARM[i] - ch) * warm * 0.55);
    if (LIPS.f(x, y, z) < 0.004) c = LIP;
    const ax = Math.abs(x);
    if (y > 1.627 && y < 1.643 && z > 0.062 && ax > 0.012 && ax < 0.056) c = BROW;
    col[v] = c[0];
    col[v + 1] = c[1];
    col[v + 2] = c[2];
  }
  return col;
}

/* ───────── Clothing & hair ───────── */
function shirtField() {
  const P = [];
  const add = (prim, k) => P.push({ ...prim, k });
  torsoParts(add);
  add(cone([0, 1.44, -0.012], [0, 1.5, -0.008], 0.062, 0.055), 0.03);
  for (const s of SIDES) {
    const [sh, el] = UPPER_ARM(s);
    add(cone(sh, el, 0.05, 0.038), 0.03);
  }
  const base = makeField(P);
  const neckline = ellipsoid([0, 1.47, 0.035], [0.072, 0.055, 0.07]);
  return (x, y, z) => {
    let d = base(x, y, z) - 0.008;
    d = Math.max(d, 0.985 - y); // hem
    d = Math.max(d, -neckline.f(x, y, z)); // neck opening
    d = Math.max(d, y - 1.5);
    const s = x >= 0 ? 1 : -1;
    if (Math.abs(x) > 0.15) {
      // short sleeves: cut perpendicular to the upper arm
      const [sh, el] = UPPER_ARM(s);
      const ax = el[0] - sh[0], ay = el[1] - sh[1], az = el[2] - sh[2];
      const len = Math.hypot(ax, ay, az);
      const t = ((x - sh[0]) * ax + (y - sh[1]) * ay + (z - sh[2]) * az) / len;
      d = Math.max(d, t - 0.11);
    }
    return d;
  };
}

function diaperField() {
  const P = [];
  const add = (prim, k) => P.push({ ...prim, k });
  pelvisParts(add);
  for (const s of SIDES) add(cone([s * 0.088, 0.86, 0], [s * 0.122, 0.47, 0.006], 0.088, 0.054), 0.025);
  const base = makeField(P);
  // High-cut leg openings like an adult brief.
  return (x, y, z) =>
    Math.max(base(x, y, z) - 0.013, 0.745 + Math.max(0, Math.abs(x) - 0.05) * 0.85 - y, y - 0.965);
}

const CRANIUM = ellipsoid([0, 1.615, -0.008], [0.088, 0.106, 0.106]);
const hairKeep = (x, y, z) =>
  y > 1.668 || (z < -0.01 && y > 1.565) || (Math.abs(x) > 0.066 && z < 0.035 && y > 1.612);

/* ───────── Public ───────── */
export function sculptAll() {
  const prims = bodyPrims();
  const body = polygonize(makeField(prims, bodyPost), [-0.32, -0.005, -0.17], [0.32, 1.735, 0.19], 0.0045);
  body.colors = skinColors(body.positions);
  const { region, centers } = assignRegions(body.positions, prims);
  body.region = region;

  const shirt = polygonize(shirtField(), [-0.28, 0.96, -0.15], [0.28, 1.52, 0.17], 0.006);
  const diaper = polygonize(diaperField(), [-0.24, 0.72, -0.17], [0.24, 0.98, 0.16], 0.006);
  const hair = polygonize(
    (x, y, z) => CRANIUM.f(x, y, z),
    [-0.1, 1.5, -0.125], [0.1, 1.73, 0.11], 0.0045,
    (pos, a, b, c) => {
      const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
      const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
      const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
      return hairKeep(cx, cy, cz);
    }
  );
  return { meshes: { body, shirt, diaper, hair }, regionCenters: centers };
}
