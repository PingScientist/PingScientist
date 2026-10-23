// Hand-tuned particle choreography, lifted verbatim from the previous
// profile-header-dark.svg. Only the fill classes are themed; every path,
// duration and easing below is the original.
//
// Each motion path is closed - it starts and ends at the same point - so a
// particle rejoins its own loop seamlessly whatever its period is. That is
// why this composition can never be baked into a fixed-length raster: the
// periods here run from 14.9s to 28s and share no common multiple.

export const MOTION_PARTICLES = String.raw`    <g class="particle particle-cyan">
      <animateMotion begin="1.18s" dur="18.7s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-120 -83 L-355 92 L-140 227 L-20 58 L-90 40 L0 0" />
      <g transform="translate(360 88)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="240 92;240 92;0 0" keyTimes="0;0.08;1" calcMode="spline"
          keySplines="0 0 1 1;0.12 0.82 0.2 1" dur="1.18s" fill="freeze" />
        <circle r="4" />
      </g>
    </g>
    <g class="particle particle-white">
      <animateMotion begin="1.34s" dur="15.9s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-70 -69 L-40 32 L-170 -6 L-495 78 L-160 176 L0 0" />
      <g transform="translate(500 74)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="100 106;100 106;0 0" keyTimes="0;0.06;1" calcMode="spline"
          keySplines="0 0 1 1;0.14 0.78 0.22 1" dur="1.34s" fill="freeze" />
        <circle r="3" />
      </g>
    </g>
    <g class="particle particle-gold">
      <animateMotion begin="1.26s" dur="21.1s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L95 -71 L495 50 L220 130 L42 27 L180 -2 L0 0" />
      <g transform="translate(700 76)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-100 104;-100 104;0 0" keyTimes="0;0.09;1" calcMode="spline"
          keySplines="0 0 1 1;0.11 0.84 0.2 1" dur="1.26s" fill="freeze" />
        <circle r="4.5" />
      </g>
    </g>
    <g class="particle particle-cyan">
      <animateMotion begin="1.42s" dur="19.4s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L355 -20 L170 80 L-92 64 L90 150 L240 80 L0 0" />
      <g transform="translate(840 100)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-240 80;-240 80;0 0" keyTimes="0;0.07;1" calcMode="spline"
          keySplines="0 0 1 1;0.13 0.8 0.2 1" dur="1.42s" fill="freeze" />
        <circle r="3.5" />
      </g>
    </g>
    <g class="particle particle-white">
      <animateMotion begin="1.15s" dur="17.3s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L307 0 L120 -90 L-25 -16 L40 112 L250 100 L0 0" />
      <g transform="translate(888 166)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-288 14;-288 14;0 0" keyTimes="0;0.08;1" calcMode="spline"
          keySplines="0 0 1 1;0.1 0.86 0.18 1" dur="1.15s" fill="freeze" />
        <circle r="3" />
      </g>
    </g>
    <g class="particle particle-cyan">
      <animateMotion begin="1.38s" dur="20.6s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L345 77 L160 -20 L-70 -16 L30 -160 L250 -90 L0 0" />
      <g transform="translate(850 238)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-250 -58;-250 -58;0 0" keyTimes="0;0.06;1" calcMode="spline"
          keySplines="0 0 1 1;0.15 0.76 0.23 1" dur="1.38s" fill="freeze" />
        <circle r="4" />
      </g>
    </g>
    <g class="particle particle-gold">
      <animateMotion begin="1.29s" dur="16.8s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L80 35 L250 -10 L465 -70 L110 -145 L10 -32 L-80 16 L0 0" />
      <g transform="translate(730 280)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-130 -100;-130 -100;0 0" keyTimes="0;0.1;1" calcMode="spline"
          keySplines="0 0 1 1;0.12 0.82 0.2 1" dur="1.29s" fill="freeze" />
        <circle r="3" />
      </g>
    </g>
    <g class="particle particle-white">
      <animateMotion begin="1.47s" dur="22.3s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L40 29 L260 -5 L585 -100 L250 -170 L-15 -38 L-190 5 L0 0" />
      <g transform="translate(610 286)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-10 -106;-10 -106;0 0" keyTimes="0;0.07;1" calcMode="spline"
          keySplines="0 0 1 1;0.13 0.8 0.2 1" dur="1.47s" fill="freeze" />
        <circle r="3.5" />
      </g>
    </g>
    <g class="particle particle-gold">
      <animateMotion begin="1.23s" dur="21.7s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-80 33 L-260 -10 L-495 -70 L-210 -160 L-50 -34 L90 14 L0 0" />
      <g transform="translate(500 282)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="100 -102;100 -102;0 0" keyTimes="0;0.08;1" calcMode="spline"
          keySplines="0 0 1 1;0.11 0.85 0.19 1" dur="1.23s" fill="freeze" />
        <circle r="3.2" />
      </g>
    </g>
    <g class="particle particle-white">
      <animateMotion begin="1.33s" dur="18.2s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-375 67 L-190 -50 L32 -28 L-100 -150 L-330 -80 L0 0" />
      <g transform="translate(380 248)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="220 -68;220 -68;0 0" keyTimes="0;0.09;1" calcMode="spline"
          keySplines="0 0 1 1;0.14 0.78 0.21 1" dur="1.33s" fill="freeze" />
        <circle r="2.8" />
      </g>
    </g>
    <g class="particle particle-cyan">
      <animateMotion begin="1.17s" dur="17.6s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-315 0 L-120 -105 L18 -32 L-80 100 L-260 100 L0 0" />
      <g transform="translate(320 180)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="280 0;280 0;0 0" keyTimes="0;0.06;1" calcMode="spline"
          keySplines="0 0 1 1;0.1 0.86 0.18 1" dur="1.17s" fill="freeze" />
        <circle r="2.8" />
      </g>
    </g>
    <g class="particle particle-gold">
      <animateMotion begin="1.36s" dur="19.8s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-305 -30 L-150 75 L28 25 L-80 155 L-280 80 L0 0" />
      <g transform="translate(310 120)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="290 60;290 60;0 0" keyTimes="0;0.08;1" calcMode="spline"
          keySplines="0 0 1 1;0.12 0.82 0.2 1" dur="1.36s" fill="freeze" />
        <circle r="3.2" />
      </g>
    </g>
    <g class="particle particle-white">
      <animateMotion begin="1.21s" dur="14.9s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-25 -77 L0 24 L-150 -10 L-425 80 L-120 150 L0 0" />
      <g transform="translate(430 82)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="170 98;170 98;0 0" keyTimes="0;0.1;1" calcMode="spline"
          keySplines="0 0 1 1;0.11 0.84 0.19 1" dur="1.21s" fill="freeze" />
        <circle r="2.6" />
      </g>
    </g>
    <g class="particle particle-cyan">
      <animateMotion begin="1.44s" dur="18.9s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-28 0 L100 -10 L305 -60 L220 165 L40 138 L0 0" />
      <g transform="translate(890 150)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="-290 30;-290 30;0 0" keyTimes="0;0.07;1" calcMode="spline"
          keySplines="0 0 1 1;0.14 0.78 0.22 1" dur="1.44s" fill="freeze" />
        <circle r="3" />
      </g>
    </g>
    <g class="particle particle-gold">
      <animateMotion begin="1.31s" dur="15.6s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L0 -12 L70 39 L180 39 L300 -40 L120 -100 L0 0" />
      <g transform="translate(600 276)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0 -96;0 -96;0 0" keyTimes="0;0.09;1" calcMode="spline"
          keySplines="0 0 1 1;0.12 0.82 0.2 1" dur="1.31s" fill="freeze" />
        <circle r="2.7" />
      </g>
    </g>
    <g class="particle particle-cyan">
      <animateMotion begin="1.25s" dur="20.2s" calcMode="paced" repeatCount="indefinite"
        path="M0 0 L-160 0 L-175 18 L-260 0 L-576 100 L-200 220 L0 0" />
      <g transform="translate(600 68)">
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0 112;0 112;0 0" keyTimes="0;0.08;1" calcMode="spline"
          keySplines="0 0 1 1;0.1 0.86 0.18 1" dur="1.25s" fill="freeze" />
        <circle r="3.2" />
      </g>
    </g>`;

// The reduced-motion layer is genuinely still. The original kept a 28s
// 1.5px drift here; that is motion, so it is dropped.
export const STATIC_PARTICLES = String.raw`      <circle class="particle-cyan" cx="360" cy="88" r="4" />
      <circle class="particle-white" cx="500" cy="74" r="3" />
      <circle class="particle-gold" cx="700" cy="76" r="4.5" />
      <circle class="particle-cyan" cx="840" cy="100" r="3.5" />
      <circle class="particle-white" cx="888" cy="166" r="3" />
      <circle class="particle-cyan" cx="850" cy="238" r="4" />
      <circle class="particle-gold" cx="730" cy="280" r="3" />
      <circle class="particle-white" cx="610" cy="286" r="3.5" />
      <circle class="particle-gold" cx="500" cy="282" r="3.2" />
      <circle class="particle-white" cx="380" cy="248" r="2.8" />
      <circle class="particle-cyan" cx="320" cy="180" r="2.8" />
      <circle class="particle-gold" cx="310" cy="120" r="3.2" />
      <circle class="particle-white" cx="430" cy="82" r="2.6" />
      <circle class="particle-cyan" cx="890" cy="150" r="3" />
      <circle class="particle-gold" cx="600" cy="276" r="2.7" />
      <circle class="particle-cyan" cx="600" cy="68" r="3.2" />`;
