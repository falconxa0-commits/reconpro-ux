'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
// WORLD DATA — Simplified land mass coordinates (lat, lng)
// ═══════════════════════════════════════════════════════════════════════

const LAND_POINTS: [number, number][] = [
  // North America
  [49,-125],[48,-123],[47,-122],[46,-124],[44,-124],[42,-124],[40,-124],[38,-123],
  [36,-122],[34,-120],[33,-118],[32,-117],[31,-110],[29,-109],[28,-106],[27,-100],
  [26,-97],[25,-97],[28,-96],[30,-90],[29,-89],[30,-85],[29,-85],[28,-82],
  [27,-80],[25,-80],[30,-81],[33,-79],[35,-76],[37,-76],[39,-74],[41,-72],
  [42,-71],[43,-70],[45,-67],[47,-67],[49,-66],[51,-60],[53,-58],[55,-60],
  [58,-63],[60,-65],[62,-68],[64,-72],[66,-70],[68,-75],[70,-80],[72,-85],
  [70,-90],[68,-95],[66,-100],[64,-105],[62,-110],[60,-115],[58,-118],[56,-120],
  [54,-122],[52,-125],[50,-127],
  // South America
  [12,-72],[10,-75],[8,-77],[6,-77],[4,-77],[2,-80],[0,-80],[-2,-80],[-4,-78],
  [-6,-77],[-8,-79],[-10,-78],[-12,-77],[-15,-75],[-18,-70],[-20,-65],
  [-23,-65],[-25,-65],[-28,-67],[-30,-68],[-33,-70],[-35,-72],[-38,-73],
  [-40,-73],[-42,-73],[-45,-72],[-48,-70],[-50,-70],[-52,-70],[-54,-68],
  [-55,-67],[-55,-65],[-52,-65],[-50,-63],[-47,-62],[-45,-60],[-42,-58],
  [-40,-55],[-38,-55],[-35,-53],[-32,-52],[-28,-49],[-25,-47],[-22,-43],
  [-20,-40],[-18,-39],[-15,-39],[-12,-38],[-10,-37],[-8,-35],[-5,-35],
  [-2,-44],[0,-50],[2,-53],[4,-55],[6,-58],[8,-60],[10,-62],[12,-67],
  // Europe
  [36,-6],[37,-2],[38,0],[39,0],[40,0],[42,3],[43,5],[44,8],[46,6],
  [48,3],[50,4],[52,5],[54,9],[56,10],[58,12],[60,11],[62,10],[64,12],
  [66,14],[68,16],[70,20],[71,26],[70,30],[68,28],[66,25],[64,22],
  [62,18],[60,18],[58,16],[56,14],[54,13],[52,14],[50,14],[48,17],
  [47,15],[46,14],[44,12],[43,11],[42,12],[40,14],[38,12],[37,15],
  [36,14],[38,24],[40,26],[42,28],[44,28],[46,30],[48,22],[50,20],
  [52,21],[54,20],[56,24],[58,26],[60,30],[62,32],[64,28],[66,26],
  // Africa
  [35,-5],[33,0],[31,10],[30,10],[28,13],[25,15],[20,17],[15,17],[12,16],
  [10,14],[8,12],[5,10],[4,8],[2,10],[0,10],[-2,12],[-4,12],[-6,12],
  [-8,13],[-10,14],[-12,14],[-15,12],[-18,12],[-20,15],[-23,15],[-25,16],
  [-28,17],[-30,18],[-33,18],[-34,20],[-34,22],[-33,25],[-30,30],[-28,32],
  [-25,35],[-22,36],[-18,38],[-15,40],[-12,44],[-10,44],[-8,40],[-5,40],
  [-2,42],[0,42],[2,45],[4,42],[6,42],[8,40],[10,42],[12,44],[15,42],
  [18,40],[20,40],[22,38],[25,38],[28,34],[30,32],[32,32],[34,25],[35,12],
  [37,10],[38,10],[37,0],[36,-2],[35,0],
  // Asia (Russia / Central)
  [70,30],[72,40],[74,50],[72,60],[70,70],[68,80],[66,90],[64,100],
  [62,110],[60,120],[58,130],[56,135],[54,140],[52,142],[50,143],[48,142],
  [46,140],[44,142],[42,132],[40,130],[38,128],[36,128],[34,130],[32,132],
  [30,122],[28,120],[26,120],[24,120],[22,114],[20,110],[18,108],[16,108],
  [14,108],[12,108],[10,106],[8,106],[6,102],[4,102],[2,104],[0,105],
  [-2,106],[-4,106],[-6,106],[-8,115],[-6,120],[-8,125],[-7,130],
  [-5,135],[-7,140],[-8,145],[-6,147],[-5,150],[-7,155],[-8,160],
  // Middle East / India / SE Asia
  [32,35],[30,35],[28,35],[26,36],[24,38],[22,40],[20,40],[18,42],
  [16,43],[14,44],[12,45],[14,50],[16,52],[18,55],[20,57],[22,60],
  [24,68],[22,72],[20,73],[18,74],[16,76],[14,78],[12,80],[10,78],
  [8,77],[6,78],[4,80],[2,80],[0,80],[-2,80],[-4,80],[-6,80],
  [-8,80],[-8,78],[-6,76],[-4,76],[-2,76],[0,74],[2,72],[4,72],
  [6,72],[8,74],[10,76],[12,76],[14,78],[16,80],[18,82],[20,84],
  [22,88],[20,92],[18,96],[16,98],[14,100],[12,100],[10,98],[8,100],
  [6,100],[4,102],[2,104],[0,104],[2,106],[4,108],[6,108],[8,106],
  [10,106],[12,106],[14,108],[16,108],[18,106],[20,106],[22,108],
  // Japan / Korea / China coast
  [35,129],[36,130],[38,132],[40,130],[42,132],[44,134],[46,138],[48,142],
  [50,143],[52,142],[54,140],[56,138],[58,135],[60,130],[62,132],[64,130],
  [66,130],[35,127],[34,126],[33,126],[32,128],[30,128],[28,122],
  [26,120],[34,132],[36,128],[38,126],[40,124],[38,128],[36,126],
  // Australia
  [-12,131],[-14,130],[-16,130],[-18,122],[-20,118],[-22,115],[-24,114],
  [-26,114],[-28,114],[-30,115],[-32,116],[-34,118],[-36,137],[-38,140],
  [-40,144],[-42,146],[-44,146],[-46,148],[-48,148],[-50,148],[-38,145],
  [-36,143],[-34,142],[-32,140],[-30,138],[-28,134],[-26,132],[-24,130],
  [-22,128],[-20,126],[-18,124],[-16,126],[-14,128],[-12,130],
];

// Real world cities for threat visualization
const THREAT_CITIES: { name: string; lat: number; lng: number; type: 'source' | 'target' | 'hotspot'; threat: string }[] = [
  { name: 'Moscow', lat: 55.75, lng: 37.62, type: 'source', threat: 'APT29' },
  { name: 'Beijing', lat: 39.9, lng: 116.4, type: 'source', threat: 'APT41' },
  { name: 'Tehran', lat: 35.7, lng: 51.4, type: 'source', threat: 'APT33' },
  { name: 'Pyongyang', lat: 39.03, lng: 125.75, type: 'source', threat: 'Lazarus' },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, type: 'hotspot', threat: 'Banking Trojans' },
  { name: 'Lagos', lat: 6.52, lng: 3.38, type: 'source', threat: 'BEC Fraud' },
  { name: 'Bucharest', lat: 44.43, lng: 26.1, type: 'source', threat: 'Ransomware' },
  { name: 'Mumbai', lat: 19.08, lng: 72.88, type: 'hotspot', threat: 'APT Groups' },
  { name: 'New York', lat: 40.71, lng: -74.01, type: 'target', threat: 'Finance' },
  { name: 'London', lat: 51.51, lng: -0.13, type: 'target', threat: 'Government' },
  { name: 'Tokyo', lat: 35.68, lng: 139.69, type: 'target', threat: 'Technology' },
  { name: 'Silicon Valley', lat: 37.39, lng: -122.08, type: 'target', threat: 'Tech Giants' },
  { name: 'Frankfurt', lat: 50.11, lng: 8.68, type: 'target', threat: 'Finance EU' },
  { name: 'Tel Aviv', lat: 32.07, lng: 34.78, type: 'hotspot', threat: 'Cyber Defense' },
  { name: 'Singapore', lat: 1.35, lng: 103.82, type: 'target', threat: 'APAC Hub' },
  { name: 'Sydney', lat: -33.87, lng: 151.21, type: 'target', threat: 'ANZ Hub' },
  { name: 'Arlington', lat: 38.88, lng: -77.05, type: 'target', threat: 'Defense' },
  { name: 'Shanghai', lat: 31.23, lng: 121.47, type: 'hotspot', threat: 'Data Centers' },
  { name: 'Berlin', lat: 52.52, lng: 13.41, type: 'target', threat: 'EU Gov' },
  { name: 'Seoul', lat: 37.57, lng: 126.98, type: 'target', threat: 'Semiconductor' },
];

// Attack connections (source index → target index)
const ATTACK_CONNECTIONS: [number, number][] = [
  [0,8],[0,9],[0,16],[0,18],[1,10],[1,11],[1,14],[1,19],
  [2,8],[2,12],[2,9],[3,10],[3,19],[5,15],[5,9],[6,12],[6,18],
  [7,14],[4,15],[1,0],[2,3],
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const R = 2; // Globe radius

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function createArcCurve(start: THREE.Vector3, end: THREE.Vector3, altitude: number): THREE.CubicBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  mid.normalize().multiplyScalar(R + altitude * (dist / R));

  const s = new THREE.Vector3().lerpVectors(start, mid, 0.3).normalize().multiplyScalar(R + altitude * 0.5);
  const e = new THREE.Vector3().lerpVectors(end, mid, 0.3).normalize().multiplyScalar(R + altitude * 0.5);

  return new THREE.CubicBezierCurve3(start, s, e, end);
}

// ═══════════════════════════════════════════════════════════════════════
// GLOBE CORE — Wireframe sphere with glow
// ═══════════════════════════════════════════════════════════════════════

function GlobeSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
  });

  return (
    <group>
      {/* Inner dark sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[R - 0.01, 64, 64]} />
        <meshBasicMaterial color="#030806" transparent opacity={0.95} />
      </mesh>

      {/* Wireframe */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[R, 36, 18]} />
        <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.06} />
      </mesh>

      {/* Latitude lines */}
      {[-60, -30, 0, 30, 60].map(lat => {
        const phi = (90 - lat) * (Math.PI / 180);
        const ringR = R * Math.sin(phi);
        const y = R * Math.cos(phi);
        return (
          <mesh key={lat} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ringR - 0.003, ringR + 0.003, 128]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={lat === 0 ? 0.15 : 0.07} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* Longitude lines */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map(lng => {
        const theta = lng * (Math.PI / 180);
        return (
          <mesh key={lng} rotation={[0, theta, 0]}>
            <ringGeometry args={[R - 0.003, R + 0.003, 128]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={lng === 0 ? 0.15 : 0.05} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ATMOSPHERE GLOW (Fresnel effect)
// ═══════════════════════════════════════════════════════════════════════

function Atmosphere() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.0, 1.0, 0.53, 1.0) * intensity * 0.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh material={material}>
      <sphereGeometry args={[R + 0.15, 64, 64]} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LAND MASS DOTS
// ═══════════════════════════════════════════════════════════════════════

function LandDots() {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  const positions = useMemo(() => {
    const pos = new Float32Array(LAND_POINTS.length * 3);
    LAND_POINTS.forEach(([lat, lng], i) => {
      const v = latLngToVec3(lat, lng, R + 0.01);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    return pos;
  }, []);

  return (
    <group ref={ref}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#00ff88" size={0.025} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// THREAT POINTS (cities)
// ═══════════════════════════════════════════════════════════════════════

function ThreatPoints() {
  const ref = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
    pulseRef.current += delta;
  });

  const points = useMemo(() => {
    return THREAT_CITIES.map(city => ({
      ...city,
      pos: latLngToVec3(city.lat, city.lng, R + 0.02),
      color: city.type === 'source' ? '#ef4444' : city.type === 'hotspot' ? '#f97316' : '#00ff88',
    }));
  }, []);

  return (
    <group ref={ref}>
      {points.map((p, i) => (
        <group key={i} position={p.pos}>
          {/* Core dot */}
          <mesh>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={p.color} />
          </mesh>

          {/* Glow */}
          <mesh>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.2} />
          </mesh>

          {/* Pulse ring for sources */}
          {p.type === 'source' && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.04, 0.07, 32]} />
              <meshBasicMaterial color={p.color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ATTACK ARCS
// ═══════════════════════════════════════════════════════════════════════

function AttackArcs() {
  const groupRef = useRef<THREE.Group>(null);
  const arcsRef = useRef<{
    curve: THREE.CubicBezierCurve3;
    progress: number;
    speed: number;
    color: string;
  }[]>([]);

  // Initialize arcs
  useMemo(() => {
    arcsRef.current = ATTACK_CONNECTIONS.map(([si, ti]) => {
      const start = latLngToVec3(THREAT_CITIES[si].lat, THREAT_CITIES[si].lng, R + 0.02);
      const end = latLngToVec3(THREAT_CITIES[ti].lat, THREAT_CITIES[ti].lng, R + 0.02);
      return {
        curve: createArcCurve(start, end, 0.6),
        progress: Math.random(),
        speed: 0.08 + Math.random() * 0.12,
        color: THREAT_CITIES[si].type === 'source' ? '#ef4444' : '#f97316',
      };
    });
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.03;

    for (const arc of arcsRef.current) {
      arc.progress = (arc.progress + arc.speed * delta) % 1;
    }

    // Update arc line geometries
    groupRef.current?.children.forEach((child, i) => {
      const arc = arcsRef.current[i];
      if (!arc || !child) return;

      const line = child as THREE.Line;
      const geo = line.geometry as THREE.BufferGeometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const pts = 50;

      for (let j = 0; j <= pts; j++) {
        const t = (j / pts + arc.progress) % 1;
        const p = arc.curve.getPoint(t);
        posAttr.setXYZ(j, p.x, p.y, p.z);
      }
      posAttr.needsUpdate = true;
    });
  });

  const arcData = useMemo(() => {
    return ATTACK_CONNECTIONS.map(([si, ti]) => {
      const start = latLngToVec3(THREAT_CITIES[si].lat, THREAT_CITIES[si].lng, R + 0.02);
      const end = latLngToVec3(THREAT_CITIES[ti].lat, THREAT_CITIES[ti].lng, R + 0.02);
      const curve = createArcCurve(start, end, 0.6);
      const pts = 51;
      const positions = new Float32Array(pts * 3);
      for (let j = 0; j < pts; j++) {
        const p = curve.getPoint(j / (pts - 1));
        positions[j * 3] = p.x;
        positions[j * 3 + 1] = p.y;
        positions[j * 3 + 2] = p.z;
      }
      return {
        positions,
        color: THREAT_CITIES[si].type === 'source' ? '#ef4444' : '#f97316',
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {arcData.map((arc, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={51} array={arc.positions} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={arc.color} transparent opacity={0.3} />
        </line>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRAVELING PACKETS (dots moving along arcs)
// ═══════════════════════════════════════════════════════════════════════

function TravelingPackets() {
  const meshRefs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const packets = useMemo(() => {
    return ATTACK_CONNECTIONS.map(([si, ti]) => {
      const start = latLngToVec3(THREAT_CITIES[si].lat, THREAT_CITIES[si].lng, R + 0.02);
      const end = latLngToVec3(THREAT_CITIES[ti].lat, THREAT_CITIES[ti].lng, R + 0.02);
      return {
        curve: createArcCurve(start, end, 0.6),
        progress: Math.random(),
        speed: 0.06 + Math.random() * 0.1,
        color: new THREE.Color(THREAT_CITIES[si].type === 'source' ? '#ef4444' : '#f97316'),
      };
    });
  }, []);

  const count = packets.length;

  useFrame((_, delta) => {
    if (!meshRefs.current) return;

    for (let i = 0; i < count; i++) {
      const p = packets[i];
      p.progress = (p.progress + p.speed * delta) % 1;
      const pos = p.curve.getPoint(p.progress);
      dummy.position.copy(pos);
      dummy.scale.setScalar(1 + Math.sin(p.progress * Math.PI) * 0.8);
      dummy.updateMatrix();
      meshRefs.current!.setMatrixAt(i, dummy.matrix);
      meshRefs.current!.setColorAt(i, p.color);
    }
    meshRefs.current.instanceMatrix.needsUpdate = true;
    if (meshRefs.current.instanceColor) meshRefs.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRefs} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ORBITAL RING + SATELLITES
// ═══════════════════════════════════════════════════════════════════════

function OrbitalRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const satRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.1) * 0.1;
      ringRef.current.rotation.z = t * 0.02;
    }
    if (satRef.current) {
      const angle = t * 0.5;
      satRef.current.position.set(
        Math.cos(angle) * (R + 0.5),
        Math.sin(t * 0.1) * 0.2,
        Math.sin(angle) * (R + 0.5),
      );
    }
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[R + 0.5, 0.003, 8, 128]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
      </mesh>
      <mesh ref={satRef}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INNER GLOW (core light)
// ═══════════════════════════════════════════════════════════════════════

function InnerGlow() {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return <pointLight ref={lightRef} color="#00ff88" intensity={1.5} distance={5} decay={2} />;
}

// ═══════════════════════════════════════════════════════════════════════
// CAMERA CONTROLLER
// ═══════════════════════════════════════════════════════════════════════

function CameraController() {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    camera.lookAt(target);
  });

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// SCENE (all 3D objects)
// ═══════════════════════════════════════════════════════════════════════

function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <InnerGlow />
      <GlobeSphere />
      <Atmosphere />
      <LandDots />
      <ThreatPoints />
      <AttackArcs />
      <TravelingPackets />
      <OrbitalRing />
      <CameraController />
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate={false}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
      <Stars radius={50} depth={50} count={1500} factor={3} saturation={0} fade speed={1} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HUD OVERLAY (HTML on top of canvas)
// ═══════════════════════════════════════════════════════════════════════

function HUD() {
  const [time, setTime] = useState('');
  const [activeThreats, setActiveThreats] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
      setActiveThreats(Math.floor(12 + Math.sin(Date.now() / 5000) * 4));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          <span className="text-[10px] font-mono text-[#ef4444] uppercase tracking-wider">Live Threat Intelligence</span>
        </div>
        <div className="text-[9px] font-mono text-muted-foreground/60">GLOBAL ATTACK SURFACE MONITORING</div>
      </div>

      {/* Top-right */}
      <div className="absolute top-4 right-4 text-right">
        <div className="text-[10px] font-mono text-[#00ff88]">{time}</div>
        <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">NODES: {THREAT_CITIES.length} ACTIVE</div>
      </div>

      {/* Bottom-left stats */}
      <div className="absolute bottom-4 left-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/20">
            <span className="text-[10px] font-mono text-[#ef4444]">{activeThreats} ACTIVE THREATS</span>
          </div>
          <div className="px-2 py-1 rounded bg-[#f97316]/10 border border-[#f97316]/20">
            <span className="text-[10px] font-mono text-[#f97316]">{ATTACK_CONNECTIONS.length} ATTACK VECTORS</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-muted-foreground/50">
          INTEL FEED: RECONPRO GLOBAL THREAT NETWORK
        </div>
      </div>

      {/* Bottom-right legend */}
      <div className="absolute bottom-4 right-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          <span className="text-[9px] font-mono text-muted-foreground">Threat Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-[9px] font-mono text-muted-foreground">Hotspot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
          <span className="text-[9px] font-mono text-muted-foreground">Target / Defense</span>
        </div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#00ff88]/30" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#00ff88]/30" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#00ff88]/30" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#00ff88]/30" />

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)',
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function ThreatGlobe() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="cyber-card rounded-2xl overflow-hidden relative"
      style={{ height: 'calc(100vh - 140px)', minHeight: '500px' }}
    >
      {/* Canvas */}
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: '#030806' }}
        dpr={[1, 2]}
      >
        <Scene />
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* HUD Overlay */}
      <HUD />
    </motion.div>
  );
}