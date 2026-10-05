import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
// Natural Earth 1:50m land data are public domain: https://www.naturalearthdata.com/
import earthLandUrl from "@/assets/earth-land.png";
import {
  eclipticPole,
  hoopPoints,
  OBLIQUITY_DEG,
  sunBeam,
  type Vec3,
} from "@/lib/astro";
import {
  cameraUpForEdgeOnRoll,
  cameraUpForViewMode,
  clampEdgeOnRollDeg,
  edgeOnRollValueText,
  formatEdgeOnRollDeg,
  rollDegForKey,
  rollDegFromPointer,
  snapEdgeOnRollDeg,
} from "@/lib/edge-on-roll";
import { ephemerisAstronomyProvider } from "@/lib/astronomy/ephemeris-provider";
import type {
  AstronomyProviderSnapshot,
  OrbitalGeometryState,
} from "@/lib/astronomy/provider";
import {
  EARTH_DISPLAY_Z_SCALE,
  earthMeshYRotation,
  observerOverlayScaleForCameraRadius,
} from "@/lib/earth-map";
import { palette } from "@/lib/palette";
import { useMoon, type Snap } from "@/lib/store";

const HOOP = 2.25;
const EARTH = 0.56;
const HEAD_LEN = 0.18;
const HEAD_W = 0.13;
const SHAFT_W = 0.032;
const INK_DEPTH = 0.016;

type ViewMode = Snap | "free";
type OverlayProjection = {
  centre: readonly [number, number];
  pole: readonly [number, number];
  width: number;
  height: number;
};
type Api = {
  placeSnap: (snap: Snap) => void;
  setEdgeRoll: (rollDeg: number) => void;
};

function line(color: string) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(6), 3),
  );
  const mat = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geom, mat);
}

type EarthTextureHandle = {
  texture: THREE.CanvasTexture;
  cancelLoad: () => void;
};

function createEarthTexture(): EarthTextureHandle {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const project = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * w,
    ((90 - lat) / 180) * h,
  ];
  const land = (points: [number, number][]) => {
    ctx.beginPath();
    points.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawGraticule = () => {
    // Subtle latitude/longitude texture so the globe reads as a rotating Earth,
    // while still staying quiet behind the explanatory orbit geometry.
    ctx.strokeStyle = "rgba(183, 215, 230, 0.10)";
    ctx.lineWidth = 1;
    for (let lon = -150; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  const drawFallback = () => {
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, "#2e7198");
    ocean.addColorStop(0.5, "#18527d");
    ocean.addColorStop(1, "#0e355b");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = "#72a46f";
    ctx.strokeStyle = "rgba(238, 244, 220, 0.52)";
    ctx.lineWidth = 1.4;
    land([
      [-168, 72],
      [-135, 70],
      [-102, 56],
      [-72, 50],
      [-55, 25],
      [-82, 7],
      [-105, 16],
      [-125, 34],
      [-152, 50],
    ]); // North America
    land([
      [-82, 12],
      [-62, 8],
      [-47, -8],
      [-38, -23],
      [-55, -55],
      [-72, -45],
      [-80, -15],
    ]); // South America
    land([
      [-10, 72],
      [42, 70],
      [82, 55],
      [122, 56],
      [154, 42],
      [142, 12],
      [106, 4],
      [78, 22],
      [42, 12],
      [18, 35],
      [-8, 36],
    ]); // Eurasia
    land([
      [-18, 34],
      [10, 35],
      [35, 14],
      [44, -12],
      [28, -35],
      [16, -34],
      [2, -8],
      [-12, 6],
    ]); // Africa
    land([
      [112, -10],
      [154, -20],
      [146, -42],
      [118, -39],
      [108, -24],
    ]); // Australia
    land([
      [-52, 72],
      [-22, 76],
      [-16, 62],
      [-44, 58],
    ]); // Greenland
    land([
      [-180, -68],
      [-90, -72],
      [0, -70],
      [90, -72],
      [180, -68],
      [180, -90],
      [-180, -90],
    ]); // Antarctica
    ctx.restore();
    drawGraticule();
  };

  drawFallback();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  let active = true;
  const image = new Image();
  image.onload = () => {
    if (!active) return;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, w, h);
    ctx.restore();
    drawGraticule();
    texture.needsUpdate = true;
  };
  image.onerror = () => {
    if (!active) return;
  };
  image.src = earthLandUrl;

  return {
    texture,
    cancelLoad() {
      active = false;
      image.onload = null;
      image.onerror = null;
    },
  };
}

function createEarthMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 sunDir;
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec3 base = texture2D(map, vUv).rgb;
        float facingSun = dot(normalize(vWorldNormal), normalize(sunDir));

        // A narrow twilight band around the geometric terminator. Values below
        // the band are night, values above are full day; inside the band blends
        // smoothly so the boundary reads as dusk/dawn, not as a drawn line.
        float day = smoothstep(-0.12, 0.12, facingSun);
        float dusk = 1.0 - abs(day * 2.0 - 1.0);

        vec3 nightTint = vec3(0.045, 0.085, 0.15);
        vec3 night = base * 0.26 + nightTint;
        vec3 daylight = base * 1.45 + vec3(0.055, 0.07, 0.045);
        vec3 twilight = mix(night, daylight, day) + vec3(0.20, 0.13, 0.055) * dusk;
        vec3 color = mix(mix(night, daylight, day), twilight, dusk * 0.75);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function setLoop(mesh: THREE.Line, units: Vec3[], radius: number) {
  const data = new Float32Array((units.length + 1) * 3);
  units.forEach((p, i) => {
    data[i * 3] = p[0] * radius;
    data[i * 3 + 1] = p[1] * radius;
    data[i * 3 + 2] = p[2] * radius;
  });
  const last = units.length;
  data[last * 3] = data[0]!;
  data[last * 3 + 1] = data[1]!;
  data[last * 3 + 2] = data[2]!;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BufferGeometry();
  mesh.geometry.setAttribute("position", new THREE.BufferAttribute(data, 3));
}

function setSeg(mesh: THREE.Line, a: Vec3, b: Vec3) {
  const attr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const data = attr.array as Float32Array;
  data[0] = a[0];
  data[1] = a[1];
  data[2] = a[2];
  data[3] = b[0];
  data[4] = b[1];
  data[5] = b[2];
  attr.needsUpdate = true;
}

/** Arrowhead as a thin prism. Local +Y is the light direction, local X the width in the ecliptic, local Z the ecliptic pole. */
function chevronPrism(length: number, width: number, depth: number) {
  const hw = width / 2;
  const hl = length / 2;
  const hd = depth / 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        0,
        hl,
        hd,
        hw,
        -hl,
        hd,
        -hw,
        -hl,
        hd,
        0,
        hl,
        -hd,
        hw,
        -hl,
        -hd,
        -hw,
        -hl,
        -hd,
      ]),
      3,
    ),
  );
  g.setIndex([
    0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2,
  ]);
  return g;
}

/** Default three-quarter camera, used by the SVG stand-in before WebGL paints. */
function project(p: Vec3, w: number, h: number): [number, number] {
  const theta = 0.78;
  const phi = 1.02;
  const radius = 6.4;
  const cam: Vec3 = [
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta),
  ];
  const flen = Math.hypot(cam[0], cam[1], cam[2]) || 1;
  const f: Vec3 = [-cam[0] / flen, -cam[1] / flen, -cam[2] / flen];
  const upHint: Vec3 = [0, 1, 0];
  let rx = f[1] * upHint[2] - f[2] * upHint[1];
  let ry = f[2] * upHint[0] - f[0] * upHint[2];
  let rz = f[0] * upHint[1] - f[1] * upHint[0];
  const rlen = Math.hypot(rx, ry, rz) || 1;
  rx /= rlen;
  ry /= rlen;
  rz /= rlen;
  const ux = ry * f[2] - rz * f[1];
  const uy = rz * f[0] - rx * f[2];
  const uz = rx * f[1] - ry * f[0];
  const rel: Vec3 = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
  const x = rel[0] * rx + rel[1] * ry + rel[2] * rz;
  const y = rel[0] * ux + rel[1] * uy + rel[2] * uz;
  const z = rel[0] * f[0] + rel[1] * f[1] + rel[2] * f[2];
  const s = h / 2 / Math.tan((40 * Math.PI) / 180 / 2);
  const depth = z === 0 ? 0.001 : z;
  return [w / 2 + (x / depth) * s, h / 2 - (y / depth) * s];
}

function ringPath(units: Vec3[], radius: number, w: number, h: number) {
  const pts = units.map((u) =>
    project([u[0] * radius, u[1] * radius, u[2] * radius], w, h),
  );
  const [x, y] = pts[0]!;
  return (
    `M ${x.toFixed(1)} ${y.toFixed(1)} ` +
    pts
      .slice(1)
      .map(([px, py]) => `L ${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(" ") +
    " Z"
  );
}

function arrow2d(tail: Vec3, head: Vec3, w: number, h: number) {
  const a = project(tail, w, h);
  const b = project(head, w, h);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const hl = 9;
  const hw = 4.2;
  const bx = b[0] - ux * hl;
  const by = b[1] - uy * hl;
  return {
    line: `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}`,
    head: `M ${b[0].toFixed(1)} ${b[1].toFixed(1)} L ${(bx + px * hw).toFixed(1)} ${(by + py * hw).toFixed(1)} L ${(bx - px * hw).toFixed(1)} ${(by - py * hw).toFixed(1)} Z`,
  };
}

export function SpaceScene({
  snapshot,
  orbitInstant,
}: {
  snapshot: AstronomyProviderSnapshot;
  orbitInstant: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const drawRef = useRef<(rot: number, orb: number) => void>(() => {});
  const sharedGeometryRef = useRef<OrbitalGeometryState>({
    orbitInstant,
    d: snapshot.d,
    sunGeocentricUnit: snapshot.sun.geocentricUnit,
    moonGeocentricUnit: snapshot.moon.geocentricUnit,
  });
  useLayoutEffect(() => {
    sharedGeometryRef.current = {
      orbitInstant,
      d: snapshot.d,
      sunGeocentricUnit: snapshot.sun.geocentricUnit,
      moonGeocentricUnit: snapshot.moon.geocentricUnit,
    };
  }, [
    orbitInstant,
    snapshot.d,
    snapshot.moon.geocentricUnit,
    snapshot.sun.geocentricUnit,
  ]);
  const [failed, setFailed] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("oblique");
  const [edgeRollDeg, setEdgeRollDeg] = useState(0);
  const edgeRollDegRef = useRef(0);
  const [overlayProjection, setOverlayProjection] =
    useState<OverlayProjection | null>(null);
  const [rollHovered, setRollHovered] = useState(false);
  const [rollFocused, setRollFocused] = useState(false);
  const [rollInteracting, setRollInteracting] = useState(false);
  const activeRollPointerRef = useRef<number | null>(null);
  const activeRollTargetRef = useRef<SVGCircleElement | null>(null);
  const rollTargetRef = useRef<SVGCircleElement>(null);
  const d = snapshot.d;

  useEffect(() => {
    let rot = useMoon.getState().instant;
    let orb = useMoon.getState().orbit;
    let publishedRot = rot;
    let publishedOrb = orb;
    let mode = useMoon.getState().playing;
    let slideOrigin = rot;
    let dayFrac = 0;
    let lastPush = 0;
    let then = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - then) / 1000);
      then = now;
      const store = useMoon.getState();
      if (store.playing === "none") {
        if (store.instant !== publishedRot || store.orbit !== publishedOrb) {
          rot = store.instant;
          orb = store.orbit;
          publishedRot = rot;
          publishedOrb = orb;
          dayFrac = 0;
        }
        mode = "none";
      } else {
        if (mode !== store.playing) {
          if (store.playing === "slide") {
            slideOrigin = rot;
            dayFrac = (orb - rot) / 86_400_000;
          }
          mode = store.playing;
        }
        if (store.playing === "spin") {
          const step = dt * (store.spinHours || 2) * 3_600_000;
          rot += step;
          orb += step;
        } else {
          dayFrac += dt * 1.05;
          rot = slideOrigin + Math.floor(dayFrac) * 86_400_000;
          orb = slideOrigin + dayFrac * 86_400_000;
        }
        if (now - lastPush > 80) {
          publishedRot = rot;
          publishedOrb = orb;
          lastPush = now;
          useMoon.setState({ instant: rot, orbit: orb });
        }
      }
      drawRef.current(rot, orb);
    };
    tick(performance.now());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 block h-full w-full touch-none";
    canvas.setAttribute(
      "aria-label",
      "Rotatable Earth with equator, ecliptic, and Moon orbit",
    );
    host.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(palette.bg, 1);
    setWebglReady(true);

    const scene = new THREE.Scene();
    // Equatorial vectors use +Z for increasing right ascension. Reflecting the
    // rendered model keeps north up while making east appear on the familiar
    // right-hand side of the globe; all model geometry stays mutually aligned.
    scene.scale.z = EARTH_DISPLAY_Z_SCALE;
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sunLight = new THREE.DirectionalLight(0xfff4dd, 1.15);
    scene.add(sunLight);

    const equator = line(palette.equator);
    const ecliptic = line(palette.gold);
    const lunar = line(palette.silver);
    const axis = line(palette.cream);
    const sight = line(palette.silver);
    (sight.material as THREE.LineBasicMaterial).transparent = true;
    (sight.material as THREE.LineBasicMaterial).opacity = 0.45;
    const guide = line(palette.gold);
    (guide.material as THREE.LineBasicMaterial).transparent = true;
    (guide.material as THREE.LineBasicMaterial).opacity = 0.45;
    scene.add(equator, ecliptic, lunar, axis, sight, guide);

    const sample = sunBeam([1, 0, 0]);
    const fullLen = Math.hypot(
      sample[0]!.head[0] - sample[0]!.tail[0],
      sample[0]!.head[1] - sample[0]!.tail[1],
      sample[0]!.head[2] - sample[0]!.tail[2],
    );
    const shaftLen = fullLen - HEAD_LEN;
    const ink = new THREE.MeshBasicMaterial({
      color: palette.gold,
      side: THREE.DoubleSide,
    });
    const shaftGeom = new THREE.BoxGeometry(
      SHAFT_W,
      shaftLen + 0.012,
      INK_DEPTH,
    );
    const headGeom = chevronPrism(HEAD_LEN, HEAD_W, INK_DEPTH);
    const shafts = sample.map(() => {
      const mesh = new THREE.Mesh(shaftGeom, ink);
      scene.add(mesh);
      return mesh;
    });
    const heads = sample.map(() => {
      const mesh = new THREE.Mesh(headGeom, ink);
      scene.add(mesh);
      return mesh;
    });

    const earthTextureHandle = createEarthTexture();
    const earthTexture = earthTextureHandle.texture;
    const earthMaterial = createEarthMaterial(earthTexture);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH, 96, 64),
      earthMaterial,
    );
    const figure = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 24),
      new THREE.MeshBasicMaterial({
        color: palette.cream,
        side: THREE.DoubleSide,
      }),
    );
    const pole = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshBasicMaterial({ color: palette.cream }),
    );
    pole.position.set(0, 1.32, 0);
    const plate = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.19, 48),
      new THREE.MeshBasicMaterial({
        color: palette.cream,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 32, 24),
      new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.55 }),
    );
    const dark = new THREE.Mesh(
      new THREE.SphereGeometry(0.113, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: palette.ink }),
    );
    moon.add(dark);
    scene.add(earth, figure, plate, moon, pole);

    let theta = 0.78;
    let phi = 1.02;
    let radius = 6.4;
    let localViewMode: ViewMode = "oblique";
    let localEdgeRollDeg = 0;
    const cameraView = new THREE.Vector3();
    const earthCentreProjection = new THREE.Vector3();
    const northTipProjection = new THREE.Vector3();
    const celestialNorth: Vec3 = [0, 1, 0];
    const eclipticNorth = eclipticPole();
    const publishOverlayProjection = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      earthCentreProjection.set(0, 0, 0).project(camera);
      northTipProjection.set(0, 1.32, 0).project(camera);
      setOverlayProjection({
        centre: [
          (earthCentreProjection.x * 0.5 + 0.5) * width,
          (-earthCentreProjection.y * 0.5 + 0.5) * height,
        ],
        pole: [
          (northTipProjection.x * 0.5 + 0.5) * width,
          (-northTipProjection.y * 0.5 + 0.5) * height,
        ],
        width,
        height,
      });
    };
    const place = () => {
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta),
      );
      cameraView.copy(camera.position).multiplyScalar(-1).normalize();
      const edgeCameraUp = cameraUpForEdgeOnRoll(
        [cameraView.x, cameraView.y, cameraView.z],
        celestialNorth,
        eclipticNorth,
        localEdgeRollDeg,
      );
      camera.up.fromArray(
        cameraUpForViewMode(
          localViewMode,
          [camera.up.x, camera.up.y, camera.up.z],
          edgeCameraUp,
        ),
      );
      camera.lookAt(0, 0, 0);
      const overlayScale = observerOverlayScaleForCameraRadius(radius);
      figure.scale.setScalar(overlayScale.figure);
      plate.scale.setScalar(overlayScale.plate);
      camera.updateMatrixWorld();
      publishOverlayProjection();
    };
    place();
    apiRef.current = {
      placeSnap(snap) {
        localViewMode = snap;
        localEdgeRollDeg = 0;
        edgeRollDegRef.current = 0;
        setViewMode(snap);
        setEdgeRollDeg(0);
        if (snap === "oblique") {
          theta = 0.78;
          phi = 1.02;
          radius = 6.4;
        } else if (snap === "edge") {
          theta = 1.57;
          phi = 1.57;
          radius = 6.6;
        } else {
          theta = 0.02;
          phi = 0.12;
          radius = 11;
        }
        place();
      },
      setEdgeRoll(rollDeg) {
        if (localViewMode !== "edge") return;
        localEdgeRollDeg = clampEdgeOnRollDeg(rollDeg);
        edgeRollDegRef.current = localEdgeRollDeg;
        setEdgeRollDeg(localEdgeRollDeg);
        place();
      },
    };

    let dragging = false;
    let canvasPointerId: number | null = null;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      canvasPointerId = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      if (localViewMode !== "free") {
        localViewMode = "free";
        localEdgeRollDeg = 0;
        edgeRollDegRef.current = 0;
        setViewMode("free");
        setEdgeRollDeg(0);
      }
      theta -= (e.clientX - lx) * 0.008;
      phi = Math.min(
        Math.PI - 0.08,
        Math.max(0.12, phi + (e.clientY - ly) * 0.008),
      );
      lx = e.clientX;
      ly = e.clientY;
      place();
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (canvasPointerId === e.pointerId) canvasPointerId = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.min(12, Math.max(1.5, radius + e.deltaY * 0.008));
      place();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });

    const poleV = new THREE.Vector3(...eclipticPole());
    const sunV = new THREE.Vector3();
    const sideV = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const aim = new THREE.Quaternion();
    const pos = new THREE.Vector3();

    let hoopKey = "";
    let cachedOrbitalGeometry = sharedGeometryRef.current;
    const draw = (rotation: number, orbitAt: number) => {
      const live = useMoon.getState();
      if (cachedOrbitalGeometry.orbitInstant !== orbitAt) {
        const sharedGeometry = sharedGeometryRef.current;
        cachedOrbitalGeometry =
          sharedGeometry.orbitInstant === orbitAt
            ? sharedGeometry
            : ephemerisAstronomyProvider.orbitalGeometry(orbitAt);
      }
      const key = `${Math.floor(cachedOrbitalGeometry.d)}`;
      if (key !== hoopKey) {
        hoopKey = key;
        setLoop(
          equator,
          hoopPoints("equator", cachedOrbitalGeometry.d, 128),
          HOOP,
        );
        setLoop(
          ecliptic,
          hoopPoints("ecliptic", cachedOrbitalGeometry.d, 128),
          HOOP,
        );
        setLoop(lunar, hoopPoints("moon", cachedOrbitalGeometry.d, 160), HOOP);
        setSeg(axis, [0, -1.25, 0], [0, 1.32, 0]);
      }
      const sunUnit = cachedOrbitalGeometry.sunGeocentricUnit;
      const moonUnit = cachedOrbitalGeometry.moonGeocentricUnit;
      const moonPos: Vec3 = [
        moonUnit[0] * HOOP,
        moonUnit[1] * HOOP,
        moonUnit[2] * HOOP,
      ];
      const greenwich = ephemerisAstronomyProvider.observerZenith(
        rotation,
        0,
        0,
      );
      earth.rotation.y = earthMeshYRotation(
        Math.atan2(greenwich[2], greenwich[0]),
      );
      // Shader uniforms are world-space and do not inherit scene.scale.
      (earthMaterial.uniforms.sunDir.value as THREE.Vector3)
        .set(sunUnit[0], sunUnit[1], EARTH_DISPLAY_Z_SCALE * sunUnit[2])
        .normalize();
      moon.position.set(moonPos[0], moonPos[1], moonPos[2]);
      const away = new THREE.Vector3(
        -sunUnit[0],
        -sunUnit[1],
        -sunUnit[2],
      ).normalize();
      dark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), away);
      sunLight.position.set(sunUnit[0] * 8, sunUnit[1] * 8, sunUnit[2] * 8);
      const zen = new THREE.Vector3(
        ...ephemerisAstronomyProvider.observerZenith(
          rotation,
          live.lat,
          live.lon,
        ),
      );
      figure.position.copy(zen).multiplyScalar(EARTH + 0.025);
      figure.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        zen.clone().normalize(),
      );
      plate.position.copy(zen).multiplyScalar(EARTH + 0.012);
      plate.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        zen.clone().normalize(),
      );
      setSeg(sight, [zen.x * EARTH, zen.y * EARTH, zen.z * EARTH], moonPos);
      const beam = sunBeam(sunUnit);
      sunV.set(sunUnit[0], sunUnit[1], sunUnit[2]);
      sideV.crossVectors(poleV, sunV).normalize();
      dir.copy(sunV).negate();
      basis.makeBasis(sideV, dir, poleV);
      aim.setFromRotationMatrix(basis);
      for (let i = 0; i < beam.length; i++) {
        const ray = beam[i]!;
        const shaft = shafts[i]!;
        const head = heads[i]!;
        pos
          .set(ray.tail[0], ray.tail[1], ray.tail[2])
          .addScaledVector(dir, (shaftLen + 0.012) / 2);
        shaft.position.copy(pos);
        shaft.quaternion.copy(aim);
        pos
          .set(ray.head[0], ray.head[1], ray.head[2])
          .addScaledVector(dir, -HEAD_LEN / 2);
        head.position.copy(pos);
        head.quaternion.copy(aim);
      }
      const mid = beam[2]!;
      const reach = Math.hypot(mid.head[0], mid.head[1], mid.head[2]) || 1;
      const stop = (EARTH + 0.1) / reach;
      setSeg(guide, mid.head, [
        mid.head[0] * stop,
        mid.head[1] * stop,
        mid.head[2] * stop,
      ]);
      renderer.render(scene, camera);
    };
    drawRef.current = draw;

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      place();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    const live = useMoon.getState();
    draw(live.instant, live.orbit);

    return () => {
      drawRef.current = () => {};
      apiRef.current = null;
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      if (
        canvasPointerId !== null &&
        canvas.hasPointerCapture(canvasPointerId)
      ) {
        canvas.releasePointerCapture(canvasPointerId);
      }
      shaftGeom.dispose();
      headGeom.dispose();
      ink.dispose();
      earthMaterial.dispose();
      earthTextureHandle.cancelLoad();
      earthTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  const snap = useMoon((s) => s.snap);
  const snapTick = useMoon((s) => s.snapTick);
  useEffect(() => {
    apiRef.current?.placeSnap(snap);
  }, [snap, snapTick]);

  useEffect(
    () => () => {
      const pointerId = activeRollPointerRef.current;
      const target = activeRollTargetRef.current;
      if (pointerId !== null && target?.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      activeRollPointerRef.current = null;
      activeRollTargetRef.current = null;
    },
    [viewMode],
  );

  const rollFromPointerEvent = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (!overlayProjection || !hostRef.current) return edgeRollDegRef.current;
    const rect = hostRef.current.getBoundingClientRect();
    return clampEdgeOnRollDeg(
      rollDegFromPointer(overlayProjection.centre, [
        event.clientX - rect.left,
        event.clientY - rect.top,
      ]),
    );
  };
  const onRollPointerDown = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    activeRollPointerRef.current = event.pointerId;
    activeRollTargetRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    setRollInteracting(true);
    apiRef.current?.setEdgeRoll(rollFromPointerEvent(event));
  };
  const onRollPointerMove = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (activeRollPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    apiRef.current?.setEdgeRoll(rollFromPointerEvent(event));
  };
  const finishRollPointer = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (activeRollPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    apiRef.current?.setEdgeRoll(snapEdgeOnRollDeg(edgeRollDegRef.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeRollPointerRef.current = null;
    activeRollTargetRef.current = null;
    setRollInteracting(false);
  };
  const onRollKeyDown = (event: ReactKeyboardEvent<SVGCircleElement>) => {
    const next = rollDegForKey(edgeRollDegRef.current, event.key);
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    apiRef.current?.setEdgeRoll(next);
  };

  const w = 640;
  const h = 480;
  const eq = ringPath(hoopPoints("equator", d, 80), HOOP, w, h);
  const ec = ringPath(hoopPoints("ecliptic", d, 80), HOOP, w, h);
  const mo = ringPath(hoopPoints("moon", d, 96), HOOP, w, h);
  const beam = sunBeam(snapshot.sun.geocentricUnit);
  const arrows = beam.map((ray) => arrow2d(ray.tail, ray.head, w, h));
  const mid = beam[2]!;
  const reach = Math.hypot(mid.head[0], mid.head[1], mid.head[2]) || 1;
  const stop = (EARTH + 0.1) / reach;
  const guideA = project(mid.head, w, h);
  const guideB = project(
    [mid.head[0] * stop, mid.head[1] * stop, mid.head[2] * stop],
    w,
    h,
  );
  const guidePath = `M ${guideA[0].toFixed(1)} ${guideA[1].toFixed(1)} L ${guideB[0].toFixed(1)} ${guideB[1].toFixed(1)}`;
  const moonDot = project(
    [
      snapshot.moon.geocentricUnit[0] * HOOP,
      snapshot.moon.geocentricUnit[1] * HOOP,
      snapshot.moon.geocentricUnit[2] * HOOP,
    ],
    w,
    h,
  );
  const earthDot = project([0, 0, 0], w, h);

  const annotationVisible =
    edgeRollDeg > 0 || rollHovered || rollFocused || rollInteracting;
  const showFullSweep =
    edgeRollDeg === 0 && !rollInteracting && (rollHovered || rollFocused);
  const arcAngleDeg = showFullSweep ? OBLIQUITY_DEG : edgeRollDeg;
  const arcAngleRad = (arcAngleDeg * Math.PI) / 180;
  const valueAngleRad = (edgeRollDeg * Math.PI) / 180;
  const rollArcRadius = overlayProjection
    ? Math.hypot(
        overlayProjection.pole[0] - overlayProjection.centre[0],
        overlayProjection.pole[1] - overlayProjection.centre[1],
      ) + 10
    : 0;
  const rollArcPath = overlayProjection
    ? `M ${overlayProjection.centre[0].toFixed(1)} ${(overlayProjection.centre[1] - rollArcRadius).toFixed(1)} A ${rollArcRadius.toFixed(1)} ${rollArcRadius.toFixed(1)} 0 0 1 ${(overlayProjection.centre[0] + Math.sin(arcAngleRad) * rollArcRadius).toFixed(1)} ${(overlayProjection.centre[1] - Math.cos(arcAngleRad) * rollArcRadius).toFixed(1)}`
    : "";
  const valueRadius = rollArcRadius + 17;
  const valueX = overlayProjection
    ? overlayProjection.centre[0] + Math.sin(valueAngleRad) * valueRadius
    : 0;
  const valueY = overlayProjection
    ? overlayProjection.centre[1] - Math.cos(valueAngleRad) * valueRadius
    : 0;
  const annotationOpacity = !annotationVisible
    ? 0
    : rollInteracting || rollHovered || rollFocused
      ? showFullSweep
        ? 0.46
        : 0.92
      : 0.58;

  return (
    <div
      ref={hostRef}
      data-share-orbit-scene
      className="relative h-full w-full"
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d={eq}
          fill="none"
          stroke="var(--color-equator)"
          strokeWidth={2.6}
        />
        <path d={ec} fill="none" stroke="var(--color-gold)" strokeWidth={2.6} />
        <path
          d={mo}
          fill="none"
          stroke="var(--color-silver)"
          strokeWidth={2.4}
        />
        <path
          d={guidePath}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={1.25}
          opacity={0.55}
        />
        {arrows.map((ray, i) => (
          <g key={i}>
            <path
              d={ray.line}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <path d={ray.head} fill="var(--color-gold)" />
          </g>
        ))}
        <circle
          cx={earthDot[0].toFixed(1)}
          cy={earthDot[1].toFixed(1)}
          r={18}
          fill="var(--color-line)"
        />
        <circle
          cx={moonDot[0].toFixed(1)}
          cy={moonDot[1].toFixed(1)}
          r={6}
          fill="var(--color-silver)"
        />
      </svg>
      {webglReady && !failed && viewMode === "edge" && overlayProjection ? (
        <svg
          viewBox={`0 0 ${overlayProjection.width} ${overlayProjection.height}`}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          aria-hidden="false"
        >
          <g
            className="pointer-events-none transition-opacity duration-700 motion-reduce:transition-none"
            style={{ opacity: annotationOpacity }}
            aria-hidden="true"
          >
            <path
              d={rollArcPath}
              fill="none"
              stroke="var(--color-cream)"
              strokeWidth={1.15}
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
            <text
              x={valueX}
              y={valueY}
              fill="var(--color-cream)"
              fontSize={12}
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatEdgeOnRollDeg(edgeRollDeg)}
            </text>
          </g>
          <circle
            ref={rollTargetRef}
            cx={overlayProjection.pole[0]}
            cy={overlayProjection.pole[1]}
            r={22}
            fill="transparent"
            stroke="transparent"
            role="slider"
            tabIndex={0}
            aria-label="Edge-on level angle"
            aria-valuemin={0}
            aria-valuemax={OBLIQUITY_DEG}
            aria-valuenow={edgeRollDeg}
            aria-valuetext={edgeOnRollValueText(edgeRollDeg)}
            aria-orientation="horizontal"
            className="pointer-events-auto cursor-grab touch-none focus-visible:stroke-gold focus-visible:stroke-2 focus-visible:outline-none active:cursor-grabbing"
            onPointerEnter={() => setRollHovered(true)}
            onPointerLeave={() => setRollHovered(false)}
            onFocus={() => setRollFocused(true)}
            onBlur={() => setRollFocused(false)}
            onKeyDown={onRollKeyDown}
            onPointerDown={onRollPointerDown}
            onPointerMove={onRollPointerMove}
            onPointerUp={finishRollPointer}
            onPointerCancel={finishRollPointer}
            onLostPointerCapture={() => {
              activeRollPointerRef.current = null;
              activeRollTargetRef.current = null;
              setRollInteracting(false);
            }}
          />
        </svg>
      ) : null}
      {failed ? (
        <p className="pointer-events-none absolute right-3 bottom-3 text-xs text-muted">
          WebGL is off — this is the flat stand-in.
        </p>
      ) : null}
    </div>
  );
}
