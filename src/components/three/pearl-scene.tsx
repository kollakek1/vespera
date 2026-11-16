"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

import { DustField } from "@/components/three/dust-field";
import {
  PEARL_FRAGMENT_SHADER,
  PEARL_VERTEX_SHADER,
  WAVE_LIFE,
  WAVE_MAIN_PHASE,
  WAVE_SLOTS,
  createPearlUniforms,
  type PearlUniforms,
} from "@/components/three/pearl-material";
import { useOrbPointer } from "@/hooks/use-orb-pointer";

const FOV = 32;
/** Радиус сферы в юнитах — тот же, что у геометрии. */
const PEARL_RADIUS = 1.35;
/** Указатель замер на столько — включается дыхание. */
const IDLE_AFTER_MS = 4000;
/** Вращение в покое, рад/с. */
const SPIN_IDLE = 0.05;
/** Наклон к курсору: 4.9° по X, 6° по Y. Больше — объект «пляшет». */
const TILT_X = 0.085;
const TILT_Y = 0.105;

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Зёрна волн: скорость и толщина соседних фронтов отличаются на ±10%. */
const WAVE_SEEDS = [0.12, 0.63, 0.31, 0.87, 0.44, 0.06];

/**
 * Свободный слот под новую волну или −1, если все заняты и самая старая ещё
 * в основной фазе. Активную волну никогда не перезапускаем: лучше потерять
 * лишнее нажатие, чем дёрнуть уже бегущий фронт.
 */
function reserveWaveSlot(starts: Float32Array, time: number): number {
  let oldest = 0;
  for (let i = 0; i < WAVE_SLOTS; i += 1) {
    if (time - starts[i] >= WAVE_LIFE) return i;
    if (starts[i] < starts[oldest]) oldest = i;
  }
  return time - starts[oldest] >= WAVE_MAIN_PHASE ? oldest : -1;
}

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function viewportWidth(): number {
  return window.innerWidth;
}

function serverWidth(): number {
  return 1440;
}

/** Ширина вьюпорта, а не canvas: иначе скроллбар на 1024 сдвигает брейкпоинт. */
function useViewportWidth(): number {
  return useSyncExternalStore(subscribeResize, viewportWidth, serverWidth);
}

interface OrbConfig {
  distance: number;
  scale: number;
  x: number;
  y: number;
  detail: number;
  mobile: boolean;
}

/**
 * Положение жемчужины в юнитах: таблица §7.4 задана в процентах вьюпорта,
 * поэтому смещение считается из видимой высоты камеры, а не «на глаз».
 */
function useOrbConfig(): OrbConfig {
  const canvasWidth = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const width = useViewportWidth();

  return useMemo(() => {
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const distance = isMobile ? 9 : isTablet ? 7.6 : width < 1280 ? 6.6 : 6.2;
    const visibleHeight = 2 * distance * Math.tan((FOV * Math.PI) / 360);
    const aspect = height > 0 ? canvasWidth / height : 1;
    const visibleWidth = visibleHeight * aspect;

    if (isMobile && height > 0) {
      // Телефон: жемчужина живёт в зазоре между eyebrow и заголовком.
      // Границы взяты из раскладки hero: шапка 72 + eyebrow на 80, заголовок на 42svh.
      const eyebrowBottom = 176;
      const titleTop = height * 0.42;
      const band = Math.max(88, titleTop - eyebrowBottom - 28);
      const diameter = Math.max(96, Math.min(height * 0.2, band));
      const center = eyebrowBottom + 14 + diameter / 2;
      return {
        distance,
        scale: ((diameter / height) * visibleHeight) / 2.7,
        x: 0,
        y: (0.5 - center / height) * visibleHeight,
        detail: 12,
        mobile: true,
      };
    }

    // Планшет и десктоп: центр 28%...36%, диаметр ≈ 27...64svh.
    const centerX = isTablet ? 0.72 : 0.68;
    const centerY = isTablet ? 0.42 : 0.36;
    const scale = isTablet ? 0.62 : width < 1280 ? 0.82 : 0.84;

    return {
      distance,
      scale,
      x: (centerX - 0.5) * visibleWidth,
      y: (0.5 - centerY) * visibleHeight,
      detail: width < 768 ? 12 : 20,
      mobile: false,
    };
  }, [width, canvasWidth, height]);
}

function CameraRig({ distance }: { distance: number }) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, distance]);

  return null;
}

interface PearlProps {
  detail: number;
  mobile: boolean;
  /** Масштаб родительской группы: нужен для радиуса попадания в пикселях. */
  scale: number;
}

/**
 * Вся реакция на пользователя — в одном `useFrame` без аллокаций: указатель
 * живёт в ref, юниформы мутируются на месте, векторы предсозданы.
 */
function Pearl({ detail, mobile, scale }: PearlProps) {
  const tilt = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { pointer: pointerState, consumePress } = useOrbPointer();
  const camera = useThree((state) => state.camera);

  const motion = useRef({
    spin: 0,
    tiltX: 0,
    tiltY: 0,
    velX: 0,
    velY: 0,
    idle: 0,
    cursor: 0,
    lightX: 0,
    lightY: 0.33,
    lightZ: 0.944,
  });
  /** Счётчик выданных зёрен: две волны в одном слоте не должны совпадать. */
  const seedCursor = useRef(0);

  const scratch = useMemo(
    () => ({
      center: new THREE.Vector3(),
      ray: new THREE.Vector3(),
      target: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      local: new THREE.Vector3(),
      raycaster: new THREE.Raycaster(),
    }),
    [],
  );

  const uniforms = useMemo(
    () => createPearlUniforms({ iridescence: mobile ? 0.85 : 1 }),
    [mobile],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    const group = tilt.current;
    const mesh = body.current;
    if (!material || !group || !mesh) return;

    const u = material.uniforms as unknown as PearlUniforms;
    const m = motion.current;
    const p = pointerState.current;
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    const elapsed = state.clock.elapsedTime;

    scratch.center.setFromMatrixPosition(mesh.matrixWorld);
    const distance = camera.position.distanceTo(scratch.center);

    // 1. Нажатие по жемчужине: точка попадания становится центром новой волны.
    //    Рейкаст только по событию — в кадре его нет.
    const press = consumePress();
    if (press) {
      scratch.ndc.set(
        (press.clientX / window.innerWidth) * 2 - 1,
        1 - (press.clientY / window.innerHeight) * 2,
      );
      scratch.raycaster.setFromCamera(scratch.ndc, camera);
      const hit = scratch.raycaster.intersectObject(mesh, false)[0];
      if (hit) {
        const starts = u.uWaveStart.value;
        const slot = reserveWaveSlot(starts, elapsed);
        if (slot >= 0) {
          scratch.local.copy(hit.point);
          mesh.worldToLocal(scratch.local).normalize();
          const origin = u.uWaveOrigin.value;
          origin[slot * 3] = scratch.local.x;
          origin[slot * 3 + 1] = scratch.local.y;
          origin[slot * 3 + 2] = scratch.local.z;
          starts[slot] = elapsed;
          u.uWaveSeed.value[slot] = WAVE_SEEDS[seedCursor.current % WAVE_SEEDS.length];
          seedCursor.current += 1;
        }
      }
    }

    // 2. Геометрия в пикселях: радиус объекта переводит смещение указателя
    //    в доли радиуса — так курсор проецируется на видимую полусферу.
    scratch.ray.copy(scratch.center).project(camera);
    const aspect = state.size.width / Math.max(1, state.size.height);
    const radiusNdc = (PEARL_RADIUS * scale) / (distance * Math.tan((FOV * Math.PI) / 360));
    const offsetX = (p.x - scratch.ray.x) * aspect;
    const offsetY = p.y - scratch.ray.y;

    // 3. Простой: указатель не двигался 4 с — материал начинает дышать.
    const idleTarget = now - p.movedAt > IDLE_AFTER_MS ? 1 : 0;
    m.idle = damp(m.idle, idleTarget, 0.9, dt);

    // 4. Свет курсора: точка указателя проецируется на видимую полусферу, и
    //    блик встаёт ровно туда, где курсор. За краем диска — на кромку.
    const cursorTarget = p.present ? (p.fine ? 0.9 : 0.6) : 0;
    const touchFade = !p.fine && now - p.movedAt > 5000 ? 0.45 : 1;
    m.cursor = damp(m.cursor, cursorTarget * touchFade, cursorTarget > 0 ? 3.2 : 1.8, dt);

    if (cursorTarget > 0) {
      const radius = radiusNdc || 1;
      let rx = offsetX / radius;
      let ry = offsetY / radius;
      const r = Math.hypot(rx, ry);
      if (r > 0.8) {
        const shrink = 0.8 / r;
        rx *= shrink;
        ry *= shrink;
      }
      const rz = Math.sqrt(Math.max(0, 1 - rx * rx - ry * ry));
      // Точка на полусфере камеры; камера смотрит на объект, поэтому оси
      // достаточно развернуть кватернионом камеры.
      scratch.target.set(rx, ry, rz).applyQuaternion(camera.quaternion).normalize();
      const follow = 1 - Math.exp(-dt * 8.5);
      m.lightX += (scratch.target.x - m.lightX) * follow;
      m.lightY += (scratch.target.y - m.lightY) * follow;
      m.lightZ += (scratch.target.z - m.lightZ) * follow;
      const length = Math.hypot(m.lightX, m.lightY, m.lightZ) || 1;
      m.lightX /= length;
      m.lightY /= length;
      m.lightZ /= length;
    }

    // 5. Вращение и наклон. Пружина вместо lerp: у угла появляется вес.
    m.spin += dt * SPIN_IDLE;
    mesh.rotation.y = m.spin;

    const aim = p.fine ? (p.present ? 1 : 0) : 1 - m.idle;
    const targetX = p.y * TILT_X * aim + Math.sin(elapsed / 5.5) * 0.012;
    const targetY = p.x * TILT_Y * aim;
    // Шаг пружины ограничен: после паузы вкладки нет выброса.
    const springDt = Math.min(delta, 1 / 30);
    const springDecay = Math.exp(-11 * springDt);
    m.velX += (targetX - m.tiltX) * 30 * springDt;
    m.velX *= springDecay;
    m.tiltX += m.velX * springDt;
    m.velY += (targetY - m.tiltY) * 30 * springDt;
    m.velY *= springDecay;
    m.tiltY += m.velY * springDt;
    group.rotation.x = m.tiltX;
    group.rotation.y = m.tiltY;

    // 6. Волны живут в шейдере: здесь только время и общие юниформы.
    u.uTime.value = elapsed;
    u.uObjectToWorld.value.setFromMatrix4(mesh.matrixWorld);
    u.uCursorDir.value.set(m.lightX, m.lightY, m.lightZ);
    u.uCursorI.value = m.cursor;
    u.uIdle.value = m.idle;
  });

  return (
    <group ref={tilt}>
      <mesh ref={body}>
        <icosahedronGeometry args={[PEARL_RADIUS, detail]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={PEARL_VERTEX_SHADER}
          fragmentShader={PEARL_FRAGMENT_SHADER}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  const config = useOrbConfig();

  return (
    <>
      <CameraRig distance={config.distance} />
      <group position={[config.x, config.y, 0]} scale={config.scale}>
        <Pearl detail={config.detail} mobile={config.mobile} scale={config.scale} />
      </group>
      <DustField count={config.mobile ? 56 : 120} />
    </>
  );
}

interface PearlSceneProps {
  /** `false` останавливает rAF: сцена не тикает вне вьюпорта и во вкладке-фоне. */
  active: boolean;
  onReady: () => void;
}

export default function PearlScene({ active, onReady }: PearlSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: FOV, near: 0.1, far: 20, position: [0, 0, 6.2] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => {
        window.requestAnimationFrame(onReady);
      }}
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <Scene />
    </Canvas>
  );
}
