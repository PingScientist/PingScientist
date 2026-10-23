import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Design tokens
//
// Surfaces match the GitHub canvas exactly so that no component reads as a
// pasted-on rectangle. Ink steps are checked against their own surface:
// every value below clears 4.5:1, accents clear 5:1.
// ---------------------------------------------------------------------------

export const TOKENS = {
  dark: {
    surface: "#0d1117", // GitHub dark canvas
    inset: "#161b22",
    hairline: "#30363d",
    border: "#3d444d",
    ink1: "#e6edf3", // 15.7:1
    ink2: "#adbac7", //  9.6:1
    ink3: "#8b949e", //  6.2:1
    accent: "#42d6c5", // 10.6:1  topics
    action: "#c7a85a", //  8.4:1  links and contact
  },
  light: {
    surface: "#ffffff",
    inset: "#f6f8fa",
    hairline: "#d0d7de",
    border: "#afb8c1",
    ink1: "#1f2328", // 15.8:1
    ink2: "#424a53", //  9.4:1
    ink3: "#636c76", //  5.3:1
    accent: "#0f766e", //  5.5:1
    action: "#8a6a20", //  5.0:1
  },
};

// ---------------------------------------------------------------------------
// Geometry
//
// One radius, one border weight, one icon stroke, one icon box. Every
// component below is built from these; nothing sets its own.
// ---------------------------------------------------------------------------

export const GEOMETRY = {
  radius: 6,
  borderWidth: 1,
  iconStroke: 1.5,
  iconSize: 16,
  // Single-quoted family name: this string is emitted into a double-quoted
  // SVG attribute, where a nested double quote would end the attribute.
  fontStack:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

export const TAG = {
  height: 32,
  iconX: 11,
  labelX: 35,
  paddingRight: 14,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.2,
  baseline: 20.5,
};

export const BUTTON = {
  width: 168,
  height: 40,
  iconX: 15,
  labelX: 41,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 1.4,
  baseline: 24.5,
};

// Advance widths of each label, measured once in the browser at the exact
// font stack, size, weight and tracking declared above (see `measure`), then
// padded by MEASUREMENT_SLACK so the pill still fits on platforms whose
// fallback face runs wider than the one measured here.
export const MEASUREMENT_SLACK = 1.08;

export const MEASURED_LABEL_WIDTH = {
  Physics: 45.13,
  "Scientific Computing": 124.47,
  "Web Development": 106.98,
  "Open Source": 76.52,
};

// ---------------------------------------------------------------------------
// Icons — each drawn in a 16x16 box, stroked at GEOMETRY.iconStroke.
// Tags differentiate by icon silhouette alone, never by hue.
// ---------------------------------------------------------------------------

const ICONS = {
  atom: `<g fill="none" stroke="COLOR" stroke-width="SW">
      <ellipse cx="8" cy="8" rx="7.1" ry="2.8" />
      <ellipse cx="8" cy="8" rx="7.1" ry="2.8" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7.1" ry="2.8" transform="rotate(120 8 8)" />
    </g>
    <circle cx="8" cy="8" r="1.5" fill="COLOR" />`,
  chip: `<g fill="none" stroke="COLOR" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4.4" y="4.4" width="7.2" height="7.2" rx="1.2" />
      <path d="M6.6 1.9v2.5M9.4 1.9v2.5M6.6 11.6v2.5M9.4 11.6v2.5M1.9 6.6h2.5M1.9 9.4h2.5M11.6 6.6h2.5M11.6 9.4h2.5" />
    </g>`,
  brackets: `<g fill="none" stroke="COLOR" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5.9 4.2 2.1 8l3.8 3.8M10.1 4.2 13.9 8l-3.8 3.8M9.4 2.4 6.6 13.6" />
    </g>`,
  branch: `<g fill="none" stroke="COLOR" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="4.6" cy="3.6" r="1.9" />
      <circle cx="11.4" cy="3.6" r="1.9" />
      <circle cx="4.6" cy="12.4" r="1.9" />
      <path d="M4.6 5.5v5M11.4 5.5v1a2.6 2.6 0 0 1-2.6 2.6H4.6" />
    </g>`,
  github: `<path fill="COLOR" d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />`,
  envelope: `<g fill="none" stroke="COLOR" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1.4" y="3.4" width="13.2" height="9.2" rx="1.6" />
      <path d="m2.1 4.6 5.9 4.4 5.9-4.4" />
    </g>`,
};

function icon(name, x, y, color) {
  const body = ICONS[name]
    .replaceAll("COLOR", color)
    .replaceAll("SW", String(GEOMETRY.iconStroke));
  return `  <g transform="translate(${x} ${y})">
    ${body}
  </g>`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const TAGS = [
  { file: "tag-physics", label: "Physics", icon: "atom" },
  { file: "tag-computing", label: "Scientific Computing", icon: "chip" },
  { file: "tag-web", label: "Web Development", icon: "brackets" },
  { file: "tag-open-source", label: "Open Source", icon: "branch" },
];

const BUTTONS = [
  {
    file: "contact-github",
    label: "GITHUB",
    icon: "github",
    title: "GitHub",
    desc: "A link to the PingScientist GitHub profile.",
  },
  {
    file: "contact-email",
    label: "EMAIL",
    icon: "envelope",
    title: "Email",
    desc: "A link that opens a new email to PingScientist.",
  },
];

export function tagWidth(label) {
  const measured = MEASURED_LABEL_WIDTH[label];
  if (!measured) {
    throw new Error(
      `No measured width for "${label}". Run: node scripts/components.mjs measure`,
    );
  }
  return Math.ceil(
    TAG.labelX + measured * MEASUREMENT_SLACK + TAG.paddingRight,
  );
}

function tagSvg(tag, theme) {
  const t = TOKENS[theme];
  const width = tagWidth(tag.label);
  const iconY = (TAG.height - GEOMETRY.iconSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${TAG.height}" viewBox="0 0 ${width} ${TAG.height}" role="img" aria-labelledby="title">
  <title id="title">${tag.label}</title>
  <rect x="${GEOMETRY.borderWidth / 2}" y="${GEOMETRY.borderWidth / 2}" width="${width - GEOMETRY.borderWidth}" height="${TAG.height - GEOMETRY.borderWidth}" rx="${GEOMETRY.radius}" fill="${t.inset}" stroke="${t.hairline}" stroke-width="${GEOMETRY.borderWidth}" />
${icon(tag.icon, TAG.iconX, iconY, t.accent)}
  <text x="${TAG.labelX}" y="${TAG.baseline}" fill="${t.ink1}" font-family="${GEOMETRY.fontStack}" font-size="${TAG.fontSize}" font-weight="${TAG.fontWeight}" letter-spacing="${TAG.letterSpacing}">${tag.label}</text>
</svg>
`;
}

function buttonSvg(button, theme) {
  const t = TOKENS[theme];
  const { width, height } = BUTTON;
  const iconY = (height - GEOMETRY.iconSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${button.title}</title>
  <desc id="desc">${button.desc}</desc>
  <rect x="${GEOMETRY.borderWidth / 2}" y="${GEOMETRY.borderWidth / 2}" width="${width - GEOMETRY.borderWidth}" height="${height - GEOMETRY.borderWidth}" rx="${GEOMETRY.radius}" fill="${t.inset}" stroke="${t.border}" stroke-width="${GEOMETRY.borderWidth}" />
${icon(button.icon, BUTTON.iconX, iconY, t.action)}
  <text x="${BUTTON.labelX}" y="${BUTTON.baseline}" fill="${t.ink1}" font-family="${GEOMETRY.fontStack}" font-size="${BUTTON.fontSize}" font-weight="${BUTTON.fontWeight}" letter-spacing="${BUTTON.letterSpacing}">${button.label}</text>
  <path d="m${width - 26} ${height / 2 - 4.5} 4.5 4.5-4.5 4.5" fill="none" stroke="${t.ink3}" stroke-width="${GEOMETRY.iconStroke}" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;
}

// ---------------------------------------------------------------------------
// Measurement harness
// ---------------------------------------------------------------------------

function measureHtml() {
  const labels = Object.keys(MEASURED_LABEL_WIDTH);
  return `<!doctype html>
<meta charset="utf-8">
<title>label metrics</title>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200" id="stage">
${labels
  .map(
    (label, index) =>
      `  <text id="m${index}" x="10" y="${30 + index * 30}" font-family="${GEOMETRY.fontStack}" font-size="${TAG.fontSize}" font-weight="${TAG.fontWeight}" letter-spacing="${TAG.letterSpacing}">${label}</text>`,
  )
  .join("\n")}
</svg>
<pre id="out"></pre>
<script>
  const labels = ${JSON.stringify(labels)};
  const result = {};
  labels.forEach((label, index) => {
    result[label] = document.getElementById("m" + index).getComputedTextLength();
  });
  document.getElementById("out").textContent = JSON.stringify(result, null, 2);
  window.__metrics = result;
</script>
`;
}

// ---------------------------------------------------------------------------

async function main() {
  const command = process.argv[2];
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDirectory, "..");

  if (command === "measure") {
    const target = process.argv[3];
    if (!target) {
      throw new Error("Usage: node scripts/components.mjs measure <out.html>");
    }
    await fs.writeFile(target, measureHtml());
    console.log(`Wrote measurement harness to ${target}`);
    return;
  }

  if (command === "write-assets") {
    const written = [];
    for (const theme of ["dark", "light"]) {
      for (const tag of TAGS) {
        const file = path.join(
          repositoryRoot,
          `assets/${tag.file}-${theme}.svg`,
        );
        await fs.writeFile(file, tagSvg(tag, theme));
        written.push(path.basename(file));
      }
      for (const button of BUTTONS) {
        const file = path.join(
          repositoryRoot,
          `assets/${button.file}-${theme}.svg`,
        );
        await fs.writeFile(file, buttonSvg(button, theme));
        written.push(path.basename(file));
      }
    }
    console.log(`Wrote ${written.length} files:\n  ${written.join("\n  ")}`);
    for (const tag of TAGS) {
      console.log(`${tag.label}: width ${tagWidth(tag.label)}`);
    }
    return;
  }

  throw new Error(
    "Usage: node scripts/components.mjs <measure <out.html>|write-assets>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
