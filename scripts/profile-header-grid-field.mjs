import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WIDTH = 1200;
export const HEIGHT = 320;
export const DURATION_SECONDS = 20;
export const FRAME_RATE = 20;
export const FRAME_COUNT = DURATION_SECONDS * FRAME_RATE;
export const HORIZONTAL_BASELINES = [78, 123, 168, 213, 258];
export const VERTICAL_BASELINES = [120, 280, 440, 600, 760, 920, 1080];

const FIELD_SIGMA_X = 270;
const FIELD_SIGMA_Y = 108;
const SOURCE_KEYFRAME_COUNT = 41;

function phaseAt(timeSeconds) {
  return (Math.PI * 2 * timeSeconds) / DURATION_SECONDS;
}

export function fieldState(timeSeconds) {
  const phase = phaseAt(timeSeconds);
  return {
    centerX: 600 + 78 * Math.sin(phase - 0.35),
    centerY: 160 + 22 * Math.sin(phase + 0.85),
    horizontalStrength:
      34 * Math.cos(phase + 0.48) + 9 * Math.sin(phase * 2 - 0.2),
    verticalStrength:
      47 * Math.sin(phase - 0.22) + 8 * Math.sin(phase * 2 + 0.55),
    shearStrength: 9 * Math.cos(phase - 0.7),
    phase,
  };
}

export function warpPoint(x, y, timeSeconds) {
  const state = fieldState(timeSeconds);
  const normalizedX = (x - state.centerX) / FIELD_SIGMA_X;
  const normalizedY = (y - state.centerY) / FIELD_SIGMA_Y;
  const gaussian = Math.exp(
    -0.5 * (normalizedX * normalizedX + normalizedY * normalizedY),
  );
  const edgeWindow =
    Math.sin((Math.PI * x) / WIDTH) * Math.sin((Math.PI * y) / HEIGHT);
  const edgeBreath = 3.5 * Math.sin(state.phase + 0.3) * edgeWindow;

  return {
    x:
      x +
      gaussian *
        (state.horizontalStrength -
          state.shearStrength * 0.82 * normalizedY),
    y:
      y +
      gaussian *
        (state.verticalStrength +
          state.shearStrength * 1.18 * normalizedX) +
      edgeBreath,
  };
}

function sampleLine(kind, baseline, timeSeconds) {
  const start = kind === "horizontal" ? 20 : 60;
  const end = kind === "horizontal" ? 1180 : 304;
  const step = kind === "horizontal" ? 20 : 8;
  const points = [];

  for (let value = start; value <= end; value += step) {
    points.push(
      kind === "horizontal"
        ? warpPoint(value, baseline, timeSeconds)
        : warpPoint(baseline, value, timeSeconds),
    );
  }

  if ((end - start) % step !== 0) {
    points.push(
      kind === "horizontal"
        ? warpPoint(end, baseline, timeSeconds)
        : warpPoint(baseline, end, timeSeconds),
    );
  }

  return points;
}

function format(value) {
  return Number(value.toFixed(2)).toString();
}

function pointsToHermitePath(points) {
  const tangents = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const divisor = index === 0 || index === points.length - 1 ? 1 : 2;
    return {
      x: (next.x - previous.x) / divisor,
      y: (next.y - previous.y) / divisor,
    };
  });

  let d = `M${format(points[0].x)} ${format(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const currentTangent = tangents[index];
    const nextTangent = tangents[index + 1];
    const control1 = {
      x: current.x + currentTangent.x / 3,
      y: current.y + currentTangent.y / 3,
    };
    const control2 = {
      x: next.x - nextTangent.x / 3,
      y: next.y - nextTangent.y / 3,
    };
    d += ` C${format(control1.x)} ${format(control1.y)} ${format(control2.x)} ${format(control2.y)} ${format(next.x)} ${format(next.y)}`;
  }
  return d;
}

export function gridPathsAt(timeSeconds) {
  return {
    horizontal: HORIZONTAL_BASELINES.map((baseline) =>
      pointsToHermitePath(sampleLine("horizontal", baseline, timeSeconds)),
    ),
    vertical: VERTICAL_BASELINES.map((baseline) =>
      pointsToHermitePath(sampleLine("vertical", baseline, timeSeconds)),
    ),
  };
}

function interpolatePoint(pointA, pointB, amount) {
  return {
    x: pointA.x + (pointB.x - pointA.x) * amount,
    y: pointA.y + (pointB.y - pointA.y) * amount,
  };
}

function interpolatedLine(kind, baseline, timeSeconds) {
  const normalizedTime =
    ((timeSeconds % DURATION_SECONDS) + DURATION_SECONDS) % DURATION_SECONDS;
  const sourceFrame = normalizedTime * 2;
  const lowerIndex = Math.floor(sourceFrame);
  const upperIndex = (lowerIndex + 1) % (SOURCE_KEYFRAME_COUNT - 1);
  const amount = sourceFrame - lowerIndex;
  const lowerTime = lowerIndex / 2;
  const upperTime =
    upperIndex === 0 ? DURATION_SECONDS : upperIndex / 2;
  const lower = sampleLine(kind, baseline, lowerTime);
  const upper = sampleLine(kind, baseline, upperTime);
  return lower.map((point, index) =>
    interpolatePoint(point, upper[index], amount),
  );
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function countFamilyIntersections(lines) {
  let intersections = 0;
  for (let first = 0; first < lines.length; first += 1) {
    for (let second = first + 1; second < lines.length; second += 1) {
      for (let a = 0; a < lines[first].length - 1; a += 1) {
        for (let b = 0; b < lines[second].length - 1; b += 1) {
          if (
            segmentsIntersect(
              lines[first][a],
              lines[first][a + 1],
              lines[second][b],
              lines[second][b + 1],
            )
          ) {
            intersections += 1;
          }
        }
      }
    }
  }
  return intersections;
}

export function validateTimeline() {
  let minimumJacobian = Number.POSITIVE_INFINITY;
  let maximumDisplacement = 0;
  let maximumSideEdgeDisplacement = 0;
  let minimumHorizontalGap = Number.POSITIVE_INFINITY;
  let minimumVerticalGap = Number.POSITIVE_INFINITY;
  let familyIntersections = 0;
  let minimumHorizontalStep = Number.POSITIVE_INFINITY;
  let minimumVerticalStep = Number.POSITIVE_INFINITY;

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const time = frame / FRAME_RATE;
    const horizontalLines = HORIZONTAL_BASELINES.map((baseline) =>
      interpolatedLine("horizontal", baseline, time),
    );
    const verticalLines = VERTICAL_BASELINES.map((baseline) =>
      interpolatedLine("vertical", baseline, time),
    );

    familyIntersections +=
      countFamilyIntersections(horizontalLines) +
      countFamilyIntersections(verticalLines);

    for (const line of horizontalLines) {
      for (let index = 1; index < line.length; index += 1) {
        minimumHorizontalStep = Math.min(
          minimumHorizontalStep,
          line[index].x - line[index - 1].x,
        );
      }
    }
    for (const line of verticalLines) {
      for (let index = 1; index < line.length; index += 1) {
        minimumVerticalStep = Math.min(
          minimumVerticalStep,
          line[index].y - line[index - 1].y,
        );
      }
    }

    for (let line = 0; line < horizontalLines.length - 1; line += 1) {
      for (let point = 0; point < horizontalLines[line].length; point += 1) {
        minimumHorizontalGap = Math.min(
          minimumHorizontalGap,
          horizontalLines[line + 1][point].y -
            horizontalLines[line][point].y,
        );
      }
    }
    for (let line = 0; line < verticalLines.length - 1; line += 1) {
      for (let point = 0; point < verticalLines[line].length; point += 1) {
        minimumVerticalGap = Math.min(
          minimumVerticalGap,
          verticalLines[line + 1][point].x -
            verticalLines[line][point].x,
        );
      }
    }

    for (let y = 60; y <= 304; y += 8) {
      for (let x = 20; x <= 1180; x += 20) {
        const point = warpPoint(x, y, time);
        const displacement = Math.hypot(point.x - x, point.y - y);
        maximumDisplacement = Math.max(maximumDisplacement, displacement);
        if (x <= 20 || x >= 1180) {
          maximumSideEdgeDisplacement = Math.max(
            maximumSideEdgeDisplacement,
            displacement,
          );
        }

        const epsilon = 0.1;
        const left = warpPoint(x - epsilon, y, time);
        const right = warpPoint(x + epsilon, y, time);
        const up = warpPoint(x, y - epsilon, time);
        const down = warpPoint(x, y + epsilon, time);
        const dxDx = (right.x - left.x) / (2 * epsilon);
        const dyDx = (right.y - left.y) / (2 * epsilon);
        const dxDy = (down.x - up.x) / (2 * epsilon);
        const dyDy = (down.y - up.y) / (2 * epsilon);
        minimumJacobian = Math.min(
          minimumJacobian,
          dxDx * dyDy - dxDy * dyDx,
        );
      }
    }
  }

  const closureSamples = [];
  const closureVelocitySamples = [];
  const velocityStep = 0.01;
  for (const [x, y] of [
    [20, 78],
    [600, 160],
    [1180, 258],
    [280, 304],
    [920, 60],
  ]) {
    const start = warpPoint(x, y, 0);
    const end = warpPoint(x, y, DURATION_SECONDS);
    closureSamples.push(Math.hypot(start.x - end.x, start.y - end.y));
    const beforeStart = warpPoint(x, y, -velocityStep);
    const afterStart = warpPoint(x, y, velocityStep);
    const beforeEnd = warpPoint(
      x,
      y,
      DURATION_SECONDS - velocityStep,
    );
    const afterEnd = warpPoint(
      x,
      y,
      DURATION_SECONDS + velocityStep,
    );
    const startVelocity = {
      x: (afterStart.x - beforeStart.x) / (2 * velocityStep),
      y: (afterStart.y - beforeStart.y) / (2 * velocityStep),
    };
    const endVelocity = {
      x: (afterEnd.x - beforeEnd.x) / (2 * velocityStep),
      y: (afterEnd.y - beforeEnd.y) / (2 * velocityStep),
    };
    closureVelocitySamples.push(
      Math.hypot(
        startVelocity.x - endVelocity.x,
        startVelocity.y - endVelocity.y,
      ),
    );
  }

  const report = {
    framesValidated: FRAME_COUNT,
    familyIntersections,
    minimumJacobian,
    minimumHorizontalGap,
    minimumVerticalGap,
    minimumHorizontalStep,
    minimumVerticalStep,
    maximumDisplacement,
    maximumSideEdgeDisplacement,
    centerDriftX: 78,
    centerDriftY: 22,
    influenceWidth: FIELD_SIGMA_X * 2,
    influenceHeight: FIELD_SIGMA_Y * 2,
    maximumClosurePositionError: Math.max(...closureSamples),
    maximumClosureVelocityError: Math.max(...closureVelocitySamples),
  };

  if (
    familyIntersections !== 0 ||
    minimumJacobian <= 0 ||
    minimumHorizontalGap <= 0 ||
    minimumVerticalGap <= 0 ||
    minimumHorizontalStep <= 0 ||
    minimumVerticalStep <= 0
  ) {
    throw new Error(`Grid topology validation failed:\n${JSON.stringify(report, null, 2)}`);
  }

  return report;
}

function sourceTimes() {
  return Array.from(
    { length: SOURCE_KEYFRAME_COUNT },
    (_, index) => index / 2,
  );
}

function animatedPathMarkup(kind, baseline, index) {
  const values = sourceTimes()
    .map((time) =>
      pointsToHermitePath(sampleLine(kind, baseline, time)),
    )
    .join(";\n          ");
  const initial = pointsToHermitePath(sampleLine(kind, baseline, 0));
  return `      <path data-grid-kind="${kind}" data-grid-index="${index}" d="${initial}">
        <animate attributeName="d" values="${values}"
          dur="${DURATION_SECONDS}s" calcMode="linear" repeatCount="indefinite" />
      </path>`;
}

function motionGridMarkup() {
  const horizontal = HORIZONTAL_BASELINES.map((baseline, index) =>
    animatedPathMarkup("horizontal", baseline, index),
  ).join("\n");
  const vertical = VERTICAL_BASELINES.map((baseline, index) =>
    animatedPathMarkup("vertical", baseline, index),
  ).join("\n");

  return `  <!-- Shared periodic deformation field. Every grid line is sampled from
       the same Gaussian field; no per-line phase, skew, or independent morph. -->
  <g class="motion-layer">
    <g class="grid" opacity="0.68" data-grid-field="continuous">
      <animate attributeName="opacity" values="0.58;0.76;0.66;0.74;0.58"
        keyTimes="0;0.25;0.5;0.75;1" dur="${DURATION_SECONDS}s"
        calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
        repeatCount="indefinite" />
${horizontal}
${vertical}
    </g>
  </g>

`;
}

function staticGridMarkup() {
  const paths = gridPathsAt(0);
  return `    <g class="grid" opacity="0.58" data-grid-field="static">
${[...paths.horizontal, ...paths.vertical]
  .map((d) => `      <path d="${d}" />`)
  .join("\n")}
    </g>`;
}

async function updateSvgSource(svgPath) {
  let svg = await fs.readFile(svgPath, "utf8");
  const originalMotionStart = svg.indexOf("  <!-- The full field evolves");
  const generatedMotionStart = svg.indexOf(
    "  <!-- Shared periodic deformation field",
  );
  const motionStart =
    originalMotionStart >= 0 ? originalMotionStart : generatedMotionStart;
  const motionEnd = svg.indexOf("  <!-- One-time radial burst", motionStart);
  if (motionStart < 0 || motionEnd < 0) {
    throw new Error(`Could not find motion grid markers in ${svgPath}`);
  }
  svg =
    svg.slice(0, motionStart) +
    motionGridMarkup() +
    svg.slice(motionEnd);

  const staticLayerStart = svg.indexOf('  <g class="static-layer">');
  const staticGridStart = svg.indexOf('    <g class="grid"', staticLayerStart);
  const staticGridEnd = svg.indexOf("    </g>", staticGridStart);
  if (staticGridStart < 0 || staticGridEnd < 0) {
    throw new Error(`Could not find reduced-motion grid in ${svgPath}`);
  }
  svg =
    svg.slice(0, staticGridStart) +
    staticGridMarkup() +
    svg.slice(staticGridEnd + "    </g>".length);

  await fs.writeFile(svgPath, svg);
}

async function main() {
  const command = process.argv[2];
  if (command === "validate") {
    console.log(JSON.stringify(validateTimeline(), null, 2));
    return;
  }
  if (command === "write-sources") {
    const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
    const repositoryRoot = path.resolve(scriptDirectory, "..");
    await updateSvgSource(
      path.join(repositoryRoot, "assets/profile-header-dark.svg"),
    );
    await updateSvgSource(
      path.join(repositoryRoot, "assets/profile-header-light.svg"),
    );
    console.log("Updated dark/light SVG grids from the shared deformation field.");
    return;
  }
  throw new Error(
    "Usage: node scripts/profile-header-grid-field.mjs <validate|write-sources>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
