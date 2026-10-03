import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ZONES } from '../data/zones';
import { useBodyMeshes } from '../body/useBodyMeshes';
import { ZONE_COUNT, ZONE_GLSL, zoneIndexAt } from '../body/zoneClassify';

const START_TARGET = [0, 0.86, 0];
const ZONE_COLORS = {
  pending: new THREE.Color('#f59e0b'),
  same: new THREE.Color('#1f9d5c'),
  changed: new THREE.Color('#e5484d'),
};

// Body parts other than the skin swallow clicks so zones behind them can't be tapped.
const block = (e) => e.stopPropagation();

/* Skin: physically based material + a shader patch that paints the skin zones
   directly on the body surface (with a thin outline between zones). */
function useSkinMaterial() {
  return useMemo(() => {
    const uniforms = {
      uZoneColor: { value: Array.from({ length: ZONE_COUNT }, () => new THREE.Color()) },
      uZoneMix: { value: new Float32Array(ZONE_COUNT) },
      uZoneGlow: { value: new Float32Array(ZONE_COUNT) },
    };
    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.62,
      sheen: 0.18,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#ffcbb8'),
      clearcoat: 0.04,
      clearcoatRoughness: 0.6,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vObjPos;
uniform vec3 uZoneColor[${ZONE_COUNT}];
uniform float uZoneMix[${ZONE_COUNT}];
uniform float uZoneGlow[${ZONE_COUNT}];
${ZONE_GLSL}`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
int zi = zoneIndexAt(vObjPos);
float zMix = 0.0;
float zGlow = 0.0;
vec3 zCol = vec3(0.0);
if (zi > 0) { zMix = uZoneMix[zi]; zGlow = uZoneGlow[zi]; zCol = uZoneColor[zi]; }
if (zMix > 0.0) {
  float e = 0.0035;
  bool edge = zoneIndexAt(vObjPos + vec3(e, 0.0, 0.0)) != zi || zoneIndexAt(vObjPos - vec3(e, 0.0, 0.0)) != zi
           || zoneIndexAt(vObjPos + vec3(0.0, e, 0.0)) != zi || zoneIndexAt(vObjPos - vec3(0.0, e, 0.0)) != zi
           || zoneIndexAt(vObjPos + vec3(0.0, 0.0, e)) != zi || zoneIndexAt(vObjPos - vec3(0.0, 0.0, e)) != zi;
  diffuseColor.rgb = mix(diffuseColor.rgb, zCol, zMix);
  if (edge) diffuseColor.rgb *= 0.5;
}`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
if (zMix > 0.0) totalEmissiveRadiance += zCol * zGlow;`
        );
    };
    material.customProgramCacheKey = () => 'iad-skin-zones-v1';
    return { material, uniforms };
  }, []);
}

function Skin({ geometry, zones, results, focusId, onZoneTap }) {
  const { material, uniforms } = useSkinMaterial();
  useEffect(() => () => material.dispose(), [material]);
  const activeIds = useMemo(() => new Set(zones.map((z) => z.id)), [zones]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ZONES.forEach((z, i) => {
      const idx = i + 1;
      const active = activeIds.has(z.id);
      const state = results[z.id]?.status || 'pending';
      const focused = focusId === z.id;
      uniforms.uZoneColor.value[idx].copy(ZONE_COLORS[state]);
      uniforms.uZoneMix.value[idx] = !active ? 0 : focusId && !focused ? 0.45 : 0.82;
      uniforms.uZoneGlow.value[idx] = focused
        ? 0.45 + 0.3 * Math.sin(t * 6)
        : state === 'pending' && !focusId
          ? 0.22 + 0.2 * Math.sin(t * 3.2)
          : 0.06;
    });
  });

  const zoneAtEvent = (e) => {
    const p = e.object.worldToLocal(e.point.clone());
    const zone = ZONES[zoneIndexAt(p.x, p.y, p.z) - 1];
    return zone && activeIds.has(zone.id) ? zone : null;
  };

  return (
    <mesh
      geometry={geometry}
      material={material}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 10 || !onZoneTap) return; // a drag-rotate, not a tap
        const zone = zoneAtEvent(e);
        if (zone) onZoneTap(zone.id);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        document.body.style.cursor = onZoneTap && zoneAtEvent(e) ? 'pointer' : '';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    />
  );
}

function Face() {
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.032, 1.612, 0.0765]} onClick={block}>
            <sphereGeometry args={[0.0155, 24, 16]} />
            <meshPhysicalMaterial color="#f1ece4" roughness={0.25} clearcoat={1} />
          </mesh>
          <mesh position={[s * 0.032, 1.6115, 0.0905]} scale={[1, 1, 0.45]} onClick={block}>
            <sphereGeometry args={[0.0072, 20, 12]} />
            <meshPhysicalMaterial color="#5a4636" roughness={0.2} clearcoat={1} />
          </mesh>
          <mesh position={[s * 0.032, 1.6115, 0.0935]} scale={[1, 1, 0.4]} onClick={block}>
            <sphereGeometry args={[0.0034, 12, 8]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          {/* reading glasses */}
          <mesh position={[s * 0.034, 1.612, 0.106]} onClick={block}>
            <torusGeometry args={[0.021, 0.0022, 8, 40]} />
            <meshStandardMaterial color="#6b4f3a" metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[s * 0.034, 1.612, 0.106]} onClick={block}>
            <circleGeometry args={[0.02, 32]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0} />
          </mesh>
          <mesh position={[s * 0.069, 1.616, 0.05]} rotation={[Math.PI / 2, 0, s * 0.35]} onClick={block}>
            <cylinderGeometry args={[0.0018, 0.0018, 0.11, 6]} />
            <meshStandardMaterial color="#6b4f3a" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.614, 0.108]} rotation={[0, 0, Math.PI / 2]} onClick={block}>
        <cylinderGeometry args={[0.0018, 0.0018, 0.03, 6]} />
        <meshStandardMaterial color="#6b4f3a" metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Figure({ meshes, diaper, zones, results, focusId, onZoneTap }) {
  return (
    <group>
      <Skin geometry={meshes.body} zones={zones} results={results} focusId={focusId} onZoneTap={onZoneTap} />
      <Face />
      <mesh geometry={meshes.hair} onClick={block}>
        <meshStandardMaterial color="#d9d8db" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={meshes.shirt} onClick={block}>
        <meshPhysicalMaterial color="#8eaccc" roughness={0.9} sheen={0.6} sheenColor="#c8dcf0" />
      </mesh>
      {diaper && (
        <mesh geometry={meshes.diaper} onClick={block}>
          <meshPhysicalMaterial color="#f6f8fb" roughness={0.95} sheen={0.5} sheenColor="#ffffff" />
        </mesh>
      )}
    </group>
  );
}

// Soft studio lighting from a procedural room (no external files).
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
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
  const meshes = useBodyMeshes();
  const controls = useRef();
  const focusZone = zones.find((z) => z.id === focusId);
  const full = mode === 'diaper';
  const frame = full ? [1.95, 0.8] : focusZone ? [0.8, 0.6] : [1.2, 0.8];
  const targetY = full ? 0.88 : 0.8;
  const v = focusZone ? focusZone.side : view;

  return (
    <>
      <Canvas
        camera={{ position: [0, 0.9, 3.4], fov: 32, near: 0.05, far: 50 }}
        dpr={[1, 2]}
        onPointerMissed={() => (document.body.style.cursor = '')}
      >
        <StudioEnvironment />
        <hemisphereLight args={['#fff6ee', '#9c8f86', 0.4]} />
        <directionalLight position={[1.5, 3.5, 3]} intensity={1.3} color="#fff4ea" />
        <directionalLight position={[-2.5, 2, -2.5]} intensity={0.9} color="#e6efff" />
        <directionalLight position={[2, 2.5, -2.5]} intensity={0.6} color="#fff4ea" />
        <directionalLight position={[0, -1.5, 2]} intensity={0.25} />
        {meshes && (
          <Figure
            meshes={meshes}
            diaper={full}
            zones={full ? [] : zones}
            results={results}
            focusId={focusId}
            onZoneTap={onZoneTap}
          />
        )}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={2.5} blur={2.6} far={1.2} />
        <OrbitControls
          ref={controls}
          makeDefault
          target={START_TARGET}
          enablePan={false}
          minDistance={0.6}
          maxDistance={4.5}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.12}
        />
        <CameraRig controls={controls} view={v} frame={frame} targetY={targetY} nonce={nonce} />
      </Canvas>
      {!meshes && <div className="body-loading" role="status" aria-label="Loading 3D body"><span /></div>}
    </>
  );
}
