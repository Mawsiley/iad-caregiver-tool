import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { PELVIS, LEG } from '../data/zones';

const SKIN = '#d9a689';
const SHIRT = '#9db8d6';
const HAIR = '#d4d4da';
const DIAPER = '#f4f7fb';
const START_TARGET = [0, 0.86, 0];
const ZONE_COLORS ={ pending: '#f59e0b', same: '#22a565', changed: '#e5484d' };

// Body meshes swallow clicks so a zone hidden behind the body can't be tapped through it.
const block = (e) => e.stopPropagation();

function Ell({ p, r, color = SKIN, seg = 40 }) {
  return (
    <mesh position={p} scale={r} onClick={block}>
      <sphereGeometry args={[1, seg, Math.round(seg * 0.6)]} />
      <meshStandardMaterial color={color} roughness={0.78} />
    </mesh>
  );
}

function Seg({ top, len, r0, r1, color = SKIN }) {
  return (
    <mesh position={[0, top - len / 2, 0]} onClick={block}>
      <cylinderGeometry args={[r0, r1, len, 28]} />
      <meshStandardMaterial color={color} roughness={0.78} />
    </mesh>
  );
}

// Each patch is inset slightly so neighbouring zones show a thin skin-coloured border.
function zoneGeometry(z) {
  if (z.on === 'pelvis') {
    const fullRing = z.phi[1] - z.phi[0] >= Math.PI * 2 - 1e-6;
    const ip = fullRing ? 0 : 0.035;
    const it = 0.012;
    const t0 = z.theta[0] + it;
    const t1 = Math.min(z.theta[1], Math.PI) - (z.theta[1] >= Math.PI ? 0 : it);
    return new THREE.SphereGeometry(1, 48, 32, z.phi[0] + ip, z.phi[1] - z.phi[0] - 2 * ip, t0, t1 - t0);
  }
  const rAt = (y) => LEG.rTop + (LEG.rBot - LEG.rTop) * (-y / LEG.thighLen);
  const [yBot, yTop] = z.y;
  return new THREE.CylinderGeometry(
    rAt(yTop) * 1.05, rAt(yBot) * 1.05, yTop - yBot, 32, 1, true, z.theta[0] + 0.04, z.theta[1] - z.theta[0] - 0.08
  );
}

function ZoneMesh({ zone, state, focused, dimmed, onTap }) {
  const mat = useRef();
  const geom = useMemo(() => zoneGeometry(zone), [zone]);
  useEffect(() => () => geom.dispose(), [geom]);
  const color = ZONE_COLORS[state];

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const t = clock.elapsedTime;
    let glow = 0.18;
    if (focused) glow = 0.7 + 0.3 * Math.sin(t * 6);
    else if (state === 'pending') glow = 0.35 + 0.3 * Math.sin(t * 3.2);
    mat.current.emissiveIntensity = glow;
    mat.current.opacity = dimmed ? 0.45 : 0.95;
  });

  const placement =
    zone.on === 'pelvis'
      ? { position: PELVIS.center, scale: PELVIS.radii.map((r) => r * 1.03) }
      : { position: [0, (zone.y[0] + zone.y[1]) / 2, 0] };

  return (
    <mesh
      geometry={geom}
      {...placement}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 10) return; // it was a drag-rotate, not a tap
        onTap?.(zone.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (onTap) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <meshStandardMaterial
        ref={mat}
        color={color}
        emissive={color}
        roughness={0.55}
        transparent
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

function Leg({ side, diaper, children }) {
  const s = side === 'L' ? 1 : -1;
  const { thighLen: L, rTop, rBot } = LEG;
  return (
    <group position={[s * LEG.x, LEG.hipY, 0]} rotation={[0, 0, s * LEG.splay]}>
      <Seg top={0} len={L} r0={rTop} r1={rBot} />
      <Ell p={[0, -L, 0.004]} r={[rBot * 1.03, rBot, rBot * 1.06]} />
      <Seg top={-L} len={0.36} r0={rBot * 0.98} r1={0.04} />
      <Ell p={[0, -L - 0.36, 0]} r={[0.042, 0.042, 0.044]} />
      <Ell p={[0, -L - 0.4, 0.055]} r={[0.045, 0.03, 0.11]} />
      {diaper && (
        <mesh position={[0, -0.035, 0]} onClick={block}>
          <cylinderGeometry args={[rTop * 1.12, rTop * 1.05, 0.07, 28, 1, true]} />
          <meshStandardMaterial color={DIAPER} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );
}

function Arm({ side }) {
  const s = side === 'L' ? 1 : -1;
  return (
    <group position={[s * 0.215, 1.35, 0]} rotation={[0, 0, s * 0.13]}>
      <Seg top={0.01} len={0.12} r0={0.058} r1={0.054} color={SHIRT} />
      <Seg top={0} len={0.29} r0={0.05} r1={0.041} />
      <Ell p={[0, -0.29, 0]} r={[0.042, 0.042, 0.042]} />
      <Seg top={-0.29} len={0.25} r0={0.039} r1={0.03} />
      <Ell p={[0, -0.6, 0.005]} r={[0.03, 0.062, 0.02]} />
    </group>
  );
}

function Head() {
  return (
    <group>
      <Seg top={1.5} len={0.1} r0={0.046} r1={0.052} />
      <Ell p={[0, 1.6, 0]} r={[0.093, 0.114, 0.104]} />
      {/* Gray hair cap */}
      <mesh position={[0, 1.607, -0.008]} scale={[0.099, 0.118, 0.108]} onClick={block}>
        <sphereGeometry args={[1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} />
      </mesh>
      <Ell p={[0.094, 1.6, 0]} r={[0.014, 0.027, 0.019]} />
      <Ell p={[-0.094, 1.6, 0]} r={[0.014, 0.027, 0.019]} />
      <Ell p={[0, 1.588, 0.104]} r={[0.014, 0.022, 0.016]} seg={16} />
      <Ell p={[0.033, 1.612, 0.093]} r={[0.009, 0.009, 0.006]} color="#3b3b45" seg={12} />
      <Ell p={[-0.033, 1.612, 0.093]} r={[0.009, 0.009, 0.006]} color="#3b3b45" seg={12} />
      {/* Reading glasses */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.034, 1.612, 0.1]} onClick={block}>
          <torusGeometry args={[0.022, 0.0028, 8, 32]} />
          <meshStandardMaterial color="#5b4636" metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.614, 0.104]} rotation={[0, 0, Math.PI / 2]} onClick={block}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.026, 8]} />
        <meshStandardMaterial color="#5b4636" />
      </mesh>
      <mesh position={[0, 1.563, 0.098]} rotation={[Math.PI, 0, 0]} onClick={block}>
        <torusGeometry args={[0.018, 0.003, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#a0675a" />
      </mesh>
    </group>
  );
}

// Smooth torso (shirt) from a lathe profile, flattened front-to-back.
const TORSO_PROFILE = [
  [0, 0.975], [0.15, 0.98], [0.172, 1.0], [0.176, 1.05], [0.168, 1.12], [0.172, 1.2],
  [0.186, 1.28], [0.19, 1.33], [0.178, 1.38], [0.13, 1.42], [0.06, 1.44], [0, 1.445],
].map(([x, y]) => new THREE.Vector2(x, y));

function Torso() {
  const geom = useMemo(() => new THREE.LatheGeometry(TORSO_PROFILE, 48), []);
  return (
    <mesh geometry={geom} scale={[1, 1, 0.68]} position={[0, 0, 0.004]} onClick={block}>
      <meshStandardMaterial color={SHIRT} roughness={0.85} />
    </mesh>
  );
}

function Figure({ diaper, zones, results, focusId, onZoneTap }) {
  const render = (z) => (
    <ZoneMesh
      key={z.id}
      zone={z}
      state={results[z.id]?.status || 'pending'}
      focused={focusId === z.id}
      dimmed={!!focusId && focusId !== z.id}
      onTap={onZoneTap}
    />
  );
  return (
    <group>
      <Head />
      <Torso />
      <Ell p={[0.2, 1.355, 0]} r={[0.058, 0.055, 0.058]} color={SHIRT} />
      <Ell p={[-0.2, 1.355, 0]} r={[0.058, 0.055, 0.058]} color={SHIRT} />
      <Arm side="L" />
      <Arm side="R" />
      <Ell p={PELVIS.center} r={PELVIS.radii} />
      {diaper && (
        <mesh position={PELVIS.center} scale={PELVIS.radii.map((r) => r * 1.07)} onClick={block}>
          <sphereGeometry args={[1, 48, 32, 0, Math.PI * 2, Math.PI * 0.34, Math.PI * 0.66]} />
          <meshStandardMaterial color={DIAPER} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {zones.filter((z) => z.on === 'pelvis').map(render)}
      <Leg side="L" diaper={diaper}>{zones.filter((z) => z.on === 'thighL').map(render)}</Leg>
      <Leg side="R" diaper={diaper}>{zones.filter((z) => z.on === 'thighR').map(render)}</Leg>
    </group>
  );
}

// Glides the camera to the requested front/back view until the user grabs the controls.
function CameraRig({ controls, view, frame, targetY, nonce }) {
  const { camera, size } = useThree();
  // Distance that fits `frame` = [height, width] metres inside the canvas, whatever its aspect.
  const k = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(frame[0] / k, frame[1] / (k * (size.width / size.height)));
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
  }, [view, dist, targetY, nonce]);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (active.current = false);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [controls]);

  const tmp = useMemo(() => ({ off: new THREE.Vector3(), sph: new THREE.Spherical() }), []);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!active.current || !c) return;
    const k = 1 - Math.exp(-dt * 5);
    c.target.x += -c.target.x * k;
    c.target.z += -c.target.z * k;
    c.target.y += (targetY - c.target.y) * k;
    tmp.off.copy(camera.position).sub(c.target);
    tmp.sph.setFromVector3(tmp.off);
    let d = (view === 'back' ? Math.PI : 0) - tmp.sph.theta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    tmp.sph.theta += d * k;
    tmp.sph.phi += (Math.PI / 2 - 0.06 - tmp.sph.phi) * k;
    tmp.sph.radius += (dist - tmp.sph.radius) * k;
    camera.position.copy(c.target).add(tmp.off.setFromSpherical(tmp.sph));
    camera.lookAt(c.target);
    if (Math.abs(d) < 0.002 && Math.abs(dist - tmp.sph.radius) < 0.004) active.current = false;
  });
  return null;
}

export default function Body3D({ mode, zones = [], results = {}, focusId, view = 'front', nonce = 0, onZoneTap }) {
  const controls = useRef();
  const focusZone = zones.find((z) => z.id === focusId);
  const full = mode === 'diaper';
  const frame = full ? [1.95, 0.8] : focusZone ? [0.8, 0.6] : [1.2, 0.8];
  const targetY = full ? 0.88 : 0.8;
  const v = focusZone ? focusZone.side : view;

  return (
    <Canvas
      camera={{ position: [0, 0.9, 3.4], fov: 32, near: 0.05, far: 50 }}
      dpr={[1, 2]}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <hemisphereLight args={['#ffffff', '#b8a596', 1.1]} />
      <directionalLight position={[2, 4, 3]} intensity={1.7} />
      <directionalLight position={[-2.5, 2, -3]} intensity={0.9} />
      <directionalLight position={[0, -2, 2]} intensity={0.35} />
      <Figure
        diaper={full}
        zones={full ? [] : zones}
        results={results}
        focusId={focusId}
        onZoneTap={onZoneTap}
      />
      <ContactShadows position={[0, 0, 0]} opacity={0.32} scale={2.5} blur={2.6} far={1.2} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={START_TARGET}
        enablePan={false}
        minDistance={0.8}
        maxDistance={4.5}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.12}
      />
      <CameraRig controls={controls} view={v} frame={frame} targetY={targetY} nonce={nonce} />
    </Canvas>
  );
}
