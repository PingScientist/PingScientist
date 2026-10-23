import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DURATION_SECONDS,
  DIVIDER_Y,
  HORIZONTAL_BASELINES,
  VERTICAL_BASELINES,
  WIDTH,
  gridPathsAt,
  validateTimeline,
} from "./profile-header-grid-field.mjs";
import { MOTION_PARTICLES, STATIC_PARTICLES } from "./header-particles.mjs";
import {
  TYPE_DEFS,
  TYPE_LAYER,
  TYPE_MICRO,
  TYPE_STATIC,
} from "./header-type.mjs";

// ---------------------------------------------------------------------------
// One header, every theme.
//
// The previous header painted #07111f edge to edge and shipped as a dark/light
// GIF pair, so it only ever matched two of GitHub's canvases and broke apart
// whenever the viewer's OS scheme disagreed with their GitHub theme. This file
// has no background at all: the page shows through, so it is correct on dark,
// light, dimmed and high-contrast alike, and needs no <picture> switch.
//
// Keeping one file forces every colour to work on both #0d1117 and #ffffff.
// A single opaque colour cannot be subtle on both - the best contrast any one
// colour can achieve against both canvases is 4.35:1, far too loud for a
// background grid. So the grid is a mid grey drawn at low opacity and lets the
// page tint it: ~1.4:1 over dark, ~1.2:1 over light. The particles do need to
// be seen, and the three fills below clear 3:1 on both canvases.
// ---------------------------------------------------------------------------

const KEYFRAME_COUNT = 21; // integer seconds 0..20; t=20 is t=0 again

const VIEW = {
  y: DIVIDER_Y, // the field is flat above this line, so it is a clean top edge
  height: 235, // was 320; the PROFILE / 00 label and its divider are gone
};

const PALETTE = {
  // The field carries no theme. It is a mid grey at low opacity and lets the
  // page tint it, so it is correct on every GitHub canvas at once.
  grid: "#8b949e",
  gridOpacity: ["0.17", "0.24", "0.20", "0.23", "0.17"],
  cyan: "#0d9488", // 5.1:1 on #0d1117, 3.7:1 on #ffffff
  gold: "#a97e1f", // 5.1:1 on #0d1117, 3.7:1 on #ffffff
  neutral: "#7d8590", // 5.1:1 on #0d1117, 3.7:1 on #ffffff
};

// Type cannot work that way. The subtitle is 16px, so it needs 4.5:1, and no
// single colour reaches 4.5:1 against both #0d1117 and #ffffff - the best any
// one colour manages against both is 4.35:1. So the type switches on the
// viewer's colour scheme, which works inside an SVG loaded as an <img>.
//
// The cost is the familiar one: prefers-color-scheme follows the OS, not the
// GitHub theme, so a viewer who runs a light OS with GitHub set to dark gets
// dark type on a dark page. Setting NEUTRAL_TYPE to true trades the bright
// title for one mid grey that is never wrong on any canvas, at 4.35:1 - and
// never as crisp.
const NEUTRAL_TYPE = false;

const TYPE = {
  dark: {
    title: "#e6edf3",
    subtitle: "#adbac7",
    quiet: "#8b949e",
    cyan: "#42d6c5",
    gold: "#c7a85a",
  },
  light: {
    title: "#1f2328",
    subtitle: "#424a53",
    quiet: "#636c76",
    cyan: "#0f766e",
    gold: "#8a6a20",
  },
  neutral: {
    title: "#6e7781",
    subtitle: "#6e7781",
    quiet: "#6e7781",
    cyan: "#0d9488",
    gold: "#a97e1f",
  },
};

function typeRules(theme) {
  return `    .title-text { fill: ${theme.title}; }
    .subtitle { fill: ${theme.subtitle}; }
    .quiet { fill: ${theme.quiet}; }
    .cyan-fill { fill: ${theme.cyan}; }
    .gold-fill { fill: ${theme.gold}; }
    .gold-stroke { stroke: ${theme.gold}; }`;
}

function typeStylesheet() {
  if (NEUTRAL_TYPE) {
    return typeRules(TYPE.neutral);
  }
  return `${typeRules(TYPE.dark)}

    @media (prefers-color-scheme: light) {
${typeRules(TYPE.light)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
    }`;
}

// ---------------------------------------------------------------------------
// Particle orbits
//
// The original motion paths are closed polylines whose vertices are bounces
// off the title glyphs, via text-collision-mask. The title is Markdown now,
// so there is nothing left to bounce off and the corners are vestigial - and
// they were never smooth: with calcMode="paced" the particle crosses a 176
// degree reversal at full speed, flipping direction instantly.
//
// Interpolating a spline through those same vertices does not fix it. A
// Catmull-Rom tangent at vertex B is parallel to C - A, and a near-reversal
// means C is back where A was, so the tangent vanishes and the curve forms a
// cusp - sharper than the corner it replaced.
//
// So each particle gets a closed orbit that is smooth by construction: a sum
// of three harmonics in theta, which is periodic and infinitely
// differentiable, sampled into cubic Beziers using its exact derivative. Each
// orbit is scaled to the extent of the polyline it replaces and offset so
// that theta = 0 sits at the origin, which keeps the composition's spread and
// keeps every particle's hand-placed start point and burst hand-off intact.
// ---------------------------------------------------------------------------

const ORBIT_SAMPLES = 28;
const ORBIT_SEED = 0x5c1e;
const HARMONIC_FALLOFF = [1, 0.38, 0.14];

function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polylineExtent(d) {
  const points = [...d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map(
    (match) => ({ x: Number(match[1]), y: Number(match[2]) }),
  );
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function makeHarmonics(random) {
  return HARMONIC_FALLOFF.map((falloff) => ({
    ax: falloff * (0.82 + 0.36 * random()),
    ay: falloff * (0.82 + 0.36 * random()),
    px: random() * Math.PI * 2,
    py: random() * Math.PI * 2,
  }));
}

function orbitAt(harmonics, theta) {
  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = 0;
  harmonics.forEach(({ ax, ay, px, py }, index) => {
    const n = index + 1;
    x += ax * Math.cos(n * theta + px);
    y += ay * Math.sin(n * theta + py);
    dx -= n * ax * Math.sin(n * theta + px);
    dy += n * ay * Math.cos(n * theta + py);
  });
  return { x, y, dx, dy };
}

// Reject a shape whose parametric speed collapses anywhere: that is where a
// visible stall or a near-cusp would appear. This has to be measured on the
// *scaled* orbit - squashing a round curve into a wide, flat one is itself a
// way to manufacture a near-cusp, which is why the aspect ratio is capped.
const MIN_SPEED_RATIO = 0.4;
const MAX_ASPECT = 1.8;

function scaledSpeedRatio(harmonics, scaleX, scaleY) {
  let min = Infinity;
  let total = 0;
  for (let step = 0; step < 720; step += 1) {
    const { dx, dy } = orbitAt(harmonics, (step / 720) * Math.PI * 2);
    const speed = Math.hypot(dx * scaleX, dy * scaleY);
    min = Math.min(min, speed);
    total += speed;
  }
  return min / (total / 720);
}

function fitScale(harmonics, extent) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let step = 0; step < 720; step += 1) {
    const { x, y } = orbitAt(harmonics, (step / 720) * Math.PI * 2);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  let scaleX = extent.width / (maxX - minX);
  let scaleY = extent.height / (maxY - minY);
  // Only ever shrink the larger scale, so the orbit still fits the extent.
  if (scaleX > scaleY * MAX_ASPECT) {
    scaleX = scaleY * MAX_ASPECT;
  } else if (scaleY > scaleX * MAX_ASPECT) {
    scaleY = scaleX * MAX_ASPECT;
  }
  return { scaleX, scaleY };
}

function buildOrbit(random, extent) {
  let harmonics = makeHarmonics(random);
  let { scaleX, scaleY } = fitScale(harmonics, extent);
  for (
    let attempt = 0;
    attempt < 200 && scaledSpeedRatio(harmonics, scaleX, scaleY) < MIN_SPEED_RATIO;
    attempt += 1
  ) {
    harmonics = makeHarmonics(random);
    ({ scaleX, scaleY } = fitScale(harmonics, extent));
  }
  if (scaledSpeedRatio(harmonics, scaleX, scaleY) < MIN_SPEED_RATIO) {
    throw new Error("Could not find an orbit without a speed collapse.");
  }

  const origin = orbitAt(harmonics, 0);
  return (theta) => {
    const { x, y, dx, dy } = orbitAt(harmonics, theta);
    return {
      x: (x - origin.x) * scaleX,
      y: (y - origin.y) * scaleY,
      dx: dx * scaleX,
      dy: dy * scaleY,
    };
  };
}

function round(value) {
  return Number(value.toFixed(2));
}

function orbitPath(random, d) {
  const orbit = buildOrbit(random, polylineExtent(d));
  const step = (Math.PI * 2) / ORBIT_SAMPLES;
  const start = orbit(0);
  let out = `M${round(start.x)} ${round(start.y)}`;
  for (let index = 0; index < ORBIT_SAMPLES; index += 1) {
    const from = orbit(index * step);
    const to = orbit((index + 1) * step);
    const c1 = { x: from.x + (from.dx * step) / 3, y: from.y + (from.dy * step) / 3 };
    const c2 = { x: to.x - (to.dx * step) / 3, y: to.y - (to.dy * step) / 3 };
    out += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(to.x)} ${round(to.y)}`;
  }
  return out;
}

export function orbitParticlePaths(markup) {
  const random = mulberry32(ORBIT_SEED);
  let converted = 0;
  const out = markup.replace(
    /(<animateMotion\b[^>]*\bpath=")([^"]+)(")/g,
    (whole, head, d, tail) => {
      converted += 1;
      return head + orbitPath(random, d) + tail;
    },
  );
  if (converted === 0) {
    throw new Error("No animateMotion paths found.");
  }
  return out;
}

function animatedGridPath(kind, index) {
  const values = Array.from({ length: KEYFRAME_COUNT }, (_, time) =>
    gridPathsAt(time)[kind][index],
  ).join(";\n          ");
  return `      <path d="${gridPathsAt(0)[kind][index]}">
        <animate attributeName="d" values="${values}"
          dur="${DURATION_SECONDS}s" calcMode="linear" repeatCount="indefinite" />
      </path>`;
}

function motionGrid() {
  const paths = [
    ...HORIZONTAL_BASELINES.map((_, index) =>
      animatedGridPath("horizontal", index),
    ),
    ...VERTICAL_BASELINES.map((_, index) =>
      animatedGridPath("vertical", index),
    ),
  ].join("\n");

  return `    <g class="grid" data-grid-field="continuous">
      <animate attributeName="opacity" values="${PALETTE.gridOpacity.join(";")}"
        keyTimes="0;0.25;0.5;0.75;1" dur="${DURATION_SECONDS}s"
        calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
        repeatCount="indefinite" />
${paths}
    </g>`;
}

function staticGrid() {
  const paths = gridPathsAt(0);
  return `    <g class="grid" opacity="${PALETTE.gridOpacity[0]}" data-grid-field="static">
${[...paths.horizontal, ...paths.vertical]
  .map((d) => `      <path d="${d}" />`)
  .join("\n")}
    </g>`;
}

function headerSvg() {
  const { y, height } = VIEW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y} ${WIDTH} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">PING SCIENTIST</title>
  <desc id="desc">The title types in over a coordinate grid that warps continuously under a smooth periodic field, with particles drifting across it on closed orbits.</desc>

  <defs>
    <!-- The field has no frame, so it is faded out at all four edges instead
         of being cut. Mask luminance: white keeps, black hides. The type sits
         outside these masks and stays at full strength. -->
    <linearGradient id="fade-x" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" />
      <stop offset="0.06" stop-color="#fff" />
      <stop offset="0.94" stop-color="#fff" />
      <stop offset="1" stop-color="#000" />
    </linearGradient>
    <linearGradient id="fade-y" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" />
      <stop offset="0.09" stop-color="#fff" />
      <stop offset="0.9" stop-color="#fff" />
      <stop offset="1" stop-color="#000" />
    </linearGradient>
    <mask id="edge-x" maskUnits="userSpaceOnUse" x="0" y="${y}" width="${WIDTH}" height="${height}">
      <rect x="0" y="${y}" width="${WIDTH}" height="${height}" fill="url(#fade-x)" />
    </mask>
    <mask id="edge-y" maskUnits="userSpaceOnUse" x="0" y="${y}" width="${WIDTH}" height="${height}">
      <rect x="0" y="${y}" width="${WIDTH}" height="${height}" fill="url(#fade-y)" />
    </mask>
${TYPE_DEFS}
  </defs>

  <style>
    text {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .grid {
      fill: none;
      stroke: ${PALETTE.grid};
      stroke-width: 1.1;
    }
    .particle { opacity: 0.9; }
    .particle-cyan { fill: ${PALETTE.cyan}; }
    .particle-gold { fill: ${PALETTE.gold}; }
    .particle-white { fill: ${PALETTE.neutral}; }
    .motion-layer { display: inline; }
    .static-layer { display: none; }

${typeStylesheet()}

    @media (prefers-reduced-motion: reduce) {
      .motion-layer { display: none; }
      .static-layer { display: inline; }
    }
  </style>

  <g mask="url(#edge-x)">
   <g mask="url(#edge-y)">

    <!-- Shared periodic deformation field. Every line is sampled from the same
         smooth analytic field; no per-line phase, skew or independent morph. -->
    <g class="motion-layer">
${motionGrid()}
    </g>

    <!-- Closed particle orbits, each on its own period, masked by the glyph
         shapes so they pass behind the title rather than over it. -->
    <g class="motion-layer" mask="url(#text-collision-mask)">
${orbitParticlePaths(MOTION_PARTICLES)}
    </g>

    <!-- Still field for people who ask for reduced motion. -->
    <g class="static-layer">
${staticGrid()}
      <g mask="url(#text-collision-mask)" opacity="0.88">
${STATIC_PARTICLES}
      </g>
    </g>

   </g>
  </g>

${TYPE_LAYER}

  <g class="static-layer">
${TYPE_STATIC}
  </g>

${TYPE_MICRO}
</svg>
`;
}

async function main() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDirectory, "..");

  // Fail loudly if the deformation field ever stops being well behaved.
  validateTimeline();

  const target = path.join(repositoryRoot, "assets/profile-header-field.svg");
  const svg = headerSvg();
  await fs.writeFile(target, svg);
  console.log(
    `Wrote ${path.relative(repositoryRoot, target)} (${(svg.length / 1024).toFixed(0)} KB)`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
