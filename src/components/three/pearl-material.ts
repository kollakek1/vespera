import * as THREE from "three";

/**
 * Материал жемчужины: тёмное ядро + тонкоплёночная иридесценция по френелю.
 *
 * Свет задан аналитически теми же источниками, что таблица §7.3 дизайн-системы
 * (тёплый ключевой / молочный заполняющий / перламутровый контровой). Через
 * `ShaderMaterial` сцена не читается, поэтому риг живёт в юниформах — но позиции,
 * цвета и интенсивности взяты из спецификации один в один.
 */

const BRAND = {
  ink: "#0b0809",
  plum: "#181016",
  milk: "#f4efe7",
  sand: "#ded3c4",
  ember: "#e8794a",
  pearl: "#e8e1f0",
} as const;

type Vec3 = readonly [number, number, number];

export interface PearlLight {
  /** Позиция источника в юнитах, как у `Lightformer`. */
  position: Vec3;
  color: string;
  intensity: number;
}

/** §7.3 — единственный тёплый акцент: янтарь с закатной стороны. */
export const PEARL_LIGHT_RIG: { key: PearlLight; fill: PearlLight; counter: PearlLight } = {
  key: { position: [-3, 2, 3], color: BRAND.ember, intensity: 2.4 },
  fill: { position: [2.5, 1, -3], color: BRAND.milk, intensity: 1.6 },
  counter: { position: [0, -2, -4], color: BRAND.pearl, intensity: 0.9 },
};

/**
 * Кольцевой буфер волн от касаний. Шесть слотов покрывают серию быстрых
 * нажатий (2.2 с жизни), не раздувая форму: 6 vec3 + 12 float в юниформах.
 * Время каждой волны считается в шейдере от `uTime` — CPU только пишет старт.
 */
export const WAVE_SLOTS = 6;
/** Жизнь волны, с: фронт успевает уйти за кромку и погаснуть. */
export const WAVE_LIFE = 1.9;
/** Основная фаза, с: раньше этого возраста слот не переиспользуется. */
export const WAVE_MAIN_PHASE = 1;

/** Детерминированный шум без текстур: value noise на hash без синусов. */
const NOISE_GLSL = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 0.0)), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}
`;

const PEARL_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uDisplace;

varying vec3 vWorldPos;
varying vec3 vObjPos;
varying vec3 vNormalW;

${NOISE_GLSL}

void main() {
  vec3 n = normalize(normal);
  // Органика: поверхность не идеальная сфера, но дышит на доли процента.
  float d = vnoise(position * 1.6 + vec3(0.0, uTime * 0.035, 0.0));
  vec3 displaced = position + n * (d - 0.5) * uDisplace;
  vec4 world = modelMatrix * vec4(displaced, 1.0);

  vObjPos = position;
  vWorldPos = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const PEARL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uRelief;
uniform float uIridescence;

// Взаимодействие: свет курсора, простой и кольцевой буфер волн от касаний.
uniform vec3 uCursorDir;
uniform float uCursorI;
uniform float uIdle;

// Каждая волна: направление на точку касания, время старта в секундах uTime
// и зерно, которое чуть разводит скорость и толщину соседних волн.
uniform vec3 uWaveOrigin[${WAVE_SLOTS}];
uniform float uWaveStart[${WAVE_SLOTS}];
uniform float uWaveSeed[${WAVE_SLOTS}];

uniform vec3 uInk;
uniform vec3 uPlum;
uniform vec3 uMilk;
uniform vec3 uEmber;
uniform vec3 uPearl;

uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec3 uCounterDir;
uniform float uKeyI;
uniform float uFillI;
uniform float uCounterI;
uniform mat3 uObjectToWorld;

varying vec3 vWorldPos;
varying vec3 vObjPos;
varying vec3 vNormalW;

${NOISE_GLSL}

/**
 * Тонкоплёночная интерференция. Оптическая разность хода в нанометрах даёт
 * цвет по косинусам для R/G/B — та же модель, что в physically based iridescence:
 * чем толще плёнка и чем острее угол, тем выше порядок интерференции.
 */
vec3 thinFilm(float thicknessNm, float cosTheta) {
  float filmIor = 1.42;
  float cosRefr = sqrt(max(0.0, 1.0 - (1.0 - cosTheta * cosTheta) / (filmIor * filmIor)));
  float opd = 2.0 * filmIor * thicknessNm * cosRefr;
  vec3 cycles = opd / vec3(680.0, 550.0, 440.0);
  return 0.5 + 0.5 * cos(6.283185307 * cycles + 3.141592654);
}

float nacreField(vec3 p) {
  return 0.66 * vnoise(p * 2.0 + vec3(0.0, 0.7, 1.4))
       + 0.34 * vnoise(p * 4.6 + vec3(4.3, 2.1, 7.7));
}

void main() {
  // Микрорельеф: градиент шума по нормали. В объектном пространстве полярность
  // не важна — важна только кривизна, форма сферы остаётся.
  float f0 = nacreField(vObjPos);
  float eps = 0.16;
  vec3 grad = vec3(
    nacreField(vObjPos + vec3(eps, 0.0, 0.0)) - f0,
    nacreField(vObjPos + vec3(0.0, eps, 0.0)) - f0,
    nacreField(vObjPos + vec3(0.0, 0.0, eps)) - f0
  ) / eps;

  vec3 n = normalize(vNormalW);
  vec3 gradWorld = uObjectToWorld * grad;
  gradWorld -= n * dot(gradWorld, n);
  n = normalize(n - gradWorld * uRelief);

  // Волны от касаний: кольцевой буфер. Возраст каждой волны считается здесь от
  // uTime, поэтому несколько нажатий живут одновременно и не прерывают друг
  // друга. Кольцо — мягкая полоса: пологий фронт, шлейф и слабый внешний ореол.
  float waveRing = 0.0;
  vec3 waveBend = vec3(0.0);
  vec3 objDir = normalize(vObjPos);

  for (int i = 0; i < ${WAVE_SLOTS}; i += 1) {
    float age = uTime - uWaveStart[i];
    if (age >= 0.0 && age < ${WAVE_LIFE.toFixed(2)}) {
      float seed = uWaveSeed[i];
      // Затухание по smoothstep: основная фаза держится, хвост плавно гаснет.
      float env = 1.0 - smoothstep(0.15, 0.9, age / ${WAVE_LIFE.toFixed(2)});
      vec3 origin = uWaveOrigin[i];
      float arc = acos(clamp(dot(objDir, origin), -1.0, 1.0));
      // Зерно разводит волны: скорость ±15%, толщина шлейфа ±20%.
      // behind > 0 — гребень уже прошёл точку: фронт слева, шлейф справа.
      float behind = arc - age * 0.82 * (0.85 + 0.3 * seed);
      float tail = 0.1 * (0.8 + 0.4 * seed);
      // Гребень: мягкий фронт и быстрое затухание сразу за ним.
      float crest = smoothstep(-0.05, 0.01, behind) * exp(-max(0.0, behind) / 0.045);
      // Ореол: вчетверо слабее и вдвое длиннее — глубина без «проволоки».
      float halo = smoothstep(-0.09, 0.02, behind) * exp(-max(0.0, behind) / tail) * 0.12;
      float ring = crest + halo;
      waveRing += ring * env;
      // Нормаль ведёт блик по фронту, но сферу не мылит.
      vec3 tangent = normalize(origin - n * dot(n, origin) + vec3(0.0001));
      waveBend += tangent * (ring * env);
    }
  }

  // Мягкое насыщение: три и шесть волн не складываются в блёклое пятно.
  float waveLight = 1.0 - exp(-waveRing * 1.0);
  n = normalize(n + waveBend * (0.09 / max(1.0, length(waveBend))));

  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(n, V), 0.0, 1.0);

  float dKey = max(dot(n, uKeyDir), 0.0);
  float dFill = max(dot(n, uFillDir), 0.0);
  float dCounter = max(dot(n, uCounterDir), 0.0);

  float sunset = smoothstep(0.02, 0.9, dKey);
  float rimCoord = 1.0 - ndv;

  // 1. Обсидиановое ядро. Тёмное, но не проваливается в фон: плам-градиент
  //    и слабый контровой свет держат силуэт.
  vec3 albedo = mix(uInk, uPlum, 0.1 + 0.26 * f0);
  vec3 col = albedo;
  col += uPlum * 0.45 * (0.5 + 0.5 * dCounter) * uCounterI;
  col += uPlum * 0.7 * pow(dFill, 1.4) * uFillI;

  // 2. Закат: тёплый янтарь только на одной стороне.
  col += uEmber * pow(dKey, 1.3) * 0.0045 * uKeyI;

  // 3. Мягкий объём: широкий отклик на свет даёт поверхности глубину,
  //    не превращаясь в отдельную «полосу».
  vec3 hKey = normalize(uKeyDir + V);
  vec3 hFill = normalize(uFillDir + V);
  float glossKey = pow(max(dot(n, hKey), 0.0), 26.0);
  float glossFill = pow(max(dot(n, hFill), 0.0), 22.0);
  col += mix(uEmber, uMilk, 0.5) * glossKey * 0.03 * uKeyI;
  col += uPearl * glossFill * 0.05 * uFillI;

  // 4. Глянец: горячая точка + узкая доля вокруг неё.
  float specKey = pow(max(dot(n, hKey), 0.0), 6000.0);
  float specHalo = pow(max(dot(n, hKey), 0.0), 900.0);
  float specFill = pow(max(dot(n, hFill), 0.0), 380.0);

  col += uMilk * specKey * 2.6;
  col += uMilk * specHalo * 0.09;
  col += uPearl * specFill * 0.75;

  // 5. Тонкая плёнка по кромке. Физика — интерференция по косинусам:
  //    на сфере она даёт концентрические перламутровые полосы.
  //    Цвет плёнки ограничен палитрой: перламутр -> молоко -> янтарь.
  float filmMask = smoothstep(0.35, 1.0, rimCoord);
  float filmThickness = mix(300.0, 1050.0, rimCoord) + 120.0 * (f0 - 0.5);
  vec3 film = thinFilm(filmThickness, ndv);
  // Хромa плёнки циклична по толщине (в отличие от яркости), поэтому именно она
  // ведёт цвет: перламутр -> тёплый перламутр, без радуги вне палитры.
  float chroma = clamp(film.r - film.b + 0.5, 0.0, 1.0);
  vec3 filmColor = mix(uPearl, mix(uEmber, uMilk, 0.45), smoothstep(0.25, 0.8, chroma));
  float filmLevel = 0.7 + 0.3 * film.g;
  col += filmColor * filmMask * (0.5 + 0.16 * sunset) * filmLevel * uIridescence;

  // 6. Кромка: тёплый закатный rim на освещённой стороне, холодный — на теневой.
  //    Две составляющие: широкая подсветка и тонкая горячая линия по силуэту.
  //    В простое кромка дышит на ±9%; волна подсвечивает её только там, где
  //    проходит фронт (ring), поэтому янтарный rim не выцветает от серии кликов.
  float rimPulse = 1.0 + 0.09 * uIdle * sin(uTime * 0.55) + 0.12 * min(waveRing, 1.0);
  float rimBroad = pow(rimCoord, 8.0);
  float rimEdge = pow(rimCoord, 24.0);
  vec3 emberLight = mix(uEmber, uMilk, 0.28);
  col += emberLight * rimBroad * smoothstep(0.2, 0.95, dKey) * 0.28 * uKeyI * rimPulse;
  col += emberLight * rimEdge * smoothstep(0.2, 0.95, dKey) * 4.5 * uKeyI * rimPulse;
  col += uPearl * rimBroad * smoothstep(0.2, 0.95, dFill) * 0.4 * uFillI * rimPulse;
  col += uPearl * rimEdge * smoothstep(0.2, 0.95, dFill) * 1.4 * uFillI * rimPulse;

  // 7. Медленный блик: виртуальный источник обходит объект, свет скользит по жемчужине.
  //    В простое полоса дрейфует медленнее и дальше — материал «живёт» сам.
  float sweep = uTime * 0.1;
  float sweepDrift = uIdle * (0.3 + 0.3 * sin(uTime * 0.13));
  vec3 sweepDir = normalize(vec3(
    -0.72 + 0.22 * sin(sweep * 0.6),
    0.52,
    0.34 + 0.66 * cos(sweep * 0.5 + sweepDrift)
  ));
  vec3 hSweep = normalize(sweepDir + V);
  float glint = pow(max(dot(n, hSweep), 0.0), 90.0);
  float glintCore = pow(max(dot(n, hSweep), 0.0), 900.0);
  col += mix(uPearl, uMilk, 0.5) * glint * 0.08;
  col += uMilk * glintCore * 0.35;

  // 8. Свет пользователя. Курсор — это лампа: точка на поверхности под указателем
  //    получает мягкое пятно. Не точка: широкий отклик + тело + небольшое ядро,
  //    форма возмущена накром, чтобы пятно не читалось наклейкой.
  vec3 cursorDir = normalize(uCursorDir);
  float cursorNdl = max(dot(n, cursorDir), 0.0);
  float cursorShape = 0.68 + 0.62 * (f0 - 0.5);
  vec3 cursorTint = mix(uPearl, uMilk, 0.4 + 0.3 * sunset);
  col += cursorTint * pow(cursorNdl, 12.0) * 0.12 * cursorShape * uCursorI;
  col += cursorTint * pow(cursorNdl, 40.0) * 0.17 * cursorShape * uCursorI;
  col += uMilk * pow(cursorNdl, 260.0) * 0.62 * cursorShape * uCursorI;
  // Мягкий подъём освещённой курсором стороны: направление читается даже тогда,
  // когда пятно ушло на кромку.
  col += cursorTint * (0.5 + 0.5 * cursorNdl) * 0.035 * uCursorI;
  // Глянцевый отблеск того же источника по Блинну: пятно остаётся светом, а не краской.
  vec3 hCursor = normalize(cursorDir + V);
  col += uMilk * pow(max(dot(n, hCursor), 0.0), 220.0) * 0.34 * uCursorI;
  col += uEmber * pow(cursorNdl, 7.0) * 0.012 * sunset * uCursorI;

  // 9. Волны: светлые тонкие дуги по фронтам. Мягкое насыщение держит сумму
  //    на уровне одной волны — рябь по перламутру, а не мутное пятно.
  col += mix(uPearl, uMilk, 0.35) * waveLight * 0.3;

  // Зерно: статичное по пикселю, без мерцания. Работает как дизеринг —
  // без него тёмный градиент распадается на концентрические полосы.
  float grain = hash13(vec3(gl_FragCoord.xy, 1.0)) - 0.5;
  col += grain * 0.01;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type UniformValue<T> = THREE.IUniform<T>;

export type PearlUniforms = {
  uTime: UniformValue<number>;
  uDisplace: UniformValue<number>;
  uRelief: UniformValue<number>;
  uIridescence: UniformValue<number>;
  uInk: UniformValue<THREE.Color>;
  uPlum: UniformValue<THREE.Color>;
  uMilk: UniformValue<THREE.Color>;
  uEmber: UniformValue<THREE.Color>;
  uPearl: UniformValue<THREE.Color>;
  uKeyDir: UniformValue<THREE.Vector3>;
  uFillDir: UniformValue<THREE.Vector3>;
  uCounterDir: UniformValue<THREE.Vector3>;
  uKeyI: UniformValue<number>;
  uFillI: UniformValue<number>;
  uCounterI: UniformValue<number>;
  uObjectToWorld: UniformValue<THREE.Matrix3>;
  /** Направление от центра к указателю (мир). */
  uCursorDir: UniformValue<THREE.Vector3>;
  /** 0 — пользователь не у объекта, 1 — свет ведёт курсор. */
  uCursorI: UniformValue<number>;
  /** 0…1, простой: указатель не двигался дольше 4 с. */
  uIdle: UniformValue<number>;
  /** Точки касания в объектном пространстве: `WAVE_SLOTS` × 3 числа. */
  uWaveOrigin: UniformValue<Float32Array>;
  /** Время старта каждой волны в секундах `uTime`. */
  uWaveStart: UniformValue<Float32Array>;
  /** Зерно волны: разводит скорость и толщину соседних фронтов. */
  uWaveSeed: UniformValue<Float32Array>;
};

function direction([x, y, z]: Vec3): THREE.Vector3 {
  return new THREE.Vector3(x, y, z).normalize();
}

export function createPearlUniforms(options?: { iridescence?: number }): PearlUniforms {
  const iridescence = options?.iridescence ?? 1;

  // Все слоты стартуют «мёртвыми»: возраст больше жизни, вклад нулевой.
  const waveStart = new Float32Array(WAVE_SLOTS).fill(-WAVE_LIFE * 4);
  const waveSeed = new Float32Array(WAVE_SLOTS);

  return {
    uTime: { value: 0 },
    uDisplace: { value: 0.05 },
    uRelief: { value: 0.012 },
    uIridescence: { value: iridescence },
    uInk: { value: new THREE.Color(BRAND.ink) },
    uPlum: { value: new THREE.Color(BRAND.plum) },
    uMilk: { value: new THREE.Color(BRAND.milk) },
    uEmber: { value: new THREE.Color(BRAND.ember) },
    uPearl: { value: new THREE.Color(BRAND.pearl) },
    uKeyDir: { value: direction(PEARL_LIGHT_RIG.key.position) },
    uFillDir: { value: direction(PEARL_LIGHT_RIG.fill.position) },
    uCounterDir: { value: direction(PEARL_LIGHT_RIG.counter.position) },
    uKeyI: { value: PEARL_LIGHT_RIG.key.intensity },
    uFillI: { value: PEARL_LIGHT_RIG.fill.intensity },
    uCounterI: { value: PEARL_LIGHT_RIG.counter.intensity },
    uObjectToWorld: { value: new THREE.Matrix3() },
    uCursorDir: { value: new THREE.Vector3(0, 0.35, 1).normalize() },
    uCursorI: { value: 0 },
    uIdle: { value: 0 },
    uWaveOrigin: { value: new Float32Array(WAVE_SLOTS * 3) },
    uWaveStart: { value: waveStart },
    uWaveSeed: { value: waveSeed },
  };
}

export const PEARL_VERTEX_SHADER = PEARL_VERTEX;
export const PEARL_FRAGMENT_SHADER = PEARL_FRAGMENT;

