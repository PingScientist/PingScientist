// The typewriter title, recovered verbatim from the pre-rebuild
// profile-header-dark.svg. Geometry, keyTimes and easing are untouched; only
// the fills are themed, by class, in the generator's stylesheet.
//
// TYPE_DEFS carries the two clip rectangles that type the lines in, plus the
// glyph-shaped mask. The mask is no longer a collision surface - particles
// fly smooth orbits now - but it still keeps them from crossing the letters,
// so they read as passing behind the title.

export const TYPE_DEFS = String.raw`    <clipPath id="type-title">
      <rect x="351" y="107" width="0" height="60">
        <animate attributeName="width"
          values="0;0;36;73;109;146;167;202;238;273;308;344;379;415;450;486;500;500;0"
          keyTimes="0;0.02;0.042;0.064;0.086;0.108;0.13;0.152;0.174;0.196;0.218;0.24;0.262;0.284;0.306;0.322;0.33;0.94;1"
          calcMode="discrete" dur="14s" repeatCount="indefinite" />
      </rect>
    </clipPath>
    <clipPath id="type-subtitle">
      <rect x="420" y="198" width="0" height="28">
        <animate attributeName="width" values="0;0;354;354;0"
          keyTimes="0;0.33;0.52;0.94;1" dur="14s" repeatCount="indefinite" />
      </rect>
    </clipPath>
    <!-- A glyph-shaped safety mask is the final collision surface. The small
         stroke expansion matches the largest particle radius without creating
         a rectangular invisible wall around the title. -->
    <mask id="text-collision-mask" x="0" y="0" width="1200" height="320"
      maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
      <rect width="1200" height="320" fill="#fff" />
      <g fill="#000" stroke="#000" stroke-width="8" stroke-linejoin="round">
        <text x="351" y="157" font-size="57" font-weight="750" letter-spacing="4.5">PING SCIENTIST</text>
        <text x="600" y="218" font-size="16" letter-spacing="2.35" text-anchor="middle">Physics · Scientific Computing · Web</text>
        <text x="600" y="258" font-size="11" letter-spacing="2" text-anchor="middle">NTHU PHYSICS / MATLAB / FULL-STACK SYSTEMS</text>
      </g>
      <line x1="347" y1="181" x2="839" y2="181" stroke="#000" stroke-width="9" />
      <rect x="839" y="173" width="16" height="16" rx="2" fill="#000"
        transform="rotate(45 847 181)" />
    </mask>`;

export const TYPE_LAYER = String.raw`  <g class="motion-layer">
    <text class="title-text" x="351" y="157" font-size="57" font-weight="750"
      letter-spacing="4.5" clip-path="url(#type-title)">PING SCIENTIST</text>
    <text class="subtitle" x="600" y="218" font-size="16" text-anchor="middle"
      letter-spacing="2.35" clip-path="url(#type-subtitle)">Physics · Scientific Computing · Web</text>

    <rect class="cyan-fill" x="351" y="111" width="3" height="52">
      <animate attributeName="x" values="351;351;851;851;351"
        keyTimes="0;0.02;0.33;0.335;1" dur="14s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0;0"
        keyTimes="0;0.02;0.33;0.335;1" calcMode="discrete" dur="14s" repeatCount="indefinite" />
    </rect>
    <rect class="cyan-fill" x="420" y="200" width="2" height="23">
      <animate attributeName="x" values="420;420;780;780;420"
        keyTimes="0;0.33;0.52;0.94;1" dur="14s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0;0"
        keyTimes="0;0.33;0.52;0.94;1" calcMode="discrete" dur="14s" repeatCount="indefinite" />
      <animate attributeName="width" values="2;2;2;0;2"
        keyTimes="0;0.52;0.54;0.56;1" dur="1.2s" repeatCount="indefinite" />
    </rect>

    <line class="gold-stroke" x1="347" y1="181" x2="839" y2="181" stroke-width="2">
      <animate attributeName="opacity" values="0;0;1;1;0"
        keyTimes="0;0.33;0.38;0.94;1" dur="14s" repeatCount="indefinite" />
    </line>
    <rect class="gold-fill" x="842" y="176" width="10" height="10" transform="rotate(45 847 181)">
      <animate attributeName="opacity" values="0;0;1;1;0"
        keyTimes="0;0.37;0.42;0.94;1" dur="14s" repeatCount="indefinite" />
    </rect>
  </g>`;

export const TYPE_STATIC = String.raw`    <text class="title-text" x="351" y="157" font-size="57" font-weight="750" letter-spacing="4.5">PING SCIENTIST</text>
    <line class="gold-stroke" x1="347" y1="181" x2="839" y2="181" stroke-width="2" />
    <rect class="gold-fill" x="842" y="176" width="10" height="10" transform="rotate(45 847 181)" />
    <text class="subtitle" x="600" y="218" font-size="16" letter-spacing="2.35" text-anchor="middle">Physics · Scientific Computing · Web</text>`;

export const TYPE_MICRO = String.raw`  <text class="quiet" x="600" y="258" font-size="11" letter-spacing="2" text-anchor="middle">NTHU PHYSICS / MATLAB / FULL-STACK SYSTEMS</text>`;
