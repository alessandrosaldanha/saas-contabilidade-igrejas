/* @ds-bundle: {"format":3,"namespace":"OrlaDesignSystem_5529f2","components":[{"name":"WaveMark","sourcePath":"components/brand/Logo.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"WavePattern","sourcePath":"components/brand/WavePattern.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CircularProgress","sourcePath":"components/core/CircularProgress.jsx"},{"name":"ICONS","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"MetricCard","sourcePath":"components/core/MetricCard.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"8f38b8f006db","components/brand/WavePattern.jsx":"11e54191ee8e","components/core/Avatar.jsx":"d01e8cf685eb","components/core/Badge.jsx":"ec411787317d","components/core/Button.jsx":"5a506355536b","components/core/Card.jsx":"40af5f6aaf76","components/core/CircularProgress.jsx":"a0240a034282","components/core/Icon.jsx":"41f40d89f92d","components/core/IconButton.jsx":"ce3fb954299e","components/core/Input.jsx":"9a8b5aa3ef0d","components/core/MetricCard.jsx":"4515000192ba","components/core/ProgressBar.jsx":"10d1b188cc27","components/navigation/NavItem.jsx":"79c748ee48d7","ui_kits/farol/FarolDashboard.jsx":"36fd9ebeac2b","ui_kits/farol/FarolSidebar.jsx":"405672c2e6f0","ui_kits/site/SiteFooter.jsx":"59ec02f2e914","ui_kits/site/SiteHeader.jsx":"8310c4cb7f92","ui_kits/site/SiteSections.jsx":"26dcde968326"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OrlaDesignSystem_5529f2 = window.OrlaDesignSystem_5529f2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Orla wave mark — the brand's signature "ondulado" symbol.
 * Path extracted verbatim from the source Figma logo. Uses
 * currentColor so it inherits text color.
 */
function WaveMark({
  size = 28,
  color,
  title = "Orla",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 534.126 373.918",
    width: size,
    height: size * 373.918 / 534.126,
    role: "img",
    "aria-label": title,
    style: {
      color,
      display: "block",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    fillRule: "nonzero",
    d: "M 534.126 160.248 L 534.126 267.073 C 534.126 286.534 528.924 304.79 519.826 320.496 C 501.369 352.429 466.845 373.918 427.301 373.918 C 387.756 373.918 353.232 352.429 334.775 320.496 C 325.677 304.79 320.475 286.534 320.475 267.073 L 320.475 213.65 C 320.475 194.189 315.274 175.953 306.176 160.228 C 287.719 128.295 253.195 106.805 213.65 106.805 C 174.105 106.805 139.582 128.295 121.125 160.228 C 112.027 175.953 106.825 194.189 106.825 213.65 L 106.825 267.073 C 106.825 286.534 101.623 304.79 92.526 320.496 C 74.069 352.429 39.545 373.918 0 373.918 L 0 267.093 C 39.545 267.093 74.069 245.603 92.526 213.67 C 101.623 197.965 106.825 179.709 106.825 160.248 L 106.825 106.825 C 106.825 87.364 112.027 69.128 121.125 53.423 C 139.582 21.49 174.105 0 213.65 0 C 253.195 0 287.719 21.49 306.176 53.423 C 315.274 69.148 320.475 87.384 320.475 106.825 L 320.475 160.248 C 320.475 179.709 325.677 197.965 334.775 213.67 C 353.232 245.603 387.756 267.093 427.301 267.093 C 466.845 267.093 501.369 245.603 519.826 213.67 C 528.924 197.965 534.126 179.709 534.126 160.248 Z"
  }));
}

/**
 * Orla logo lockup — wave mark + "orla" wordmark.
 *
 * `variant`: "full" (mark + wordmark) | "mark" (symbol only) | "wordmark"
 * `tone`: "dark" (black ink, for light backgrounds) | "light" (white ink)
 * `sub`: optional sub-brand label rendered beneath ("academy", "conecta")
 *
 * NOTE: the wordmark approximates the custom Orla face with Comfortaa.
 * Prefer the official logo SVG for high-stakes/print usage.
 */
function Logo({
  variant = "full",
  tone = "dark",
  size = 28,
  sub,
  style,
  ...rest
}) {
  const ink = tone === "light" ? "var(--orla-white)" : "var(--orla-black)";
  const showMark = variant === "full" || variant === "mark";
  const showWord = variant === "full" || variant === "wordmark";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.38,
      color: ink,
      lineHeight: 1,
      ...style
    }
  }, rest), showMark && /*#__PURE__*/React.createElement(WaveMark, {
    size: size
  }), showWord && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flexDirection: "column",
      lineHeight: 0.9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-wordmark)",
      fontWeight: 500,
      fontSize: size * 1.18,
      letterSpacing: "0.01em"
    }
  }, "orla"), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-wordmark)",
      fontWeight: 400,
      fontSize: size * 0.62,
      letterSpacing: "0.04em",
      opacity: 0.92
    }
  }, sub)));
}
Object.assign(__ds_scope, { WaveMark, Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/brand/WavePattern.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const WAVE_TILE = "M 200.168 60.054 L 200.168 100.088 C 200.168 107.381 198.219 114.223 194.809 120.108 C 187.892 132.075 174.954 140.129 160.134 140.129 C 145.315 140.129 132.377 132.075 125.46 120.108 C 122.05 114.223 120.101 107.381 120.101 100.088 L 120.101 80.067 C 120.101 72.774 118.151 65.94 114.742 60.047 C 107.825 48.079 94.887 40.026 80.067 40.026 C 65.247 40.026 52.309 48.079 45.392 60.047 C 41.983 65.94 40.034 72.774 40.034 80.067 L 40.034 100.088 C 40.034 107.381 38.084 114.223 34.675 120.108 C 27.758 132.075 14.82 140.129 0 140.129 L 0 100.095 C 14.82 100.095 27.758 92.042 34.675 80.075 C 38.084 74.189 40.034 67.347 40.034 60.054 L 40.034 40.034 C 40.034 32.74 41.983 25.906 45.392 20.021 C 52.309 8.053 65.247 0 80.067 0 C 94.887 0 107.825 8.053 114.742 20.021 C 118.151 25.914 120.101 32.748 120.101 40.034 L 120.101 60.054 C 120.101 67.347 122.05 74.189 125.46 80.075 C 132.377 92.042 145.315 100.095 160.134 100.095 C 174.954 100.095 187.892 92.042 194.809 80.075 C 198.219 74.189 200.168 67.347 200.168 60.054 Z";
const FADE = {
  none: undefined,
  bottom: "linear-gradient(to bottom, #000 0%, #000 40%, transparent 100%)",
  top: "linear-gradient(to top, #000 0%, #000 40%, transparent 100%)",
  left: "linear-gradient(to left, #000 0%, #000 40%, transparent 100%)",
  right: "linear-gradient(to right, #000 0%, #000 40%, transparent 100%)",
  radial: "radial-gradient(ellipse at center, #000 35%, transparent 80%)"
};

/**
 * Orla wave field — the brand's signature "ondulado" pattern, tiled.
 * The wave glyph is the same shape as the logo mark; here it repeats
 * to form the proprietary background field used on hero panels,
 * footers and brand surfaces.
 */
function WavePattern({
  tone = "ink",
  // "ink" = dark waves, "paper" = light waves
  background = "transparent",
  scale = 1,
  // tile = 200x140 * scale
  opacity = 1,
  fade = "none",
  // none | top | bottom | left | right | radial
  rotate = 0,
  style,
  ...rest
}) {
  const w = 200.168 * scale;
  const h = 140.129 * scale;
  const ink = tone === "paper" ? "var(--orla-white)" : "var(--orla-black)";
  const mask = FADE[fade];
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      background,
      pointerEvents: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    style: {
      display: "block",
      color: ink,
      opacity,
      transform: rotate ? `rotate(${rotate}deg) scale(1.5)` : undefined,
      transformOrigin: "center",
      WebkitMaskImage: mask,
      maskImage: mask
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: `orla-wave-${tone}-${scale}`,
    patternUnits: "userSpaceOnUse",
    width: w,
    height: h
  }, /*#__PURE__*/React.createElement("path", {
    d: WAVE_TILE,
    fill: "currentColor",
    fillRule: "nonzero",
    transform: `scale(${scale})`
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "100%",
    height: "100%",
    fill: `url(#orla-wave-${tone}-${scale})`
  })));
}
Object.assign(__ds_scope, { WavePattern });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/WavePattern.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72
};
function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

/**
 * Avatar — image or initials fallback. Square-rounded by default,
 * `shape="circle"` for round.
 */
function Avatar({
  name = "",
  src,
  size = "md",
  shape = "rounded",
  style,
  ...rest
}) {
  const dim = SIZES[size] || size;
  const radius = shape === "circle" ? "50%" : "var(--radius-md)";
  return /*#__PURE__*/React.createElement("span", _extends({
    title: name,
    style: {
      width: dim,
      height: dim,
      flex: "0 0 auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius,
      overflow: "hidden",
      background: src ? "var(--neutral-200)" : "var(--orla-black)",
      color: "var(--orla-white)",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      fontSize: dim * 0.38,
      letterSpacing: "0.01em",
      userSelect: "none",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Status colors mirror Farol's status pills */
const TONES = {
  neutral: {
    fg: "var(--neutral-700)",
    soft: "var(--neutral-200)",
    solid: "var(--neutral-700)"
  },
  info: {
    fg: "var(--orla-blue)",
    soft: "var(--blue-50)",
    solid: "var(--orla-blue)"
  },
  success: {
    fg: "var(--status-success)",
    soft: "#e6f4ec",
    solid: "var(--status-success)"
  },
  warning: {
    fg: "var(--status-warning)",
    soft: "#fbf0df",
    solid: "var(--status-warning)"
  },
  error: {
    fg: "var(--status-error)",
    soft: "#fbe8e7",
    solid: "var(--status-error)"
  },
  purple: {
    fg: "#7c3aed",
    soft: "#f0e9fe",
    solid: "#7c3aed"
  }
};

/**
 * Pill badge / status tag. `appearance="soft"` (tinted) is the default
 * Farol status look; `solid` and `outline` are also available.
 */
function Badge({
  children,
  tone = "neutral",
  appearance = "soft",
  size = "md",
  dot = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const pad = size === "sm" ? "2px 8px" : "4px 11px";
  const fs = size === "sm" ? "var(--text-2xs)" : "var(--text-xs)";
  const look = appearance === "solid" ? {
    background: t.solid,
    color: "var(--orla-white)",
    border: "1px solid transparent"
  } : appearance === "outline" ? {
    background: "transparent",
    color: t.fg,
    border: `1px solid ${t.fg}`
  } : {
    background: t.soft,
    color: t.fg,
    border: "1px solid transparent"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: pad,
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: fs,
      lineHeight: 1.2,
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      ...look,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: appearance === "solid" ? "currentColor" : t.solid
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    fontSize: "var(--text-sm)",
    padding: "8px 14px",
    gap: "6px",
    radius: "var(--radius-sm)",
    icon: 16
  },
  md: {
    fontSize: "var(--text-sm)",
    padding: "11px 18px",
    gap: "8px",
    radius: "var(--radius-md)",
    icon: 18
  },
  lg: {
    fontSize: "var(--text-body)",
    padding: "14px 24px",
    gap: "10px",
    radius: "var(--radius-md)",
    icon: 20
  }
};
const VARIANTS = {
  primary: {
    background: "var(--orla-blue)",
    color: "var(--orla-white)",
    border: "1.5px solid var(--orla-blue)",
    "--hover-bg": "var(--blue-600)",
    "--hover-bd": "var(--blue-600)"
  },
  secondary: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1.5px solid var(--border-default)",
    "--hover-bg": "var(--neutral-100)",
    "--hover-bd": "var(--border-strong)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1.5px solid transparent",
    "--hover-bg": "var(--neutral-100)",
    "--hover-bd": "transparent"
  },
  inverse: {
    background: "var(--orla-white)",
    color: "var(--orla-black)",
    border: "1.5px solid var(--orla-white)",
    "--hover-bg": "var(--neutral-200)",
    "--hover-bd": "var(--neutral-200)"
  }
};

/**
 * Orla button. Blue primary is the brand's call-to-action; secondary
 * is a hairline outline; ghost for low-emphasis; inverse on dark.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: s.fontSize,
      lineHeight: 1,
      padding: s.padding,
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      whiteSpace: "nowrap",
      transition: "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
      transform: hover && !disabled ? "translateY(-1px)" : "none",
      background: hover && !disabled ? v["--hover-bg"] : v.background,
      color: v.color,
      border: v.border,
      borderColor: hover && !disabled ? v["--hover-bd"] : undefined,
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      fontSize: s.icon
    }
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      fontSize: s.icon
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Editorial surface card. Light by default with hairline border;
 * `tone="dark"` for Farol's dark cards; `interactive` adds hover lift.
 */
function Card({
  children,
  tone = "light",
  padding = "lg",
  interactive = false,
  elevated = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const pad = {
    none: 0,
    sm: "16px",
    md: "20px",
    lg: "24px",
    xl: "32px"
  }[padding] ?? padding;
  const dark = tone === "dark";
  const bg = dark ? "var(--neutral-900)" : "var(--surface-card)";
  const border = dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--border-subtle)";
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: bg,
      border,
      borderRadius: "var(--radius-lg)",
      padding: pad,
      color: dark ? "var(--orla-white)" : "var(--text-primary)",
      boxShadow: elevated ? "var(--shadow-md)" : hover ? "var(--shadow-md)" : "var(--shadow-none)",
      transform: hover ? "translateY(-2px)" : "none",
      transition: "box-shadow var(--duration-normal) var(--ease-standard), transform var(--duration-normal) var(--ease-standard)",
      cursor: interactive ? "pointer" : "default",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/CircularProgress.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular progress ring with centered label — Farol's "Saldo de Férias"
 * indicator. Blue track-fill on a faint ring.
 */
function CircularProgress({
  value = 0,
  max = 100,
  size = 96,
  thickness = 8,
  tone = "info",
  label,
  sublabel,
  trackTone = "auto",
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const fill = {
    info: "var(--orla-blue)",
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    error: "var(--status-error)",
    ink: "var(--orla-black)"
  }[tone] || "var(--orla-blue)";
  const track = trackTone === "dark" ? "rgba(255,255,255,0.12)" : "var(--neutral-200)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      width: size,
      height: size,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: "rotate(-90deg)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: track,
    strokeWidth: thickness
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: fill,
    strokeWidth: thickness,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c - pct / 100 * c,
    style: {
      transition: "stroke-dashoffset var(--duration-slow) var(--ease-out)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-semibold)",
      fontSize: size * 0.24,
      lineHeight: 1
    }
  }, label ?? `${Math.round(pct)}%`), sublabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: size * 0.1,
      color: "var(--text-tertiary)"
    }
  }, sublabel)));
}
Object.assign(__ds_scope, { CircularProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CircularProgress.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ── Thin-line icon set (1.75px stroke, round caps) ──
   These substitute the Figma file's Vuesax-Linear icons with a
   matching open-stroke style. Each entry is the inner markup of a
   0 0 24 24 SVG. */
const ICONS = {
  "arrow-right": /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  }),
  "arrow-up-right": /*#__PURE__*/React.createElement("path", {
    d: "M7 17 17 7M8 7h9v9"
  }),
  "chevron-down": /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }),
  "chevron-right": /*#__PURE__*/React.createElement("path", {
    d: "m9 6 6 6-6 6"
  }),
  plus: /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  }),
  check: /*#__PURE__*/React.createElement("path", {
    d: "m4 12 5 5L20 6"
  }),
  x: /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6 6 18"
  }),
  menu: /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18M3 12h18M3 18h18"
  }),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 20-3.5-3.5"
  })),
  bell: /*#__PURE__*/React.createElement("path", {
    d: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
  }),
  globe: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"
  })),
  settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v3M12 19v3M22 12h-3M5 12H2m15.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2"
  })),
  "log-out": /*#__PURE__*/React.createElement("path", {
    d: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"
  }),
  grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7",
    rx: "1.5"
  })),
  calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4.5",
    width: "18",
    height: "17",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 9.5h18M8 3v3M16 3v3"
  })),
  "calendar-check": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4.5",
    width: "18",
    height: "17",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 9.5h18M8 3v3M16 3v3M9 15l2 2 4-4"
  })),
  headset: /*#__PURE__*/React.createElement("path", {
    d: "M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm16 0a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Zm0 6a6 6 0 0 1-6 3"
  }),
  ticket: /*#__PURE__*/React.createElement("path", {
    d: "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-8ZM12 6v2M12 11v2M12 16v2"
  }),
  laptop: /*#__PURE__*/React.createElement("path", {
    d: "M5 5.5h14a1 1 0 0 1 1 1V16H4V6.5a1 1 0 0 1 1-1ZM2 19h20"
  }),
  user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 21c0-4 4-6 8-6s8 2 8 6"
  })),
  "user-plus": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 21c0-4 3.5-6 7-6 1 0 2 .2 3 .5M17 11v6M14 14h6"
  })),
  users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 21c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 5a3.5 3.5 0 0 1 0 7M18 21c0-2.5-1-4.2-2.5-5"
  })),
  wallet: /*#__PURE__*/React.createElement("path", {
    d: "M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h17a1 1 0 0 1 1 1v4h-5a2 2 0 0 1 0-4"
  }),
  scale: /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18M7 21h10M5 7h14M5 7 2.5 13a3 3 0 0 0 5 0L5 7Zm14 0-2.5 6a3 3 0 0 0 5 0L19 7ZM12 5 7 7m5-2 5 2"
  }),
  flag: /*#__PURE__*/React.createElement("path", {
    d: "M5 21V4M5 4h11l-2 4 2 4H5"
  }),
  star: /*#__PURE__*/React.createElement("path", {
    d: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6.6 20l1-6.1L3.2 9.5l6.1-.9L12 3Z"
  }),
  award: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "9",
    r: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 14-1.5 7 5-3 5 3-1.5-7"
  })),
  palm: /*#__PURE__*/React.createElement("path", {
    d: "M12 22V11M12 11c0-3 2.5-5 5-4.5M12 11c0-3-2.5-5-5-4.5M12 11c2-2 5-2 7 0M12 11c-2-2-5-2-7 0M12 11a4 4 0 0 1 4-4"
  }),
  briefcase: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "7.5",
    width: "18",
    height: "13",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5M3 13h18"
  })),
  "more-horizontal": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1.4"
  })),
  clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  "file-text": /*#__PURE__*/React.createElement("path", {
    d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6"
  }),
  send: /*#__PURE__*/React.createElement("path", {
    d: "M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z"
  })
};

/**
 * Inline thin-line icon. `name` selects from the bundled set.
 */
function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color,
  style,
  ...rest
}) {
  const glyph = ICONS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: "img",
    "aria-label": name,
    style: {
      display: "block",
      color,
      flex: "0 0 auto",
      ...style
    }
  }, rest), glyph || null);
}
Object.assign(__ds_scope, { ICONS, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Square icon-only button. Same variant language as Button.
 */
function IconButton({
  children,
  variant = "ghost",
  size = "md",
  rounded = false,
  disabled = false,
  "aria-label": ariaLabel,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const base = {
    primary: {
      bg: "var(--orla-blue)",
      color: "var(--orla-white)",
      bd: "var(--orla-blue)",
      hbg: "var(--blue-600)"
    },
    secondary: {
      bg: "transparent",
      color: "var(--text-primary)",
      bd: "var(--border-default)",
      hbg: "var(--neutral-100)"
    },
    ghost: {
      bg: "transparent",
      color: "var(--text-secondary)",
      bd: "transparent",
      hbg: "var(--neutral-100)"
    }
  }[variant] || {};
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: dim,
      height: dim,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: rounded ? "var(--radius-pill)" : "var(--radius-md)",
      background: hover && !disabled ? base.hbg : base.bg,
      color: base.color,
      border: `1.5px solid ${base.bd}`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _id = 0;

/**
 * Text input with optional label and helper/error text. Hairline
 * border, blue focus ring — Orla's clean form language.
 */
function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  id,
  style,
  containerStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = React.useMemo(() => id || `orla-input-${++_id}`, [id]);
  const borderColor = error ? "var(--status-error)" : focus ? "var(--orla-blue)" : "var(--border-default)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--surface-card)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      padding: "0 14px",
      boxShadow: focus && !error ? "0 0 0 3px var(--blue-50)" : "none",
      transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)"
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      display: "inline-flex"
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: e => {
      setFocus(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur?.(e);
    },
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--text-primary)",
      padding: "11px 0",
      minWidth: 0,
      ...style
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-tertiary)",
      display: "inline-flex"
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: error ? "var(--status-error)" : "var(--text-tertiary)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/MetricCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Metric / KPI card — large display value with label and optional
 * trend delta. Composes the editorial card surface.
 */
function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaTone = "success",
  icon,
  tone = "light",
  style,
  ...rest
}) {
  const dark = tone === "dark";
  const deltaColor = {
    success: "var(--status-success)",
    error: "var(--status-error)",
    neutral: "var(--text-tertiary)"
  }[deltaTone];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: dark ? "var(--neutral-900)" : "var(--surface-card)",
      border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 22px",
      color: dark ? "var(--orla-white)" : "var(--text-primary)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: dark ? "var(--neutral-400)" : "var(--text-secondary)"
    }
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: dark ? "var(--neutral-400)" : "var(--text-tertiary)"
    }
  }, icon)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-display-md)",
      lineHeight: 1,
      letterSpacing: "var(--tracking-tight)"
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-body)",
      color: dark ? "var(--neutral-400)" : "var(--text-secondary)"
    }
  }, unit)), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      color: deltaColor
    }
  }, delta));
}
Object.assign(__ds_scope, { MetricCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MetricCard.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Linear progress bar. Blue fill is the brand default (action/progress);
 * pass `tone` for status-colored bars.
 */
function ProgressBar({
  value = 0,
  max = 100,
  tone = "info",
  height = 8,
  showLabel = false,
  trackTone = "auto",
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const fill = {
    info: "var(--orla-blue)",
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    error: "var(--status-error)",
    ink: "var(--orla-black)"
  }[tone] || "var(--orla-blue)";
  const track = trackTone === "dark" ? "rgba(255,255,255,0.12)" : "var(--neutral-200)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height,
      background: track,
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: fill,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--duration-slow) var(--ease-out)"
    }
  })), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--text-secondary)",
      minWidth: 34,
      textAlign: "right"
    }
  }, Math.round(pct), "%"));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sidebar navigation item — icon + label, with active and dark states.
 * Used by Farol's fixed sidebar.
 */
function NavItem({
  children,
  icon,
  active = false,
  tone = "dark",
  trailing,
  as = "button",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dark = tone === "dark";
  const color = active ? dark ? "var(--orla-white)" : "var(--text-primary)" : dark ? "var(--neutral-400)" : "var(--text-secondary)";
  const bg = active ? dark ? "rgba(255,255,255,0.08)" : "var(--neutral-100)" : hover ? dark ? "rgba(255,255,255,0.04)" : "var(--neutral-50)" : "transparent";
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      width: "100%",
      padding: "9px 12px",
      borderRadius: "var(--radius-md)",
      background: bg,
      color,
      border: "none",
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
      textDecoration: "none",
      transition: "background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
      position: "relative",
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flex: "0 0 auto",
      width: 18,
      height: 18
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, children), trailing);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// ui_kits/farol/FarolDashboard.jsx
try { (() => {
// Farol — main dashboard content: header, balance + periods, requests.
const {
  Button,
  Card,
  Badge,
  Icon,
  CircularProgress,
  ProgressBar
} = window.OrlaDesignSystem_5529f2;
function SectionTitle({
  children,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 17,
      color: "var(--orla-white)"
    }
  }, children), action);
}
function PeriodRow({
  label,
  range,
  status,
  tone,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "13px 0",
      borderBottom: "1px solid rgba(255,255,255,0.07)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--orla-white)",
      fontWeight: 500
    }
  }, label), /*#__PURE__*/React.createElement(Badge, {
    tone: tone,
    size: "sm"
  }, status)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--neutral-500)",
      marginTop: 3
    }
  }, range)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 600,
      color: "var(--orla-white)"
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--neutral-600)"
    }
  }, "/30")));
}
function RequestRow({
  range,
  status,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px",
      borderRadius: "var(--radius-md)",
      borderLeft: `2px solid ${tone === "success" ? "var(--status-success)" : "rgba(255,255,255,0.12)"}`,
      background: "rgba(255,255,255,0.02)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--orla-white)"
    }
  }, range), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--neutral-500)",
      marginTop: 2
    }
  }, "15 dias corridos")), /*#__PURE__*/React.createElement(Badge, {
    tone: tone
  }, status));
}
function FarolDashboard({
  onRequest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px 36px",
      maxWidth: 1180
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 24,
      marginBottom: 28,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 28,
      color: "var(--orla-white)",
      letterSpacing: "-0.02em"
    }
  }, "Boa tarde, Gabriela"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--neutral-400)"
    }
  }, "Voc\xEA tem f\xE9rias dispon\xEDveis para solicitar. \xB7 Quarta-feira, 20 de maio de 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar-check",
      size: 16
    }),
    onClick: onRequest
  }, "Solicitar F\xE9rias"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    style: {
      color: "var(--orla-white)",
      borderColor: "rgba(255,255,255,0.22)"
    },
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })
  }, "Solicitar Aus\xEAncia"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padding: "lg"
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Saldo de F\xE9rias"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(CircularProgress, {
    value: 50,
    size: 108,
    thickness: 9,
    label: "15",
    sublabel: "dias",
    trackTone: "dark"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--neutral-400)",
      marginBottom: 14
    }
  }, "15 dias aprovados \xB7 0 dias pendentes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--neutral-400)",
      marginBottom: 7,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Utilizado"), /*#__PURE__*/React.createElement("span", null, "50%")), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 50,
    trackTone: "dark"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 18,
      paddingTop: 16,
      borderTop: "1px solid rgba(255,255,255,0.07)",
      color: "var(--neutral-500)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 15
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)"
    }
  }, "30 dias dispon\xEDveis a partir de 31/03/2027 (Per\xEDodo II)"))), /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padding: "lg"
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Per\xEDodos Aquisitivos"), /*#__PURE__*/React.createElement(PeriodRow, {
    label: "Per\xEDodo 1",
    range: "01/04/2024 \u2013 31/03/2025",
    status: "Vencido",
    tone: "error",
    value: 30
  }), /*#__PURE__*/React.createElement(PeriodRow, {
    label: "Per\xEDodo 2",
    range: "01/04/2025 \u2013 31/03/2026",
    status: "Concessivo",
    tone: "success",
    value: 15
  }), /*#__PURE__*/React.createElement(PeriodRow, {
    label: "Per\xEDodo 3",
    range: "01/04/2026 \u2013 31/03/2027",
    status: "Em aquisi\xE7\xE3o",
    tone: "info",
    value: 30
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padding: "lg"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    action: /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--neutral-400)",
        textDecoration: "none"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "grid",
      size: 15
    }), "Ver todas")
  }, "\xDAltimas Solicita\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(RequestRow, {
    range: "06/07/2026 \u2013 20/07/2026",
    status: "Aprovada",
    tone: "success"
  }), /*#__PURE__*/React.createElement(RequestRow, {
    range: "22/12/2025 \u2013 05/01/2026",
    status: "Usufru\xEDda",
    tone: "purple"
  }), /*#__PURE__*/React.createElement(RequestRow, {
    range: "04/08/2025 \u2013 18/08/2025",
    status: "Usufru\xEDda",
    tone: "purple"
  }), /*#__PURE__*/React.createElement(RequestRow, {
    range: "05/06/2025 \u2013 20/06/2025",
    status: "Usufru\xEDda",
    tone: "purple"
  }))));
}
window.FarolDashboard = FarolDashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/farol/FarolDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/farol/FarolSidebar.jsx
try { (() => {
// Farol — fixed dark sidebar. Logo, grouped nav, user profile.
const {
  NavItem,
  Icon,
  Avatar,
  WaveMark,
  Badge
} = window.OrlaDesignSystem_5529f2;
function FarolSidebar({
  active,
  onNav
}) {
  const menu = [{
    id: "dashboard",
    label: "Dashboard",
    icon: "grid"
  }, {
    id: "ferias",
    label: "Minhas Férias",
    icon: "calendar"
  }, {
    id: "pesquisa",
    label: "Pesquisa de satisfação",
    icon: "star"
  }];
  const suporte = [{
    id: "abrir",
    label: "Abrir Chamado",
    icon: "headset"
  }, {
    id: "chamados",
    label: "Meus Chamados",
    icon: "ticket",
    count: 3
  }, {
    id: "equip",
    label: "Meus Equipamentos",
    icon: "laptop"
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      flex: "0 0 auto",
      background: "var(--orla-black)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "4px 8px 22px"
    }
  }, /*#__PURE__*/React.createElement(WaveMark, {
    size: 22,
    color: "var(--orla-white)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 18,
      color: "var(--orla-white)",
      letterSpacing: "-0.01em"
    }
  }, "Farol")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: "var(--neutral-600)",
      padding: "8px 12px 8px"
    }
  }, "Menu"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, menu.map(m => /*#__PURE__*/React.createElement(NavItem, {
    key: m.id,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18
    }),
    active: active === m.id,
    onClick: () => onNav(m.id)
  }, m.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: "var(--neutral-600)",
      padding: "20px 12px 8px"
    }
  }, "Suporte TI"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, suporte.map(m => /*#__PURE__*/React.createElement(NavItem, {
    key: m.id,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: m.icon,
      size: 18
    }),
    active: active === m.id,
    onClick: () => onNav(m.id),
    trailing: m.count ? /*#__PURE__*/React.createElement(Badge, {
      tone: "info",
      size: "sm"
    }, m.count) : null
  }, m.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 8px 4px",
      borderTop: "1px solid rgba(255,255,255,0.08)"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Gabriela Pantosi",
    size: "md",
    shape: "circle"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--orla-white)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, "Gabriela Pantosi de Mora\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      color: "var(--neutral-500)"
    }
  }, "gabriela.pantosi@orla.tech"))));
}
window.FarolSidebar = FarolSidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/farol/FarolSidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteFooter.jsx
try { (() => {
// Site Orla — clients band + black footer with wave field.
const {
  Logo,
  WavePattern
} = window.OrlaDesignSystem_5529f2;
const CLIENTS = ["PapelArte", "forjoy", "rosh", "keeggo", "MultiClubes", "aché", "ZMES"];
function SiteFooter() {
  const cols = [{
    h: "Páginas",
    items: ["Sobre Nós", "Clientes"]
  }, {
    h: "Serviços",
    items: ["Discovery de Produtos", "Desenvolvimento de Novos Produtos", "Evolução de Produtos"]
  }, {
    h: "Contato",
    items: ["contato@orla.tech", "Instagram", "LinkedIn"]
  }, {
    h: "Orla",
    items: ["Área do Orlando", "Declaração de Privacidade"]
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--orla-black)",
      color: "var(--orla-white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "64px 48px 8px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 36px",
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 22
    }
  }, "Nossos clientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "28px 48px",
      justifyContent: "center",
      alignItems: "center",
      maxWidth: 900,
      margin: "0 auto"
    }
  }, CLIENTS.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 20,
      color: "var(--neutral-500)"
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 150,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(WavePattern, {
    tone: "paper",
    scale: 0.7,
    fade: "top",
    opacity: 0.18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 48px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 26,
    tone: "light"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 24,
      marginTop: 36,
      paddingBottom: 36,
      borderBottom: "1px solid rgba(255,255,255,0.12)"
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("h5", {
    style: {
      margin: "0 0 14px",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: "var(--text-sm)"
    }
  }, c.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 9
    }
  }, c.items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--neutral-400)",
      textDecoration: "none"
    }
  }, i))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 22,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: "var(--neutral-600)"
    }
  }, "\xA9 2026 Orla. Todos os direitos reservados."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20
    }
  }, ["Português", "English", "Español"].map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: i === 0 ? "var(--orla-white)" : "var(--neutral-600)",
      textDecoration: "none"
    }
  }, l)))))));
}
window.SiteFooter = SiteFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteHeader.jsx
try { (() => {
// Site Orla — top nav + hero. Black, editorial, wave field descending.
const {
  Logo,
  Button,
  Icon,
  WavePattern
} = window.OrlaDesignSystem_5529f2;
function SiteNav() {
  const links = ["Sobre nós", "Serviços", "Contato", "Blog"];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "26px 48px",
      position: "relative",
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 24,
    tone: "light"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 30
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--neutral-400)",
      textDecoration: "none"
    }
  }, l)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--orla-white)"
    }
  }, "PT ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 14
  }))));
}
function SiteHero() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "relative",
      background: "var(--orla-black)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(SiteNav, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      right: 0,
      width: "62%",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(WavePattern, {
    tone: "paper",
    scale: 1.15,
    fade: "left",
    opacity: 1
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      padding: "90px 48px 130px",
      maxWidth: 780
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 300,
      fontSize: 64,
      lineHeight: 1.04,
      letterSpacing: "-0.03em",
      color: "var(--orla-white)"
    }
  }, "Potencializamos a inova\xE7\xE3o por meio de produtos digitais."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 38,
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Fale com a gente"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    style: {
      color: "var(--orla-white)",
      borderColor: "rgba(255,255,255,0.25)"
    }
  }, "Nossos servi\xE7os"))));
}
window.SiteHero = SiteHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteSections.jsx
try { (() => {
// Site Orla — content sections: services, process timeline, CTA.
const {
  Card,
  Icon,
  Button
} = window.OrlaDesignSystem_5529f2;
const SERVICES = [{
  t: "Discovery de Produtos",
  d: "O principal pilar da inovação é a melhoria contínua. Identificamos quais são os problemas dos usuários e oportunidades, passando pelo processo de desenho e validação de hipóteses."
}, {
  t: "Desenvolvimento de Novos Produtos",
  d: "Criar um MVP é uma das melhores maneiras de validar como o mercado recebe a sua ideia. Realizamos desde o Discovery de produto até escalá-lo a MVP."
}, {
  t: "Evolução de Produtos",
  d: "Produtos que passam por ciclos contínuos de inovação, se mantêm relevantes no mercado. Fazemos isso através de análise de métricas e indicadores."
}];
const STEPS = [{
  n: "1",
  t: "Iniciação e Planejamento",
  d: "Entendemos o desafio e a complexidade, para começarmos a elaborar um plano e proposta em conjunto."
}, {
  n: "2",
  t: "Imersão e Descobertas",
  d: "Identificamos quais são os problemas e oportunidades, para partir para o processo de ideação e validação de hipóteses."
}, {
  n: "3",
  t: "Entrega e Iteração",
  d: "Com o protótipo, entregamos nas mãos dos usuários, promovendo um ciclo de inovação contínua."
}];
function Photo({
  style
}) {
  // Grayscale placeholder — drop in real B&W photography in production.
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      height: 116,
      borderRadius: "var(--radius-md)",
      background: "linear-gradient(135deg, var(--neutral-300), var(--neutral-500))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(255,255,255,0.85)",
      flex: "0 0 auto",
      filter: "grayscale(1)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "laptop",
    size: 26
  }));
}
function ServicesSection() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "96px 48px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 36,
      letterSpacing: "-0.02em"
    }
  }, "O que fazemos"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px auto 0",
      maxWidth: 540,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-body)",
      color: "var(--text-secondary)",
      lineHeight: 1.6
    }
  }, "Na Orla, te acompanhamos de perto. Trabalhamos com metodologias \xE1geis e oferecemos servi\xE7os adaptados \xE0s necessidades do seu neg\xF3cio."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20,
      maxWidth: 1040,
      margin: "48px auto 0",
      textAlign: "left"
    }
  }, SERVICES.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.t,
    padding: "lg",
    interactive: true,
    style: {
      background: "var(--neutral-50)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 19
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)",
      lineHeight: 1.6
    }
  }, s.d)))));
}
function ProcessSection() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "20px 48px 96px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 56px",
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 36,
      letterSpacing: "-0.02em"
    }
  }, "Como fazemos"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560,
      margin: "0 auto",
      position: "relative",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 75,
      top: 20,
      bottom: 20,
      width: 2,
      background: "var(--orla-blue)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 44
    }
  }, STEPS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      display: "flex",
      gap: 28,
      alignItems: "center",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Photo, null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 69,
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: "var(--orla-blue)",
      border: "3px solid var(--surface-page)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 18
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 17
    }
  }, s.n, ". ", s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "7px 0 0",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)",
      lineHeight: 1.55
    }
  }, s.d)))))));
}
function CtaBanner() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "0 48px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-2xl)",
      background: "var(--orla-black)",
      padding: "64px 56px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      position: "relative",
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      fontSize: 38,
      color: "var(--orla-white)",
      letterSpacing: "-0.02em"
    }
  }, "Comunidade. Colabora\xE7\xE3o.", /*#__PURE__*/React.createElement("br", null), "Comprometimento."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px auto 28px",
      position: "relative",
      maxWidth: 520,
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--neutral-400)",
      lineHeight: 1.6
    }
  }, "Para as pessoas certas, buscamos sempre o melhor lugar para si: o da hora, promovendo total apoio, capacidades de forma\xE7\xE3o e acompanhamento."), /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    }),
    style: {
      position: "relative"
    }
  }, "Trabalhe com a gente")));
}
window.SiteSections = function SiteSections() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ServicesSection, null), /*#__PURE__*/React.createElement(ProcessSection, null), /*#__PURE__*/React.createElement(CtaBanner, null));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteSections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.WaveMark = __ds_scope.WaveMark;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.WavePattern = __ds_scope.WavePattern;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CircularProgress = __ds_scope.CircularProgress;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.MetricCard = __ds_scope.MetricCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.NavItem = __ds_scope.NavItem;

})();
