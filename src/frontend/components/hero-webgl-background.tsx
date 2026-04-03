"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";

const BG = "#09090b";
const COUNT = 1600;

/** Deterministic pseudo-random in [0,1) from index (pure, no Math.random in render). */
function hash01(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type MouseRef = MutableRefObject<{ x: number; y: number }>;

function ParticleField({ mouseRef }: { mouseRef: MouseRef }) {
  const pointsRef = useRef<THREE.Points>(null);
  const base = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (hash01(i, 1) - 0.5) * 13;
      positions[i * 3 + 1] = (hash01(i, 2) - 0.5) * 6.5;
      positions[i * 3 + 2] = (hash01(i, 3) - 0.5) * 2.5;
    }
    return positions;
  }, []);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    const swayY = Math.sin(t * 0.42) * 0.11 + Math.sin(t * 0.17 + 0.8) * 0.04;
    const swayX = Math.sin(t * 0.31 + 2.1) * 0.08 + Math.cos(t * 0.24) * 0.03;
    pts.rotation.y = swayY + mx * 0.12;
    pts.rotation.x = swayX + my * 0.09;
    pts.rotation.z = Math.sin(t * 0.21) * 0.02;

    pts.position.x = THREE.MathUtils.lerp(pts.position.x, mx * 0.38, 0.035);
    pts.position.y = THREE.MathUtils.lerp(pts.position.y, my * 0.26, 0.035);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[base, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e4e4e7"
        size={0.028}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene({ mouseRef }: { mouseRef: MouseRef }) {
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 3.5, 15]} />
      <ambientLight intensity={0.35} />
      <ParticleField mouseRef={mouseRef} />
    </>
  );
}

type HeroWebGLBackgroundProps = {
  heroRef: RefObject<HTMLElement | null>;
};

export function HeroWebGLBackground({ heroRef }: HeroWebGLBackgroundProps) {
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [heroRef]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 h-full min-h-[88vh] w-full min-w-full overflow-hidden"
      aria-hidden
    >
      <Canvas
        className="h-full min-h-[88vh] w-full min-w-full"
        camera={{ position: [0, 0, 6.2], fov: 52 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
