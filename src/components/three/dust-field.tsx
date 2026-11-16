"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Пыль вокруг жемчужины: без текстур и без drei.
 * Позиции считаются детерминированным PRNG один раз, дрейф и мерцание — в шейдере,
 * поэтому в рендер-цикле нет ни `Math.random()`, ни работы на CPU.
 */

const DUST_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSpread;

attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float span = 15.0;
  vec3 p = position;
  p.y = mod(p.y + uTime * 0.11 + span * 0.5, span) - span * 0.5;
  p.x += sin(uTime * 0.21 + aSeed * 6.2831853) * 0.22;
  p.z += cos(uTime * 0.17 + aSeed * 4.7123890) * 0.16;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * uSpread * (1.0 / max(0.001, -mv.z));

  float twinkle = 0.5 + 0.5 * sin(uTime * (0.25 + aSeed * 0.45) + aSeed * 21.0);
  vAlpha = (0.08 + 0.45 * twinkle) * smoothstep(0.5, 3.5, -mv.z);
  vColor = aColor;
}
`;

const DUST_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.05, d);
  a *= a;
  float alpha = a * vAlpha;
  if (alpha <= 0.002) discard;
  // premultiplied alpha: канвас прозрачный, цвет домножается на альфу.
  gl_FragColor = vec4(vColor * alpha, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type DustUniforms = {
  uTime: THREE.IUniform<number>;
  uPixelRatio: THREE.IUniform<number>;
  uSpread: THREE.IUniform<number>;
};

interface DustAttributes {
  positions: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  colors: Float32Array;
}

/** mulberry32: одинаковый рисунок пыли при каждом монтировании. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDustAttributes(count: number): DustAttributes {
  const random = createRandom(0x5eed1);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Тёплые точки — редкость: янтарь остаётся акцентом, а не фоном.
  const milk = new THREE.Color("#f4efe7");
  const pearl = new THREE.Color("#e8e1f0");
  const ember = new THREE.Color("#e8794a");

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = (random() - 0.5) * 12;
    positions[i3 + 1] = (random() - 0.5) * 15;
    positions[i3 + 2] = (random() - 0.5) * 6;

    sizes[i] = 0.7 + random() * 1.5;
    seeds[i] = random();

    const pick = random();
    const color = pick < 0.78 ? milk : pick < 0.94 ? pearl : ember;
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  return { positions, sizes, seeds, colors };
}

interface DustFieldProps {
  count: number;
}

export function DustField({ count }: DustFieldProps) {
  const dpr = useThree((state) => state.viewport.dpr);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const attributes = useMemo(() => createDustAttributes(count), [count]);
  const uniforms = useMemo<DustUniforms>(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSpread: { value: 15 },
    }),
    [],
  );

  useEffect(() => {
    const material = materialRef.current;
    if (material) {
      (material.uniforms as unknown as DustUniforms).uPixelRatio.value = dpr;
    }
  }, [dpr]);

  useFrame((state) => {
    const material = materialRef.current;
    if (material) {
      (material.uniforms as unknown as DustUniforms).uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[attributes.sizes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[attributes.seeds, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[attributes.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={DUST_VERTEX}
        fragmentShader={DUST_FRAGMENT}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
