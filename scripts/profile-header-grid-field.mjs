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
export const OVERSCAN_X = 120;
export const OVERSCAN_Y = 96;

const FIELD_SIGMA_X = 310;
const FIELD_SIGMA_Y = 128;
const SOURCE_KEYFRAME_COUNT = 21;

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
  const radiusSquared =
    normalizedX * normalizedX + normalizedY * normalizedY;
  // The quadratic term keeps the well broad. The quartic tail makes the
  // displacement and its derivatives approach zero before the viewport sides
  // without a clamp, mask, or fixed-radius cutoff.
  const smoothEnvelope = Math.exp(
    -0.5 * (radiusSquared + 0.55 * radiusSquared * radiusSquared),
  );

  return {
    x:
      x +
      smoothEnvelope *
        (state.horizontalStrength -
          state.shearStrength * 0.82 * normalizedY),
    y:
      y +
      smoothEnvelope *
        (state.verticalStrength +
          state.shearStrength * 1.18 * normalizedX),
  };
}

function sampleLine(kind, baseline, timeSeconds) {
  const start = kind === "horizontal" ? -OVERSCAN_X : -OVERSCAN_Y;
  const end =
    kind === "horizontal" ? WIDTH + OVERSCAN_X : HEIGHT + OVERSCAN_Y;
  const step = kind === "horizontal" ? 16 : 8;
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

function weightedPoint(points, weights) {
  return weights.reduce(
    (result, [index, weight]) => ({
      x: result.x + points[index].x * weight,
      y: result.y + points[index].y * weight,
    }),
    { x: 0, y: 0 },
  );
}

function pointsToBSplinePath(points) {
  if (points.length < 4) {
    throw new Error("A cubic B-spline requires at least four sample points.");
  }

  const first = weightedPoint(points, [
    [0, 1 / 6],
    [1, 4 / 6],
    [2, 1 / 6],
  ]);
  let d = `M${format(first.x)} ${format(first.y)}`;

  for (let index = 0; index < points.length - 3; index += 1) {
    const control1 = weightedPoint(points, [
      [index + 1, 4 / 6],
      [index + 2, 2 / 6],
    ]);
    const control2 = weightedPoint(points, [
      [index + 1, 2 / 6],
      [index + 2, 4 / 6],
    ]);
    const end = weightedPoint(points, [
      [index + 1, 1 / 6],
      [index + 2, 4 / 6],
      [index + 3, 1 / 6],
    ]);
    d += ` C${format(control1.x)} ${format(control1.y)} ${format(control2.x)} ${format(control2.y)} ${format(end.x)} ${format(end.y)}`;
  }
  return d;
}

export function gridPathsAt(timeSeconds) {
  return {
    horizontal: HORIZONTAL_BASELINES.map((baseline) =>
      pointsToBSplinePath(sampleLine("horizontal", baseline, timeSeconds)),
    ),
    vertical: VERTICAL_BASELINES.map((baseline) =>
      pointsToBSplinePath(sampleLine("vertical", baseline, timeSeconds)),
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
  const sourceInterval =
    DURATION_SECONDS / (SOURCE_KEYFRAME_COUNT - 1);
  const sourceFrame = normalizedTime / sourceInterval;
  const lowerIndex = Math.floor(sourceFrame);
  const upperIndex = (lowerIndex + 1) % (SOURCE_KEYFRAME_COUNT - 1);
  const amount = sourceFrame - lowerIndex;
  const lowerTime = lowerIndex * sourceInterval;
  const upperTime =
    upperIndex === 0
      ? DURATION_SECONDS
      : upperIndex * sourceInterval;
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
  let maximumTransitionSlopeDelta = 0;
  let maximumTransitionCurvatureDelta = 0;
  let maximumVisibleSideSlope = 0;
  let maximumVisibleTopBottomSlope = 0;
  let minimumHorizontalEndpointOverscan = Number.POSITIVE_INFINITY;
  let minimumVerticalEndpointOverscan = Number.POSITIVE_INFINITY;

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
      const slopes = [];
      for (let index = 1; index < line.length; index += 1) {
        minimumHorizontalStep = Math.min(
          minimumHorizontalStep,
          line[index].x - line[index - 1].x,
        );
        const deltaX = line[index].x - line[index - 1].x;
        const slope = (line[index].y - line[index - 1].y) / deltaX;
        const midpointX = (line[index].x + line[index - 1].x) / 2;
        slopes.push({ slope, midpointX, deltaX });
        if (midpointX < 80 || midpointX > WIDTH - 80) {
          maximumVisibleSideSlope = Math.max(
            maximumVisibleSideSlope,
            Math.abs(slope),
          );
        }
      }
      const curvatures = [];
      for (let index = 1; index < slopes.length; index += 1) {
        const midpointX =
          (slopes[index].midpointX + slopes[index - 1].midpointX) / 2;
        const slopeDelta = slopes[index].slope - slopes[index - 1].slope;
        const transition =
          (midpointX >= 80 && midpointX <= 420) ||
          (midpointX >= WIDTH - 420 && midpointX <= WIDTH - 80);
        if (transition) {
          maximumTransitionSlopeDelta = Math.max(
            maximumTransitionSlopeDelta,
            Math.abs(slopeDelta),
          );
        }
        curvatures.push({
          value:
            slopeDelta /
            ((slopes[index].deltaX + slopes[index - 1].deltaX) / 2),
          midpointX,
        });
      }
      for (let index = 1; index < curvatures.length; index += 1) {
        const midpointX =
          (curvatures[index].midpointX +
            curvatures[index - 1].midpointX) /
          2;
        const transition =
          (midpointX >= 80 && midpointX <= 420) ||
          (midpointX >= WIDTH - 420 && midpointX <= WIDTH - 80);
        if (transition) {
          maximumTransitionCurvatureDelta = Math.max(
            maximumTransitionCurvatureDelta,
            Math.abs(
              curvatures[index].value -
                curvatures[index - 1].value,
            ),
          );
        }
      }
      minimumHorizontalEndpointOverscan = Math.min(
        minimumHorizontalEndpointOverscan,
        -line[0].x,
        line[line.length - 1].x - WIDTH,
      );
    }
    for (const line of verticalLines) {
      for (let index = 1; index < line.length; index += 1) {
        minimumVerticalStep = Math.min(
          minimumVerticalStep,
          line[index].y - line[index - 1].y,
        );
        const deltaY = line[index].y - line[index - 1].y;
        const slope = (line[index].x - line[index - 1].x) / deltaY;
        const midpointY = (line[index].y + line[index - 1].y) / 2;
        if (midpointY < 40 || midpointY > HEIGHT - 40) {
          maximumVisibleTopBottomSlope = Math.max(
            maximumVisibleTopBottomSlope,
            Math.abs(slope),
          );
        }
      }
      minimumVerticalEndpointOverscan = Math.min(
        minimumVerticalEndpointOverscan,
        -line[0].y,
        line[line.length - 1].y - HEIGHT,
      );
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

    for (let y = 0; y <= HEIGHT; y += 8) {
      for (let x = 0; x <= WIDTH; x += 16) {
        const point = warpPoint(x, y, time);
        const displacement = Math.hypot(point.x - x, point.y - y);
        maximumDisplacement = Math.max(maximumDisplacement, displacement);
        if (x === 0 || x === WIDTH) {
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
    maximumTransitionSlopeDelta,
    maximumTransitionCurvatureDelta,
    maximumVisibleSideSlope,
    maximumVisibleTopBottomSlope,
    minimumHorizontalEndpointOverscan,
    minimumVerticalEndpointOverscan,
    maximumDisplacement,
    maximumSideEdgeDisplacement,
    centerDriftX: 78,
    centerDriftY: 22,
    influenceWidth: FIELD_SIGMA_X * 2,
    influenceHeight: FIELD_SIGMA_Y * 2,
    overscanX: OVERSCAN_X,
    overscanY: OVERSCAN_Y,
    maximumClosurePositionError: Math.max(...closureSamples),
    maximumClosureVelocityError: Math.max(...closureVelocitySamples),
  };

  if (
    familyIntersections !== 0 ||
    minimumJacobian <= 0 ||
    minimumHorizontalGap <= 0 ||
    minimumVerticalGap <= 0 ||
    minimumHorizontalStep <= 0 ||
    minimumVerticalStep <= 0 ||
    maximumTransitionSlopeDelta >= 0.08 ||
    maximumTransitionCurvatureDelta >= 0.004 ||
    minimumHorizontalEndpointOverscan < 80 ||
    minimumVerticalEndpointOverscan < 64
  ) {
    throw new Error(`Grid topology validation failed:\n${JSON.stringify(report, null, 2)}`);
  }

  return report;
}

function sourceTimes() {
  return Array.from(
    { length: SOURCE_KEYFRAME_COUNT },
    (_, index) => index,
  );
}

function animatedPathMarkup(kind, baseline, index) {
  const values = sourceTimes()
    .map((time) =>
      pointsToBSplinePath(sampleLine(kind, baseline, time)),
    )
    .join(";\n          ");
  const initial = pointsToBSplinePath(sampleLine(kind, baseline, 0));
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
       the same smooth analytic field; no per-line phase, skew, or independent morph. -->
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
