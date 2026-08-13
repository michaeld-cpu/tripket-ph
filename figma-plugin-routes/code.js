/* ============================================================================
 * Tripket — Build "Routes — All states (v3)"
 * ----------------------------------------------------------------------------
 * Rebuilds app/routes/page.tsx as native Figma frames. The plugin CREATES its
 * own section below every existing section on the page, so the stale
 * DOM-imported frames in the original "Routes — All states" stay untouched.
 *
 * v3 (Aug 2026) tracks the routes-module rewrite:
 *   · AssignVesselDialog replaced CreateRouteModal's assign mode
 *   · cancelling a leg now captures a reason, then hands off to a refund pass
 *   · Cancelled legs gained "Mark Scheduled" and "Refund bookings"
 *   · row-menu items carry semantic tones; the pager gained a page-size control
 *
 * Shares the chrome layer with the Tickets plugin (sidebar, topbar, page
 * header, modal shell, embedded logos, text measurement). Routes-only code
 * starts at the "R1." marker.
 *
 * Measurements are real CSS pixels at 1440x900. globals.css sets
 * html { font-size: 17px }, so rem utilities are 17px-based (px-5 = 21.25,
 * py-3.5 = 14.875), and the type-scale layer lifts arbitrary text-[Npx] ~1px.
 * ========================================================================== */

/* ── 1. Tokens ─────────────────────────────────────────────────────────── */

const C = {
  white:      '#FFFFFF',
  slate900:   '#0F172A',
  slate700:   '#334155',
  slate600:   '#475569',
  slate500:   '#64748B',
  slate400:   '#94A3B8',
  slate300:   '#CBD5E1',
  slate200:   '#E2E8F0',
  slate100:   '#F1F5F9',
  slate50:    '#F8FAFC',
  gray500:    '#6B7280',
  gray200:    '#E5E7EB',
  gray100:    '#F3F4F6',
  gray50:     '#F9FAFB',
  brand50:    '#FFF7ED',
  brand100:   '#FFEDD5',
  brand500:   '#F97316',
  brand600:   '#EA580C',
  brand700:   '#C2410C',
  emerald50:  '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
  yellow50:   '#FEFCE8',
  yellow700:  '#A16207',
  amber100:   '#FEF3C7',
  amber500:   '#F59E0B',
  amber700:   '#B45309',
  amber800:   '#92400E',
  sky50:      '#F0F9FF',
  sky500:     '#0EA5E9',
  sky700:     '#0369A1',
  rose50:     '#FFF1F2',
  rose200:    '#FECDD3',
  rose300:    '#FDA4AF',
  rose500:    '#F43F5E',
  rose600:    '#E11D48',
  red500:     '#EF4444',
  red600:     '#DC2626',
  indigo50:   '#EEF2FF',
  indigo200:  '#C7D2FE',
  indigo600:  '#4F46E5',
  indigo700:  '#4338CA',
  amber50:    '#FFFBEB',
  amber200:   '#FDE68A',
  emerald200: '#A7F3D0',
  brand200:   '#FED7AA',
  brand300:   '#FDBA74',
  brand400:   '#FB923C',
  gray300:    '#D1D5DB',
  gray400:    '#9CA3AF',
  gray900:    '#111827',
  black:      '#000000',
};

const SP = {
  s05: 2.125, s1: 4.25, s1_5: 6.375, s2: 8.5, s2_5: 10.625,
  s3: 12.75, s3_5: 14.875, s4: 17, s5: 21.25, s6: 25.5, s8: 34, s9: 38.25,
};
const RAD = { md: 6.375, lg: 8.5, xl: 12.75, xxl: 17, full: 999 };

// Post-lift font sizes: class in source → rendered px.
const FS = {
  t8: 8, t9: 9, t9_5: 10.5, t10: 11, t10_5: 11.5, t11: 12, t11_5: 12.5,
  t12: 13, t12_5: 13.5, t13: 14, t13_5: 14.5, t15: 16, t15_5: 15.5, t17: 18,
  xs: 12.75, sm: 14.875, base: 17, xl: 21.25,
};

const LEADING = 1.5;               // browser leading-normal
const lh = (size) => size * LEADING;

const FRAME_W = 1440;
const FRAME_H = 900;
const SIDEBAR_W = 255;
const TOPBAR_H = 59.5;
const MAIN_X = SIDEBAR_W;
const MAIN_W = FRAME_W - SIDEBAR_W;
const MAIN_H = FRAME_H - TOPBAR_H;
const CONTENT_X = SP.s8;
const CONTENT_Y = SP.s6;
const CONTENT_W = MAIN_W - SP.s8 * 2;   // 1117

let FONT = { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };

/* ── 2. Embedded assets ────────────────────────────────────────────────── */

// public/imgs/logo.png, recoloured white (CSS: brightness-0 invert).
const LOGO_WHITE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAACcAAAAYCAYAAAB5j+RNAAACYElEQVR42rWXvY7TUBCFv6yokR+AaMMTxC0V5gk2FS0RgnoTXiCbJyC0NNntkcJ2QINp+GnASPQxYregiqFnD81c6erKdq6z2ZGs+P6fzJ1zZtyTxA6WAiPgEEiAgf2eASfevDFQAvkuhyCp63OsZhtLSiTNJG2sbyQp2+GcTuASSc9rAG0kLSSlAShnA1s/uClwA0nfakCd2FgdKGcPd/FaF3AhsEUEKGeXkj6b1/tdwPUiCbG2oHf2AFgZCdrsH/A76PsEvANebjv0IJI3pfd+6rGTCHCh3QOmMYfeigRXee9nwJLr2ZuYSbGe+xN4cBC57qqh/+0+wTnPnQOPOnioaOj/eBPgTk31Y2xq8fUYuAgI8XefGSI1pR9ru723+eEeTyR96aJ7bVLicmYKDO09a2FpBcyBhbUz4BnwFXgF/AD6Nvbrup5LFGcuUyTeupU3dukJ8dMuInywJc7yLeNz4K5XicxMsEc1bO131ZttOvfBrscHVJjWvbZ2ChwBk5orv6rJDnsDl1u8/TQwhQfo2IBnDV59YXp2AdwBblvcRVtMbs2MDEMDlbaQIrerzj0yJR7gskX7dpKSVYR0OEJkVn1sItZMttV4MeAmATPXkpbWn9RUvqGt7WkaXzaB7Ely+lV6MRXqXVKTW0dGhMwbO7c9CmtXDd8f7sz71sYYP2+KucxS09A2rWo2T71yyTH33NJa5e1zFJRVhTE/r9nTAZ15tWLZRojUC+jDYOy7553KAKR2gGN24f05l2kc2LVJUVlz7thUYArksZVw4oEIr9p5Jvbzz4FtY+0YKP8DQZycqqLnwP8AAAAASUVORK5CYII=';
// public/imgs/2go.png — the seeded active shipping line.
const LINE_LOGO_B64 = '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';

let LOGO_WHITE_HASH = null;
let LINE_LOGO_HASH = null;

function b64ToBytes(b64) {
  if (typeof figma.base64Decode === 'function') return figma.base64Decode(b64);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (chars.indexOf(clean[i]) << 18) | (chars.indexOf(clean[i + 1]) << 12) |
              ((chars.indexOf(clean[i + 2]) & 63) << 6) | (chars.indexOf(clean[i + 3]) & 63);
    if (p < out.length) out[p++] = (n >> 16) & 255;
    if (p < out.length) out[p++] = (n >> 8) & 255;
    if (p < out.length) out[p++] = n & 255;
  }
  return out;
}

function loadImages() {
  try { LOGO_WHITE_HASH = figma.createImage(b64ToBytes(LOGO_WHITE_B64)).hash; } catch (e) { LOGO_WHITE_HASH = null; }
  try { LINE_LOGO_HASH = figma.createImage(b64ToBytes(LINE_LOGO_B64)).hash; } catch (e) { LINE_LOGO_HASH = null; }
}

/* ── 3. Primitives ─────────────────────────────────────────────────────── */

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function fill(h, opacity) {
  const p = { type: 'SOLID', color: hex(h) };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
}

function frame(parent, name, x, y, w, h, opts) {
  const o = opts || {};
  const f = figma.createFrame();
  f.name = name;
  f.x = x; f.y = y;
  f.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  f.fills = o.bg ? fill(o.bg, o.opacity) : [];
  f.clipsContent = o.clip !== undefined ? o.clip : false;
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.stroke) {
    f.strokes = fill(o.stroke, o.strokeOpacity);
    f.strokeWeight = o.strokeW !== undefined ? o.strokeW : 1;
    f.strokeAlign = o.strokeAlign || 'INSIDE';
  }
  if (o.dash) f.dashPattern = o.dash;
  if (o.shadow) f.effects = o.shadow;
  parent.appendChild(f);
  return f;
}

function rect(parent, name, x, y, w, h, opts) {
  const o = opts || {};
  const r = figma.createRectangle();
  r.name = name;
  r.x = x; r.y = y;
  r.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  r.fills = o.bg ? fill(o.bg, o.opacity) : [];
  if (o.radius !== undefined) r.cornerRadius = o.radius;
  if (o.stroke) {
    r.strokes = fill(o.stroke, o.strokeOpacity);
    r.strokeWeight = o.strokeW !== undefined ? o.strokeW : 1;
    r.strokeAlign = o.strokeAlign || 'INSIDE';
  }
  parent.appendChild(r);
  return r;
}

function hairline(parent, name, x, y, w, color, opacity) {
  return rect(parent, name, x, y, w, 1, { bg: color, opacity: opacity });
}

function text(parent, name, chars, x, y, opts) {
  const o = opts || {};
  const t = figma.createText();
  t.name = name || String(chars);
  t.fontName = { family: FONT.family, style: o.weight || FONT.regular };
  t.characters = String(chars);
  t.fontSize = o.size || FS.sm;
  t.fills = fill(o.color || C.slate900, o.opacity);
  if (o.tracking !== undefined) t.letterSpacing = { unit: 'PIXELS', value: o.tracking };
  t.lineHeight = { unit: 'PIXELS', value: o.lh || lh(o.size || FS.sm) };
  if (o.width) {
    t.textAutoResize = 'HEIGHT';
    t.resize(o.width, t.height);
    t.textAlignHorizontal = o.align || 'LEFT';
  } else {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  t.x = x; t.y = y;
  parent.appendChild(t);
  return t;
}

function centerIn(node, box) {
  node.x = box.x + (box.w - node.width) / 2;
  node.y = box.y + (box.h - node.height) / 2;
}

/* Text measurement — mirrors how the browser sizes nowrap table cells. */
const MEASURE_CACHE = Object.create(null);
let MEASURE_NODE = null;
function measure(chars, size, weight, tracking) {
  const key = chars + '|' + size + '|' + (weight || FONT.regular) + '|' + (tracking || 0);
  if (MEASURE_CACHE[key] !== undefined) return MEASURE_CACHE[key];
  if (!MEASURE_NODE) {
    MEASURE_NODE = figma.createText();
    MEASURE_NODE.name = '__measure__';
  }
  MEASURE_NODE.fontName = { family: FONT.family, style: weight || FONT.regular };
  MEASURE_NODE.textAutoResize = 'WIDTH_AND_HEIGHT';
  MEASURE_NODE.fontSize = size;
  MEASURE_NODE.letterSpacing = { unit: 'PIXELS', value: tracking || 0 };
  MEASURE_NODE.characters = String(chars);
  const w = MEASURE_NODE.width;
  MEASURE_CACHE[key] = w;
  return w;
}

/* SVG nodes, cached and cloned — the frames need ~1,500 glyphs. */
const SVG_CACHE = Object.create(null);
function svgNode(parent, name, svg, x, y) {
  let node;
  if (SVG_CACHE[svg]) {
    node = SVG_CACHE[svg].clone();
  } else {
    const created = figma.createNodeFromSvg(svg);
    SVG_CACHE[svg] = created;
    node = created.clone();
  }
  node.name = name;
  node.x = x; node.y = y;
  parent.appendChild(node);
  return node;
}

/** 24-viewBox icon at size `s`, tinted `color`. */
function icon(parent, name, def, x, y, s, color) {
  const sw = def.sw || 1.5;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
    'fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" ' +
    'stroke-linejoin="round">' + def.d + '</svg>';
  return svgNode(parent, name, svg, x, y);
}

function flushSvgCache() {
  Object.keys(SVG_CACHE).forEach((k) => {
    try { SVG_CACHE[k].remove(); } catch (e) { /* gone */ }
    delete SVG_CACHE[k];
  });
  if (MEASURE_NODE) { try { MEASURE_NODE.remove(); } catch (e) {} MEASURE_NODE = null; }
}

const CARD_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.08 },
  offset: { x: 0, y: 20 }, radius: 40, spread: -24, visible: true, blendMode: 'NORMAL',
}];
const DIALOG_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.35 },
  offset: { x: 0, y: 30 }, radius: 80, spread: -20, visible: true, blendMode: 'NORMAL',
}];
const MENU_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.25 },
  offset: { x: 0, y: 18 }, radius: 44, spread: -16, visible: true, blendMode: 'NORMAL',
}];


/* ── 4. Icons — verbatim path data from the source components ──────────── */

// Sidebar nav (components/Sidebar.tsx). Stroke weights preserved per icon.
const NAV_ICONS = {
  dashboard: { sw: 1.5, d: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  voyage:    { sw: 1.5, d: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  route:     { sw: 1.5, d: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5"/>' },
  ferry:     { sw: 1.5, d: '<path d="M12 3v3"/><path d="M6 13V8h12v5"/><path d="M3 13h18l-1.8 5.2a2 2 0 0 1-1.9 1.3H6.7a2 2 0 0 1-1.9-1.3L3 13Z"/><path d="M2.5 21c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.3 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.3-1"/>' },
  bookings:  { sw: 1.5, d: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6M9 18h4"/>' },
  tickets:   { sw: 1.5, d: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>' },
  passengers:{ sw: 1.75, d: '<path d="M18 21.0001C17.713 17.269 14.7289 14.3151 10.995 14.0662L10 13.9999C9.64458 14.0096 9.31335 14.0225 9.00082 14.0378C5.3 14.2192 2.28417 17.3057 2 21.0001"/><path d="M18 6.49988H22"/><path d="M18 9.99988H22"/><path d="M20 13.4999H22"/><circle cx="10" cy="6.99988" r="4"/>' },
  vehicles:  { sw: 1.75, d: '<path d="M9.0072 17C9.0072 18.1046 8.11177 19 7.0072 19C5.90263 19 5.0072 18.1046 5.0072 17C5.0072 15.8954 5.90263 15 7.0072 15C8.11177 15 9.0072 15.8954 9.0072 17Z"/><path d="M19.0072 17C19.0072 18.1046 18.1118 19 17.0072 19C15.9026 19 15.0072 18.1046 15.0072 17C15.0072 15.8954 15.9026 15 17.0072 15C18.1118 15 19.0072 15.8954 19.0072 17Z"/><path d="M2.00722 10H18.0072M3.64197 5.42C3.16234 6.2 2.22306 8.26 2.00722 10C2.00722 10.78 1.98723 13.04 2.01122 15.26C2.04719 15.98 2.1671 16.58 5.00893 17M9.00722 10V5M14.9973 17H9.00189M2.02321 5H12.2394C12.2394 5 12.779 5 13.2586 5.048C14.158 5.132 14.9134 5.54 15.6688 6.56C16.4687 7.64 17.0837 9.008 17.8991 9.74C19.2541 10.9564 21.8321 10.58 21.976 13.16C22.012 14.48 22.012 15.92 21.952 16.16C21.8557 16.8667 21.3108 16.9821 20.633 17C20.0448 17.0156 19.3357 16.9721 18.9903 17"/>' },
  reports:   { sw: 1.5, d: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>' },
  accounts:  { sw: 1.5, d: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16c.5-1.4 1.7-2 3-2s2.5.6 3 2"/><path d="M14 10h4M14 13.5h3"/>' },
  audit:     { sw: 1.5, d: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>' },
  settings:  { sw: 1.5, d: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>' },
  chevronDown: { sw: 2, d: '<path d="M6 9l6 6 6-6"/>' },
  chevronLeft: { sw: 2, d: '<path d="M15 6l-6 6 6 6"/>' },
};

// Page-level icons, verbatim from the ticket pages and shared components.
const I = {
  search:      { sw: 2,    d: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
  filters:     { sw: 2,    d: '<path d="M3 5h18M6 12h12M10 19h4"/>' },
  copy:        { sw: 1.75, d: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>' },
  check:       { sw: 2.5,  d: '<path d="M5 12l5 5 9-11"/>' },
  checkThin:   { sw: 2,    d: '<path d="M5 12l5 5 9-11"/>' },
  arrowRight:  { sw: 2,    d: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  sort:        { sw: 2,    d: '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>' },
  updown:      { sw: 2,    d: '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>' },
  chevronDown: { sw: 2,    d: '<path d="m6 9 6 6 6-6"/>' },
  chevronLeft: { sw: 2,    d: '<path d="M15 18l-6-6 6-6"/>' },
  chevronRight:{ sw: 2,    d: '<path d="M9 6l6 6-6 6"/>' },
  eye:         { sw: 1.75, d: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>' },
  pencil:      { sw: 1.75, d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  markPaid:    { sw: 1.75, d: '<path d="M5 12l5 5 9-11"/>' },
  refund:      { sw: 1.75, d: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>' },
  cancel:      { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
  close:       { sw: 1.75, d: '<path d="M6 6l12 12M18 6 6 18"/>' },
  bell:        { sw: 1.75, d: '<path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>' },
  export:      { sw: 1.75, d: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 9v6"/><path d="m9 12 3 3 3-3"/>' },
  inbox:       { sw: 1.5,  d: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>' },
  imageDash:   { sw: 1.75, d: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 17 5-5 4 4 3-3 4 4"/>' },
  photo:       { sw: 1.5,  d: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 13 2.5 3L14 12l4 5"/><circle cx="8.5" cy="9" r="1.5"/>' },
  userRemoved: { sw: 2,    d: '<circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><path d="M16 11h5"/>' },
  comped:      { sw: 2,    d: '<path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z"/><path d="M5 14V8a1 1 0 0 1 1-1h7l5 4"/>' },
  // ActivityLog event glyphs (stroke-width 3 in source, drawn white on the node)
  actCreated:  { sw: 3,    d: '<path d="M12 5v14M5 12h14"/>' },
  actPaid:     { sw: 3,    d: '<path d="M5 12l5 5 9-11"/>' },
  actEdited:   { sw: 3,    d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  // Dialog chrome added in v4
  calendar:    { sw: 1.75, d: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>' },
  plus:        { sw: 1.8,  d: '<path d="M12 5v14M5 12h14"/>' },
  lock:        { sw: 1.9,  d: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' },
  personRound: { sw: 1.75, d: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>' },
  carRound:    { sw: 1.6,  d: '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5"/><path d="M5 17h14"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>' },
};

/** Route-leg connector: dashed rule + arrowhead, viewBox 0 0 48 12, h-3 w-10. */
function legArrow(parent, name, x, y) {
  const w = 42.5, h = 12.75;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 48 12" ' +
    'fill="none" stroke="' + C.slate300 + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 6 H38" stroke-dasharray="3 3"/><path d="M38 2 L44 6 L38 10"/></svg>';
  return svgNode(parent, name, svg, x, y);
}


const LINE = { name: '2GO Travel', initial: '2G' };

/* ── 7. Shared chrome ──────────────────────────────────────────────────── */

const NAV = [
  { label: 'Dashboard',     ic: NAV_ICONS.dashboard },
  { divider: true },
  { label: 'Voyages',       ic: NAV_ICONS.voyage },
  { label: 'Routes',        ic: NAV_ICONS.route },
  { label: 'Vessels',       ic: NAV_ICONS.ferry },
  { label: 'Bookings',      ic: NAV_ICONS.bookings },
  { label: 'Tickets',       ic: NAV_ICONS.tickets, group: true },
  { label: 'Passengers',    ic: NAV_ICONS.passengers, child: true },
  { label: 'Vehicles',      ic: NAV_ICONS.vehicles,   child: true },
  { label: 'Reports',       ic: NAV_ICONS.reports },
  { label: 'Accounts',      ic: NAV_ICONS.accounts, group: true },
  { label: 'Activity logs', ic: NAV_ICONS.audit },
  { divider: true },
  { label: 'Settings',      ic: NAV_ICONS.settings },
];

const NAV_ITEM_H = SP.s1_5 * 2 + lh(FS.t13_5);   // py-1.5 + leading-normal ≈ 34.5
const NAV_GAP = 1;                                // gap-px
const NAV_DIVIDER_H = 18;

/** LogoTile — white rounded-md tile, gray-200 ring, line logo object-contain. */
function logoTile(parent, x, y, size) {
  const tile = frame(parent, 'LogoTile · ' + LINE.name, x, y, size, size, {
    bg: C.white, radius: RAD.md, stroke: C.gray200, clip: true,
  });
  if (LINE_LOGO_HASH) {
    tile.fills = [
      { type: 'SOLID', color: hex(C.white) },
      { type: 'IMAGE', scaleMode: 'FIT', imageHash: LINE_LOGO_HASH },
    ];
  } else {
    const t = text(tile, 'Initial', LINE.initial, 0, 0,
      { size: FS.t10, weight: FONT.bold, color: C.slate700 });
    centerIn(t, { x: 0, y: 0, w: size, h: size });
  }
  return tile;
}

function buildSidebar(parent, activeLabel) {
  const side = frame(parent, 'Sidebar', 0, 0, SIDEBAR_W, FRAME_H, { clip: true });
  side.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0,   color: Object.assign({ a: 1 }, hex('#FAFBFC')) },
      { position: 0.6, color: Object.assign({ a: 1 }, hex('#FCFCFD')) },
      { position: 1,   color: Object.assign({ a: 1 }, hex(C.white)) },
    ],
  }];
  rect(side, 'Border right', SIDEBAR_W - 1, 0, 1, FRAME_H, { bg: C.slate200, opacity: 0.7 });

  // Brand header — px-2 inside the aside's px-3, mb-6.
  const brandY = SP.s5;
  const brand = frame(side, 'Brand', SP.s3, brandY, SIDEBAR_W - SP.s3 * 2, SP.s9);
  const tile = frame(brand, 'Logo tile', SP.s2, 0, SP.s9, SP.s9, { bg: C.brand600, radius: RAD.xl, clip: true });
  if (LOGO_WHITE_HASH) {
    // img h-5 w-5 object-contain, white via brightness-0 invert.
    const img = frame(tile, 'Logo image / logo.png', (SP.s9 - SP.s5) / 2, (SP.s9 - SP.s5) / 2, SP.s5, SP.s5);
    img.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: LOGO_WHITE_HASH }];
  }
  text(brand, 'Brand name', 'Tripket PH', SP.s2 + SP.s9 + SP.s2_5, (SP.s9 - lh(FS.t15)) / 2,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  // Navigation — starts after the brand block's mb-6.
  const navY = brandY + SP.s9 + SP.s6;
  const nav = frame(side, 'Navigation', SP.s3, navY, SIDEBAR_W - SP.s3 * 2, 10);
  let y = 0;
  NAV.forEach((entry) => {
    if (entry.divider) {
      const d = frame(nav, 'Divider', 0, y, nav.width, NAV_DIVIDER_H);
      hairline(d, 'Rule', SP.s3, NAV_DIVIDER_H / 2, nav.width - SP.s3 * 2, C.slate200, 0.7);
      y += NAV_DIVIDER_H + NAV_GAP;
      return;
    }
    const active = entry.label === activeLabel;
    // Source: the active leaf gets weight + colour only — no background tint.
    const item = frame(nav, 'Nav item · ' + entry.label, 0, y, nav.width, NAV_ITEM_H, { radius: RAD.md });
    if (active) {
      rect(item, 'Active indicator', 0, (NAV_ITEM_H - SP.s5) / 2, 3, SP.s5, { bg: C.brand500, radius: 1.5 });
    }
    const px = entry.child ? SP.s9 : SP.s3;   // pl-9 for group children
    icon(item, 'Icon', entry.ic, px, (NAV_ITEM_H - 18) / 2, 18, active ? C.brand600 : C.slate400);
    text(item, 'Label', entry.label, px + 18 + SP.s3, (NAV_ITEM_H - lh(FS.t13_5)) / 2, {
      size: FS.t13_5,
      weight: active ? FONT.medium : FONT.regular,
      color: active ? C.slate900 : C.slate600,
      tracking: active ? -0.2 : 0,
    });
    if (entry.group) {
      icon(item, 'Icon · chevron', NAV_ICONS.chevronDown, nav.width - SP.s3 - 14,
        (NAV_ITEM_H - 14) / 2, 14, C.slate400);
    }
    y += NAV_ITEM_H + NAV_GAP;
  });
  nav.resize(nav.width, y);

  // User block — mt-4, border-t, pt-3; pinned to the bottom by the flex-1 nav.
  const btnH = SP.s2 * 2 + SP.s8;                       // py-2 + h-8 avatar
  const blockH = SP.s4 + 1 + SP.s3 + btnH;
  const blockY = FRAME_H - SP.s5 - blockH;
  const block = frame(side, 'User block', SP.s3, blockY, SIDEBAR_W - SP.s3 * 2, blockH);
  hairline(block, 'Border top', 0, SP.s4, block.width, C.slate200, 0.7);
  const btnY = SP.s4 + 1 + SP.s3;
  const av = frame(block, 'Avatar', SP.s2, btnY + SP.s2, SP.s8, SP.s8,
    { bg: C.brand100, radius: RAD.lg });
  const ini = text(av, 'Initials', 'MD', 0, 0, { size: FS.t10, weight: FONT.bold, color: C.brand600 });
  centerIn(ini, { x: 0, y: 0, w: SP.s8, h: SP.s8 });
  const tx = SP.s2 + SP.s8 + SP.s2_5;
  text(block, 'Role', 'Admin', tx, btnY + SP.s2 + 1,
    { size: FS.t12, weight: FONT.medium, color: C.slate900 });
  text(block, 'Email', 'michael@tripket.ph', tx, btnY + SP.s2 + 1 + lh(FS.t12),
    { size: FS.t10, color: C.slate500 });

  // Collapse handle — absolute -right-3 top-1/2, h-6 w-6, 2px white ring.
  const collapse = frame(side, 'Button - Collapse sidebar', SIDEBAR_W - 13, FRAME_H / 2 - 13, 26, 26,
    { bg: C.brand600, radius: RAD.full, stroke: C.white, strokeW: 2 });
  icon(collapse, 'Icon', NAV_ICONS.chevronLeft, (26 - 14.875) / 2, (26 - 14.875) / 2, 14.875, C.white);
  return side;
}

function buildTopbar(parent) {
  const bar = frame(parent, 'Header', 0, 0, MAIN_W, TOPBAR_H, { bg: C.white });
  hairline(bar, 'Border bottom', 0, TOPBAR_H - 1, MAIN_W, C.slate200, 0.7);

  // ShippingLineSwitcher — px-2 py-1.5 rounded-lg, no border in the rest state.
  const nameW = measure(LINE.name, FS.sm, FONT.medium);
  const swW = SP.s2 * 2 + 25.5 + SP.s2 + nameW + SP.s1 + SP.s5;
  const swH = SP.s1_5 * 2 + lh(FS.sm);
  const sw = frame(bar, 'ShippingLineSwitcher', SP.s6, (TOPBAR_H - swH) / 2, swW, swH, { radius: RAD.lg });
  logoTile(sw, SP.s2, (swH - 25.5) / 2, 25.5);
  text(sw, 'Line name', LINE.name, SP.s2 + 25.5 + SP.s2, (swH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate900 });
  const chev = frame(sw, 'Chevron box', SP.s2 + 25.5 + SP.s2 + nameW + SP.s1, (swH - SP.s5) / 2,
    SP.s5, SP.s5, { bg: C.gray100, radius: RAD.md });
  icon(chev, 'Icon', I.updown, (SP.s5 - 12.75) / 2, (SP.s5 - 12.75) / 2, 12.75, C.gray500);

  const notif = frame(bar, 'Button - Notifications', MAIN_W - SP.s6 - SP.s9, (TOPBAR_H - SP.s9) / 2,
    SP.s9, SP.s9, { radius: RAD.full });
  icon(notif, 'Icon', I.bell, (SP.s9 - SP.s5) / 2, (SP.s9 - SP.s5) / 2, SP.s5, C.slate600);
  rect(notif, 'Unread dot', SP.s9 - SP.s2 - 6.375, SP.s2, 6.375, 6.375, { bg: C.red500, radius: RAD.full });
  return bar;
}

function buildPageHeader(parent, title) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, Math.max(lh(FS.xl), btnH));
  text(h, 'Page title', title, 0, 0,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5 });

  const labelW = measure('Export', FS.sm, FONT.medium);
  const btnW = SP.s3 * 2 + 17 + SP.s1_5 + labelW;
  const btn = frame(h, 'Button - Export', CONTENT_W - btnW, 0, btnW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(btn, 'Icon', I.export, SP.s3, (btnH - 17) / 2, 17, C.slate500);
  text(btn, 'Label', 'Export', SP.s3 + 17 + SP.s1_5, (btnH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return h;
}

let LAST_SHELL = null;
function buildShell(name, x, y, pageTitle, activeNav) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  buildSidebar(f, activeNav);
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  buildTopbar(right);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y, CONTENT_W, 1500);
  const header = buildPageHeader(content, pageTitle);
  return { frame: f, content: content, bodyY: header.height + SP.s6 };
}


/* ── 8. Table primitives ───────────────────────────────────────────────── */

const CELL_PAD_X = SP.s6;                                   // px-6
const CELL_PAD_Y = SP.s4;                                   // py-4
const TWO_LINE_H = lh(FS.t13) + SP.s05 + lh(FS.t11);        // code + mt-0.5 + city
const ROW_H = CELL_PAD_Y * 2 + TWO_LINE_H;
const THEAD_H = SP.s3 * 2 + lh(FS.t11);
const TOOLBAR_H = SP.s4 * 2 + lh(FS.base) + SP.s05 + lh(FS.xs);
const PAGER_H = SP.s3 * 2 + 29.75;
const COPY_BTN = SP.s5;
const ACTIONS_W = CELL_PAD_X * 2 + 29.75;

function pillWidth(tone) {
  return measure(tone.label.toUpperCase(), FS.t10, FONT.semibold, 0.96) + SP.s2 * 2;
}
function statusPill(parent, name, x, y, tone) {
  const label = tone.label.toUpperCase();
  const w = pillWidth(tone);
  const h = lh(FS.t10) + SP.s05 * 2;
  const pill = frame(parent, name, x, y, w, h, { bg: tone.bg, radius: RAD.md });
  text(pill, 'Label', label, SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: tone.fg, tracking: 0.96 });
  return pill;
}

function copyIdWidth(value) {
  return measure(value, FS.t12_5, FONT.semibold, 0.54) + SP.s1_5 + COPY_BTN;
}
function copyableId(parent, value, x, y, copied) {
  const t = text(parent, 'Value', value, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  const b = frame(parent, copied ? 'Copied indicator' : 'Button - Copy',
    x + t.width + SP.s1_5, y + (t.height - COPY_BTN) / 2, COPY_BTN, COPY_BTN, { radius: RAD.md });
  icon(b, 'Icon', copied ? I.check : I.copy, (COPY_BTN - 14.875) / 2, (COPY_BTN - 14.875) / 2,
    14.875, copied ? C.emerald600 : C.slate400);
  return t;
}

/* Route cell: flex items-center gap-2.5 — [code/city] → [code/city]. */
function routeBlockW(code, city) {
  return Math.max(
    measure(code, FS.t13, FONT.bold, -0.3),
    measure('(' + city + ')', FS.t11, FONT.regular)
  );
}
function routeCellW(r) {
  return routeBlockW(r.oc, r.ocity) + SP.s2_5 + 14.875 + SP.s2_5 + routeBlockW(r.dc, r.dcity);
}
function routeCell(parent, r, x, y) {
  const ow = routeBlockW(r.oc, r.ocity);
  text(parent, 'Origin code', r.oc, x, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3 });
  text(parent, 'Origin city', '(' + r.ocity + ')', x, y + lh(FS.t13) + SP.s05,
    { size: FS.t11, color: C.slate400 });
  const ax = x + ow + SP.s2_5;
  icon(parent, 'Icon · arrow', I.arrowRight, ax, y + (TWO_LINE_H - 14.875) / 2, 14.875, C.slate300);
  const dx = ax + 14.875 + SP.s2_5;
  text(parent, 'Destination code', r.dc, dx, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3 });
  text(parent, 'Destination city', '(' + r.dcity + ')', dx, y + lh(FS.t13) + SP.s05,
    { size: FS.t11, color: C.slate400 });
}

function departureW(r) {
  return measure(r.dep, FS.t13, FONT.semibold, -0.3) + SP.s1_5 + measure(r.tm, FS.t13, FONT.medium);
}

/**
 * Lay columns out the way a browser sizes an auto table: each column is the
 * widest cell it holds plus px-6 either side; the table then stretches to its
 * min-width if the natural total falls short.
 */

function layoutColumns(defs, rows, minWidth) {
  let x = 0;
  const cols = defs.map((d) => {
    let contentW = measure(d.label.toUpperCase(), FS.t11, FONT.medium, 0.96);
    if (d.sortable) contentW += SP.s1_5 + 12.75;
    rows.forEach((r) => { contentW = Math.max(contentW, d.width(r)); });
    const w = contentW + CELL_PAD_X * 2;
    const col = { key: d.key, label: d.label, sortable: d.sortable, x: x, w: w };
    x += w;
    return col;
  });
  const natural = x + ACTIONS_W;
  if (natural < minWidth) {
    // Browsers distribute the slack proportionally across the columns.
    const slack = minWidth - natural;
    let acc = 0;
    cols.forEach((c, i) => {
      const share = slack * (c.w / x);
      c.x += acc;
      acc += share;
      c.w += share;
    });
    return { cols: cols, width: minWidth };
  }
  return { cols: cols, width: natural };
}

function buildToolbar(card, title, showing, placeholder, isQuery, withFilters, filterCount) {
  const tb = frame(card, 'Toolbar', 0, 0, card.width, TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', title, SP.s5, SP.s4,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const cap = text(tb, 'Toolbar caption', showing, SP.s5, SP.s4 + lh(FS.base) + SP.s05,
    { size: FS.xs, color: C.slate500 });
  const m = /^Showing (\S+)/.exec(showing);
  if (m) {
    cap.setRangeFills(8, 8 + m[1].length, fill(C.slate900));
    cap.setRangeFontName(8, 8 + m[1].length, { family: FONT.family, style: FONT.medium });
  }

  let right = card.width - SP.s5;
  const ctlH = SP.s9;
  const ctlY = (TOOLBAR_H - ctlH) / 2;

  if (withFilters) {
    const lw = measure('Filters', FS.t13, FONT.medium);
    let fw = SP.s3 * 2 + 14.875 + SP.s2 + lw;
    if (filterCount > 0) fw += SP.s2 + SP.s5;
    const fb = frame(tb, 'Button - Filters', right - fw, ctlY, fw, ctlH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    icon(fb, 'Icon', I.filters, SP.s3, (ctlH - 14.875) / 2, 14.875, C.slate500);
    text(fb, 'Label', 'Filters', SP.s3 + 14.875 + SP.s2, (ctlH - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.medium, color: C.slate700 });
    if (filterCount > 0) {
      const badge = frame(fb, 'Active count', fw - SP.s3 - SP.s5, (ctlH - SP.s5) / 2, SP.s5, SP.s5,
        { bg: C.brand500, radius: RAD.full });
      const bt = text(badge, 'Count', String(filterCount), 0, 0,
        { size: FS.t9_5, weight: FONT.semibold, color: C.white });
      centerIn(bt, { x: 0, y: 0, w: SP.s5, h: SP.s5 });
    }
    right -= fw + SP.s2;
  }

  const searchW = 306;                       // w-72
  const searchH = SP.s1_5 * 2 + lh(FS.sm);
  const sb = frame(tb, 'Search field', right - searchW, (TOOLBAR_H - searchH) / 2, searchW, searchH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(sb, 'Icon · search', I.search, SP.s3, (searchH - 17) / 2, 17, C.slate400);
  text(sb, isQuery ? 'Query' : 'Placeholder', placeholder, SP.s3 + 17 + SP.s2,
    (searchH - lh(FS.sm)) / 2, { size: FS.sm, color: isQuery ? C.slate900 : C.slate400 });
  return tb;
}

function buildPager(card, y, summary, page, totalPages) {
  const p = frame(card, 'Pagination', 0, y, card.width, PAGER_H);
  hairline(p, 'Border top', 0, 0, card.width, C.slate100);
  text(p, 'Summary', summary, SP.s5, (PAGER_H - lh(FS.t12)) / 2, { size: FS.t12, color: C.slate500 });

  const chipH = 29.75;
  const cy = (PAGER_H - chipH) / 2;
  let x = card.width - SP.s5;

  const nextW = SP.s2_5 * 2 + measure('Next', FS.t12, FONT.medium) + SP.s1 + 12.75;
  const next = frame(p, 'Button - Next', x - nextW, cy, nextW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(next, 'Label', 'Next', SP.s2_5, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  icon(next, 'Icon', I.chevronRight, nextW - SP.s2_5 - 12.75, (chipH - 12.75) / 2, 12.75, C.slate700);
  x -= nextW + SP.s1;

  for (let n = totalPages; n >= 1; n--) {
    const isActive = n === page;
    const cw = Math.max(29.75, measure(String(n), FS.t12) + SP.s2 * 2);
    const chip = frame(p, 'Page chip ' + n, x - cw, cy, cw, chipH, {
      bg: isActive ? C.brand500 : C.white, radius: RAD.lg, stroke: isActive ? undefined : C.slate200,
    });
    const ct = text(chip, 'Number', String(n), 0, 0,
      { size: FS.t12, color: isActive ? C.white : C.slate700 });
    centerIn(ct, { x: 0, y: 0, w: cw, h: chipH });
    x -= cw + SP.s1;
  }
  x -= SP.s1;

  const prevW = SP.s2_5 * 2 + 12.75 + SP.s1 + measure('Previous', FS.t12, FONT.medium);
  const prev = frame(p, 'Button - Previous', x - prevW, cy, prevW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  prev.opacity = page === 1 ? 0.4 : 1;
  icon(prev, 'Icon', I.chevronLeft, SP.s2_5, (chipH - 12.75) / 2, 12.75, C.slate700);
  text(prev, 'Label', 'Previous', SP.s2_5 + 12.75 + SP.s1, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  return p;
}

function kebab(parent, x, y, open) {
  const b = frame(parent, 'Button - Row actions', x, y, 29.75, 29.75,
    { bg: open ? C.slate100 : undefined, radius: RAD.lg });
  const col = open ? C.slate900 : C.slate500;
  for (let i = 0; i < 3; i++) {
    rect(b, 'Dot', 29.75 / 2 - 1.5, 8 + i * 5.5, 3, 3, { bg: col, radius: RAD.full });
  }
  return b;
}

function buildStickyActions(scroll, rows, bodyH, menuRowIndex) {
  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - ACTIONS_W, 0,
    ACTIONS_W, THEAD_H + bodyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, THEAD_H + bodyH, { bg: C.slate900, opacity: 0.04 });
  const sh = frame(sticky, 'Header cell', 0, 0, ACTIONS_W, THEAD_H, { bg: C.slate50, opacity: 0.7 });
  hairline(sh, 'Border bottom', 0, THEAD_H - 1, ACTIONS_W, C.slate100);
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, THEAD_H + i * ROW_H, ACTIONS_W, ROW_H,
      { bg: menuRowIndex === i ? C.slate50 : C.white, opacity: 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, ACTIONS_W, C.slate100);
    kebab(cell, CELL_PAD_X, (ROW_H - 29.75) / 2, menuRowIndex === i);
  });
  return sticky;
}

function buildThead(table, cols, width) {
  const thead = frame(table, 'Table header', 0, 0, width, THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, width, C.slate100);
  cols.forEach((c) => {
    const lt = text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + CELL_PAD_X, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    if (c.sortable) {
      icon(thead, 'Icon · sort', I.sort, c.x + CELL_PAD_X + lt.width + SP.s1_5,
        SP.s3 + (lh(FS.t11) - 12.75) / 2, 12.75, C.slate300);
    }
  });
  return thead;
}


function buildSkeleton(parent, y, rowCount) {
  const headerH = SP.s4 * 2 + 17 + SP.s2 + 12.75;
  const colsH = SP.s3 * 2 + 12.75;
  const rowH = SP.s4 * 2 + SP.s5;
  const h = headerH + colsH + rowCount * rowH;
  const card = frame(parent, 'Table skeleton', 0, y, CONTENT_W, h,
    { bg: C.white, radius: RAD.xl, stroke: C.gray200, clip: true });

  const head = frame(card, 'Skeleton header', 0, 0, CONTENT_W, headerH);
  hairline(head, 'Border bottom', 0, headerH - 1, CONTENT_W, C.gray100);
  rect(head, 'Bar', SP.s5, SP.s4, 170, 17, { bg: C.gray200, radius: RAD.md });
  rect(head, 'Bar', SP.s5, SP.s4 + 17 + SP.s2, 272, 12.75, { bg: C.gray200, radius: RAD.md });

  const cols = frame(card, 'Skeleton column labels', 0, headerH, CONTENT_W, colsH, { bg: C.gray50 });
  for (let i = 0; i < 6; i++) {
    rect(cols, 'Bar', SP.s5 + i * (85 + SP.s6), SP.s3, 85, 12.75, { bg: C.gray200, radius: RAD.md });
  }

  const widths = [85, 136, 170, 102, 68, 85];
  for (let r = 0; r < rowCount; r++) {
    const row = frame(card, 'Skeleton row', 0, headerH + colsH + r * rowH, CONTENT_W, rowH);
    if (r > 0) hairline(row, 'Divider', 0, 0, CONTENT_W, C.gray100);
    let x = SP.s5;
    widths.forEach((w, i) => {
      const isPill = i === widths.length - 1;
      rect(row, 'Bar', x, (rowH - (isPill ? SP.s5 : 17)) / 2, w, isPill ? SP.s5 : 17,
        { bg: C.gray200, radius: isPill ? RAD.full : RAD.md });
      x += w + SP.s6;
    });
  }
  return card;
}

function buildEmptyState(parent, y, title, body) {
  const h = 400;
  const panel = frame(parent, 'Empty state', 0, y, CONTENT_W, h,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, dash: [6, 4], clip: true });

  const badgeS = 51;
  const badge = frame(panel, 'Icon badge', (CONTENT_W - badgeS) / 2, 0, badgeS, badgeS,
    { bg: C.slate100, radius: RAD.full, stroke: C.slate200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', I.inbox, (badgeS - 25.5) / 2, (badgeS - 25.5) / 2, 25.5, C.slate400);

  const t = text(panel, 'Title', title, 0, 0,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3, width: CONTENT_W, align: 'CENTER' });
  const b = text(panel, 'Body', body, (CONTENT_W - 448) / 2, 0,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * 1.6, width: 448, align: 'CENTER' });

  const block = badgeS + SP.s4 + t.height + SP.s1_5 + b.height;
  const top = (h - block) / 2;
  badge.y = top;
  t.y = top + badgeS + SP.s4;
  b.y = t.y + t.height + SP.s1_5;
  return panel;
}

function buildRowMenu(parent, triggerX, triggerY, items) {
  const W = 221;         // w-52
  const ITEM_H = 32;
  const h = items.length * ITEM_H + 8;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, triggerY + 29.75 + 6, W, h, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: MENU_SHADOW,
  });
  items.forEach((it, i) => {
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H - 2,
      { radius: RAD.md });
    const col = it.disabled ? C.slate300 : it.danger ? C.rose600 : C.slate700;
    icon(tile, 'Icon', it.ic, SP.s2, (ITEM_H - 2 - 17) / 2, 17, col);
    text(tile, 'Label', it.label, SP.s2 + 17 + SP.s2, (ITEM_H - 2 - lh(FS.t12_5)) / 2,
      { size: FS.t12_5, weight: FONT.medium, color: col });
  });
  return menu;
}

function buildScrim(parent, opacity) {
  return rect(parent, 'Scrim', 0, 0, FRAME_W, FRAME_H,
    { bg: C.black, opacity: opacity === undefined ? 0.55 : opacity });
}

/**
 * Modal shell (components/Modal.tsx) — non-dismissing backdrop at black/30
 * (black/40 for layer="top"), rounded-2xl, border-gray-200, and its own
 * heavier shadow. Distinct from TicketDetailDialog, which rolls its own
 * black/55 scrim and a slate ring.
 */
const MODAL_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 },
  offset: { x: 0, y: 24 }, radius: 60, spread: 0, visible: true, blendMode: 'NORMAL',
}];

function buildModal(parent, name, W, H, top) {
  buildScrim(parent, top ? 0.4 : 0.3);
  return frame(parent, name, (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW,
  });
}

/* Toast (components/ToastContext.tsx) — pill pinned bottom-6, centred. */
function buildToast(parent, message, variant) {
  const bg = variant === 'error' ? C.red600 : variant === 'info' ? C.gray900 : C.brand600;
  const h = SP.s2_5 * 2 + lh(FS.sm);
  const w = SP.s4 * 2 + SP.s5 + SP.s2_5 + measure(message, FS.sm, FONT.medium);
  const pill = frame(parent, 'Toast · ' + message, (FRAME_W - w) / 2, FRAME_H - SP.s6 - h, w, h, {
    bg: bg, radius: RAD.full,
    shadow: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 },
               offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }],
  });
  const badge = frame(pill, 'Icon badge', SP.s4, (h - SP.s5) / 2, SP.s5, SP.s5,
    { bg: C.white, opacity: 0.2, radius: RAD.full });
  icon(badge, 'Icon', variant === 'error' ? I.close : I.check,
    (SP.s5 - 12.75) / 2, (SP.s5 - 12.75) / 2, 12.75, C.white);
  text(pill, 'Message', message, SP.s4 + SP.s5 + SP.s2_5, (h - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.white });
  return pill;
}

/* Select trigger — components/Select.tsx, default px-3 py-2. */
function selectTrigger(parent, name, x, y, w, label, placeholder) {
  const h = SP.s2 * 2 + lh(FS.sm);
  const f = frame(parent, name, x, y, w, h, { bg: C.white, radius: RAD.lg, stroke: C.gray200 });
  const t = text(f, placeholder ? 'Placeholder' : 'Value', label, SP.s3, (h - lh(FS.sm)) / 2,
    { size: FS.sm, color: placeholder ? C.gray400 : C.gray900 });
  if (placeholder) t.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
  icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875, (h - 14.875) / 2, 14.875, C.gray400);
  return f;
}

/* DateRangePicker trigger — px-3 py-1.5, brand-500 calendar glyph. */
function dateRangeTrigger(parent, x, y, label) {
  const h = SP.s1_5 * 2 + lh(FS.sm);
  const w = SP.s3 * 2 + 17 + SP.s2 + measure(label, FS.sm, FONT.medium) + SP.s2 + 14.875;
  const f = frame(parent, 'DateRangePicker', x, y, w, h,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(f, 'Icon · calendar', I.calendar, SP.s3, (h - 17) / 2, 17, C.brand500);
  text(f, 'Range', label, SP.s3 + 17 + SP.s2, (h - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875, (h - 14.875) / 2, 14.875, C.slate400);
  return f;
}


function buildFiltersDialog(parent, fields, activeCount) {
  const W = 448;                                       // max-w-md
  const headH = SP.s4 * 2 + lh(FS.t15) + SP.s05 + lh(FS.t12);
  const fieldLabelH = SP.s1_5 + lh(FS.t11_5);
  const selH = SP.s2 * 2 + lh(FS.sm);
  const dateH = SP.s1_5 * 2 + lh(FS.sm);
  let bodyH = SP.s4 * 2;
  fields.forEach((f, i) => {
    bodyH += fieldLabelH + (f.kind === 'dateRange' ? dateH : selH) + (i < fields.length - 1 ? SP.s4 : 0);
  });
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.sm);
  const H = headH + bodyH + footH;

  const dlg = buildModal(parent, 'Dialog - Filters', W, H, false);

  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  text(head, 'Title', 'Filters', SP.s5, SP.s4,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(head, 'Subtitle',
    activeCount === 0 ? 'No filters applied yet.'
      : activeCount + ' filter' + (activeCount === 1 ? '' : 's') + ' active.',
    SP.s5, SP.s4 + lh(FS.t15) + SP.s05, { size: FS.t12, color: C.slate500 });
  const close = frame(head, 'Button - Close filters', W - SP.s5 - 29.75, SP.s4, 29.75, 29.75,
    { radius: RAD.md });
  icon(close, 'Icon', I.close, (29.75 - 14.875) / 2, (29.75 - 14.875) / 2, 14.875, C.slate400);

  const body = frame(dlg, 'Fields', 0, headH, W, bodyH);
  let fy = SP.s4;
  fields.forEach((f) => {
    text(body, 'Field label', f.label.toUpperCase(), SP.s5, fy,
      { size: FS.t11_5, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    const cy = fy + fieldLabelH;
    if (f.kind === 'dateRange') dateRangeTrigger(body, SP.s5, cy, f.value);
    else selectTrigger(body, 'Select - ' + f.label, SP.s5, cy, W - SP.s5 * 2, f.value, false);
    fy = cy + (f.kind === 'dateRange' ? dateH : selH) + SP.s4;
  });

  const foot = frame(dlg, 'Footer', 0, headH + bodyH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const by = (footH - btnH) / 2;
  text(foot, 'Reset all', 'Reset all', SP.s5, (footH - lh(FS.t12_5)) / 2,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate500 });
  const applyW = SP.s3 * 2 + measure('Apply filters', FS.sm, FONT.medium);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium);
  const cancel = frame(foot, 'Button - Cancel', W - SP.s5 - applyW - SP.s2 - cancelW, by, cancelW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(cancel, 'Label', 'Cancel', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const apply = frame(foot, 'Button - Apply filters', W - SP.s5 - applyW, by, applyW, btnH,
    { bg: C.brand600, radius: RAD.lg });
  text(apply, 'Label', 'Apply filters', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });
  return dlg;
}


const GRID_COLS = 4, GRID_GAP = 40, GRID_MARGIN_X = 64, GRID_MARGIN_Y = 96;

async function loadFonts() {
  const candidates = [
    { family: 'Inter',     regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' },
    { family: 'Roboto',    regular: 'Regular', medium: 'Medium', semibold: 'Medium',    bold: 'Bold' },
    { family: 'Helvetica', regular: 'Regular', medium: 'Bold',   semibold: 'Bold',      bold: 'Bold' },
  ];
  for (const c of candidates) {
    try {
      const styles = [c.regular, c.medium, c.semibold, c.bold].filter((s, i, a) => a.indexOf(s) === i);
      for (const s of styles) await figma.loadFontAsync({ family: c.family, style: s });
      // Optional — only the Select placeholder is italic; fall back silently.
      try { await figma.loadFontAsync({ family: c.family, style: 'Italic' }); c.italic = 'Italic'; }
      catch (e) { c.italic = c.regular; }
      return c;
    } catch (e) { /* next family */ }
  }
  throw new Error('Could not load Inter, Roboto or Helvetica.');
}

/* ── R1. Routes tokens, icons, seed data ───────────────────────────────── */

const C2 = {
  blue100: '#DBEAFE', blue800: '#1E40AF',
  rose100: '#FFE4E6', rose700: '#BE123C',
  amber600: '#D97706', amber300: '#FCD34D',
  emerald600b: '#059669',
  gray700: '#374151',
};

// Sizes the shared FS table doesn't carry — the routes dialogs introduced
// text-[14px] and text-[19px]. Same +1 post-lift rule as FS.
const FS_R = { t14: 15, t19: 20 };

// leading-relaxed (1.625) — the confirm-dialog body copy, vs the 1.5 default.
const RELAXED = 1.625;

// Lifecycle pill — app/routes/page.tsx statusTone
const ROUTE_TONE = {
  Scheduled: { bg: C2.blue100,  fg: C2.blue800,  label: 'Scheduled' },
  Departed:  { bg: C.amber100,  fg: C.amber800,  label: 'Departed'  },
  Cancelled: { bg: C2.rose100,  fg: C2.rose700,  label: 'Cancelled' },
};

const RI = {
  markScheduled: { sw: 1.75, d: '<path d="M19 12H6M11 6l-6 6 6 6"/>' },
  markDeparted:  { sw: 1.75, d: '<path d="M5 12h13M13 6l6 6-6 6"/>' },
  assignVessel:  { sw: 1.75, d: '<path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z"/><path d="M5 14V8a1 1 0 0 1 1-1h7l5 4"/><path d="M9 7V4h2"/>' },
  disableRoute:  { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>' },
  enableRoute:   { sw: 1.75, d: '<path d="M20 6 9 17l-5-5"/>' },
  cancelRoute:   { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>' },
  // "Refund bookings" — the card glyph the row item and the refund dialog share.
  refund:        { sw: 1.75, d: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/>' },
  sortDown:      { sw: 2,    d: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>' },
  rowArrow:      { sw: 1.75, d: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  activeCheck:   { sw: 3,    d: '<path d="M5 12l5 5L20 7"/>' },
  activeCross:   { sw: 3,    d: '<path d="M6 6l12 12M18 6L6 18"/>' },
  pickCheck:     { sw: 2.5,  d: '<path d="M5 12l5 5L20 7"/>' },
  selectCheck:   { sw: 2.5,  d: '<path d="M5 12l5 5 9-11"/>' },
  mapPin:        { sw: 1.75, d: '<path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>' },
  ferry:         { sw: 1.75, d: '<path d="M3 17h18l-2 3H5l-2-3Z"/><rect x="5" y="11" width="14" height="6" rx="1"/><path d="M8 11V7h8v4"/><path d="M12 7V4"/>' },
  // CancelConfirmDialog's badge is a plain diagonal slash, not the X the
  // refund/cancel-trip dialog uses.
  cancelSlash:   { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
  warnCircle:    { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>' },
  infoCircle:    { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>' },
};

/**
 * Vessel type shown under the vessel name in the Vessel column.
 *
 * Route.vessel is a free-text name — the type is not on the route, it lives on
 * FleetVessel.type in schedule-steps/VesselStep.tsx (MOCK_FLEET). Five of the
 * seven hulls in MOCK_ROUTES are absent from MOCK_FLEET, so a literal name
 * lookup would leave most rows blank; these are the types those hulls would
 * carry. See the README note on wiring this up for real.
 */
const VESSEL_TYPE = {
  'FC Sinulog':                  'Fast Craft',
  'MV Reina del Cielo':          'RoRo',
  '2GO Saint Pope John Paul II': 'Passenger Ship',
  '2GO Masinloc':                'RoRo',
  'MV Visayan Star':             'RoRo',
  'MV Filipinas Cebu':           'RoRo',
  'MV Maligaya':                 'Passenger Ship',
};
const vType = (name) => VESSEL_TYPE[name] || '—';

/**
 * Seed rows — derived from MOCK_ROUTES in app/routes/page.tsx with the page's
 * own defaults applied: the date filter starts on today, and the Schedule sort
 * starts descending. 26 of the 33 seeded legs fall on today, so the pager reads
 * "of 26 routes" across 3 pages.
 *
 * Fiction date: Thursday, Aug 13 2026 — the seed dates every leg relative to
 * "today", so re-run on another day and the dates below are what shift.
 */

// Page 1, sort descending (the default) — 10:00 PM back to 3:00 PM.
const ROUTE_ROWS = [
  { n: 1,  sched: 'Aug 13, 10:00 PM', wd: 'Thursday', o: 'Tagbilaran City',  d: 'Cebu City',       v: 'FC Sinulog',                  st: 'Scheduled', dep: null, on: true,  nm: 65,  hr: 2.25 },
  { n: 2,  sched: 'Aug 13, 9:00 PM',  wd: 'Thursday', o: 'Cebu City',        d: 'Bacolod City',    v: 'MV Reina del Cielo',          st: 'Scheduled', dep: null, on: true,  nm: 80,  hr: 4.5  },
  { n: 3,  sched: 'Aug 13, 8:00 PM',  wd: 'Thursday', o: 'Manila',           d: 'Iloilo City',     v: '2GO Saint Pope John Paul II', st: 'Scheduled', dep: null, on: true,  nm: 250, hr: 19   },
  { n: 4,  sched: 'Aug 13, 8:00 PM',  wd: 'Thursday', o: 'Iloilo City',      d: 'Manila',          v: '2GO Saint Pope John Paul II', st: 'Scheduled', dep: null, on: true,  nm: 250, hr: 19   },
  { n: 5,  sched: 'Aug 13, 6:00 PM',  wd: 'Thursday', o: 'Manila',           d: 'Puerto Princesa', v: '2GO Masinloc',                st: 'Scheduled', dep: null, on: true,  nm: 350, hr: 23   },
  { n: 6,  sched: 'Aug 13, 6:00 PM',  wd: 'Thursday', o: 'Puerto Princesa',  d: 'Manila',          v: '2GO Masinloc',                st: 'Scheduled', dep: null, on: true,  nm: 350, hr: 23   },
  { n: 7,  sched: 'Aug 13, 5:00 PM',  wd: 'Thursday', o: 'Iloilo City',      d: 'Bacolod City',    v: 'MV Visayan Star',             st: 'Cancelled', dep: null, on: true,  nm: 22,  hr: 1.25 },
  { n: 8,  sched: 'Aug 13, 4:00 PM',  wd: 'Thursday', o: 'Ormoc City',       d: 'Cebu City',       v: 'MV Reina del Cielo',          st: 'Scheduled', dep: null, on: true,  nm: 95,  hr: 3.75 },
  { n: 9,  sched: 'Aug 13, 4:00 PM',  wd: 'Thursday', o: 'Cebu City',        d: 'Dumaguete City',  v: 'MV Filipinas Cebu',           st: 'Scheduled', dep: null, on: true,  nm: 42,  hr: 3.75 },
  { n: 10, sched: 'Aug 13, 3:00 PM',  wd: 'Thursday', o: 'Dapitan City',     d: 'Dumaguete City',  v: 'MV Reina del Cielo',          st: 'Scheduled', dep: null, on: false, nm: 38,  hr: 2.75 },
];

// Page 2, same descending sort — 3:00 PM back to 8:00 AM. Carries the second
// Cancelled leg and the RT-0001 Departed leg.
const ROUTE_ROWS_P2 = [
  { n: 11, sched: 'Aug 13, 3:00 PM',  wd: 'Thursday', o: 'Cebu City',       d: 'Ormoc City',      v: 'MV Visayan Star',    st: 'Scheduled', dep: null,              on: true,  nm: 95, hr: 3.75 },
  { n: 12, sched: 'Aug 13, 2:00 PM',  wd: 'Thursday', o: 'Dumaguete City',  d: 'Cebu City',       v: 'MV Filipinas Cebu',  st: 'Scheduled', dep: null,              on: true,  nm: 42, hr: 3.75 },
  { n: 13, sched: 'Aug 13, 1:00 PM',  wd: 'Thursday', o: 'Bacolod City',    d: 'Cebu City',       v: 'MV Visayan Star',    st: 'Scheduled', dep: null,              on: true,  nm: 80, hr: 4.5  },
  { n: 14, sched: 'Aug 13, 1:00 PM',  wd: 'Thursday', o: 'Cebu City',       d: 'Dumaguete City',  v: 'FC Sinulog',         st: 'Scheduled', dep: null,              on: true,  nm: 42, hr: 3.75 },
  { n: 15, sched: 'Aug 13, 12:00 PM', wd: 'Thursday', o: 'Dumaguete City',  d: 'Dapitan City',    v: 'MV Reina del Cielo', st: 'Cancelled', dep: null,              on: true,  nm: 38, hr: 2.75 },
  { n: 16, sched: 'Aug 13, 11:00 AM', wd: 'Thursday', o: 'Tagbilaran City', d: 'Cebu City',       v: 'FC Sinulog',         st: 'Scheduled', dep: null,              on: true,  nm: 65, hr: 2.25 },
  { n: 17, sched: 'Aug 13, 10:00 AM', wd: 'Thursday', o: 'Dumaguete City',  d: 'Dapitan City',    v: 'MV Reina del Cielo', st: 'Scheduled', dep: null,              on: false, nm: 38, hr: 2.75 },
  { n: 18, sched: 'Aug 13, 10:00 AM', wd: 'Thursday', o: 'Calapan City',    d: 'Batangas City',   v: 'MV Maligaya',        st: 'Scheduled', dep: null,              on: true,  nm: 26, hr: 2.75 },
  { n: 19, sched: 'Aug 13, 9:00 AM',  wd: 'Thursday', o: 'Cebu City',       d: 'Ormoc City',      v: 'MV Reina del Cielo', st: 'Scheduled', dep: null,              on: true,  nm: 95, hr: 3.75 },
  { n: 20, sched: 'Aug 13, 8:00 AM',  wd: 'Thursday', o: 'Cebu City',       d: 'Dumaguete City',  v: 'MV Filipinas Cebu',  st: 'Departed',  dep: 'Aug 13, 8:00 AM', on: true,  nm: 42, hr: 3.75 },
];

// Ascending sort — surfaces the three early Departed legs and their populated
// "Departed at" cells, which the descending default pushes off page 1.
const ROUTE_ROWS_ASC = [
  { n: 1,  sched: 'Aug 13, 5:00 AM',  wd: 'Thursday', o: 'Batangas City',  d: 'Calapan City',    v: 'MV Maligaya',        st: 'Scheduled', dep: null,              on: true,  nm: 26, hr: 2.75 },
  { n: 2,  sched: 'Aug 13, 5:00 AM',  wd: 'Thursday', o: 'Cebu City',      d: 'Tagbilaran City', v: 'FC Sinulog',         st: 'Departed',  dep: 'Aug 13, 5:00 AM', on: true,  nm: 65, hr: 2.25 },
  { n: 3,  sched: 'Aug 13, 6:00 AM',  wd: 'Thursday', o: 'Cebu City',      d: 'Tagbilaran City', v: 'FC Sinulog',         st: 'Scheduled', dep: null,              on: true,  nm: 65, hr: 2.25 },
  { n: 4,  sched: 'Aug 13, 6:00 AM',  wd: 'Thursday', o: 'Batangas City',  d: 'Calapan City',    v: 'MV Maligaya',        st: 'Departed',  dep: 'Aug 13, 6:00 AM', on: true,  nm: 26, hr: 2.75 },
  { n: 5,  sched: 'Aug 13, 7:00 AM',  wd: 'Thursday', o: 'Cebu City',      d: 'Bacolod City',    v: 'MV Visayan Star',    st: 'Scheduled', dep: null,              on: true,  nm: 80, hr: 4.5  },
  { n: 6,  sched: 'Aug 13, 7:00 AM',  wd: 'Thursday', o: 'Bacolod City',   d: 'Iloilo City',     v: 'MV Visayan Star',    st: 'Departed',  dep: 'Aug 13, 7:00 AM', on: true,  nm: 22, hr: 1.25 },
  { n: 7,  sched: 'Aug 13, 8:00 AM',  wd: 'Thursday', o: 'Cebu City',      d: 'Dumaguete City',  v: 'MV Filipinas Cebu',  st: 'Departed',  dep: 'Aug 13, 8:00 AM', on: true,  nm: 42, hr: 3.75 },
  { n: 8,  sched: 'Aug 13, 9:00 AM',  wd: 'Thursday', o: 'Cebu City',      d: 'Ormoc City',      v: 'MV Reina del Cielo', st: 'Scheduled', dep: null,              on: true,  nm: 95, hr: 3.75 },
  { n: 9,  sched: 'Aug 13, 10:00 AM', wd: 'Thursday', o: 'Dumaguete City', d: 'Dapitan City',    v: 'MV Reina del Cielo', st: 'Scheduled', dep: null,              on: false, nm: 38, hr: 2.75 },
  { n: 10, sched: 'Aug 13, 10:00 AM', wd: 'Thursday', o: 'Calapan City',   d: 'Batangas City',   v: 'MV Maligaya',        st: 'Scheduled', dep: null,              on: true,  nm: 26, hr: 2.75 },
];

// Six fields now — "Date & time" was renamed "Schedule" and an optional
// "Departed" window was added above the selects.
const ROUTE_FILTER_FIELDS = [
  { label: 'Schedule',          kind: 'dateRange',                          value: 'Aug 13, 2026' },
  { label: 'Departed',          kind: 'dateRange', optional: true,          value: 'Select date range' },
  { label: 'Origin',            value: 'All origins' },
  { label: 'Destination',       value: 'All destinations' },
  { label: 'Status',            value: 'All statuses' },
  { label: 'Active / Inactive', value: 'All' },
];

// MOCK_FLEET, verbatim from components/schedule-steps/VesselStep.tsx (15 hulls).
// `label` is vesselTypeLabel(type) — the long form AssignVesselDialog renders.
const FLEET = [
  { name: 'MV Maayo 18',         type: 'RoRo',           pax: 420, slots: 80  },
  { name: 'MV Visayan Star',     type: 'RoRo',           pax: 280, slots: 24  },
  { name: 'FC Sinulog',          type: 'Fast Craft',     pax: 180, slots: 0   },
  { name: 'MV Liberty',          type: 'Passenger Ship', pax: 320, slots: 0   },
  { name: 'MV Cebu Pacific',     type: 'RoRo',           pax: 500, slots: 95  },
  { name: 'FC Sugbu Express',    type: 'Fast Craft',     pax: 220, slots: 0   },
  { name: 'MV Tagbilaran Pearl', type: 'RoRo',           pax: 310, slots: 28  },
  { name: 'MV Negros Star',      type: 'RoRo',           pax: 460, slots: 88  },
  { name: 'MV Bohol Trader',     type: 'RoRo',           pax: 380, slots: 72  },
  { name: 'FC Visayan Jet',      type: 'Fast Craft',     pax: 200, slots: 0   },
  { name: 'MV Iloilo Queen',     type: 'Passenger Ship', pax: 280, slots: 0   },
  { name: 'MV Mindanao Sun',     type: 'RoRo',           pax: 540, slots: 110 },
  { name: 'MV Palawan Breeze',   type: 'RoRo',           pax: 260, slots: 22  },
  { name: 'MV Siquijor Mystic',  type: 'RoRo',           pax: 340, slots: 60  },
  { name: 'FC Camotes Flyer',    type: 'Fast Craft',     pax: 160, slots: 0   },
];

/** vesselTypeLabel() from VesselStep.tsx — the long parenthesised form. */
function typeLabel(t) {
  if (t === 'RoRo') return 'RoRo (Roll-on / Roll-off)';
  if (t === 'Fast Craft') return 'Fast Craft (Passenger only)';
  if (t === 'Passenger Ship') return 'Passenger Ship (Passenger only)';
  return t;
}

// ROUTE_CANCEL_REASONS from components/CancelConfirmDialog.tsx — the narrowed
// set. "Duplicate booking" is deliberately absent: a whole leg can't be
// cancelled for a duplicate record.
const ROUTE_CANCEL_REASONS = [
  'Bad weather / port closure',
  'No available vessel',
  'Others',
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* ── R2. Table metrics (px-5 py-3.5; thead py-2.5) ─────────────────────── */

const R_PAD_X = SP.s5;                                        // px-5
const R_PAD_Y = SP.s3_5;                                      // py-3.5
const R_SCHED_H = lh(FS.t12_5) + SP.s05 + lh(FS.t11);         // date + (weekday)
const R_VESSEL_H = lh(FS.t13) + SP.s05 + lh(FS.t11);          // name + type
const R_ROW_H = R_PAD_Y * 2 + Math.max(R_SCHED_H, R_VESSEL_H);
const R_THEAD_H = SP.s2_5 * 2 + lh(FS.t11);                   // py-2.5
const R_TOOLBAR_H = SP.s4 * 2 + SP.s9;                        // py-4 around the h-9 Filters button
const R_ACTIONS_W = R_PAD_X * 2 + 29.75;

/* ── R3. Routes toolbar ────────────────────────────────────────────────── */

/**
 * Card header — the "Showing N of M routes" sub-line that used to sit under the
 * h2 is gone; that count now lives only in the pager footer, which is why the
 * footer renders even on a single page. No search field exists on this page.
 */
function buildRoutesToolbar(card, filterCount) {
  const tb = frame(card, 'Toolbar', 0, 0, card.width, R_TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, R_TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', 'Configured routes', R_PAD_X, (R_TOOLBAR_H - lh(FS.base)) / 2,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  const lw = measure('Filters', FS.t13, FONT.medium);
  let fw = SP.s3 * 2 + 14.875 + SP.s2 + lw;
  if (filterCount > 0) fw += SP.s2 + SP.s5;
  const fb = frame(tb, 'Button - Filters', card.width - R_PAD_X - fw, (R_TOOLBAR_H - SP.s9) / 2,
    fw, SP.s9, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(fb, 'Icon', I.filters, SP.s3, (SP.s9 - 14.875) / 2, 14.875, C.slate500);
  text(fb, 'Label', 'Filters', SP.s3 + 14.875 + SP.s2, (SP.s9 - lh(FS.t13)) / 2,
    { size: FS.t13, weight: FONT.medium, color: C.slate700 });
  if (filterCount > 0) {
    const badge = frame(fb, 'Active count', fw - SP.s3 - SP.s5, (SP.s9 - SP.s5) / 2, SP.s5, SP.s5,
      { bg: C.brand500, radius: RAD.full });
    const bt = text(badge, 'Count', String(filterCount), 0, 0,
      { size: FS.t9_5, weight: FONT.semibold, color: C.white });
    centerIn(bt, { x: 0, y: 0, w: SP.s5, h: SP.s5 });
  }
  return tb;
}

/* ── R3b. Pager with the rows-per-page control ─────────────────────────── */

/**
 * Pagination now carries a "Per page" selector and always renders — the count
 * on the left is the page's only running total since the toolbar sub-line was
 * removed. Only the Previous/chips/Next nav collapses when everything fits on
 * one page.
 */
function buildRoutesPager(card, y, opts) {
  const o = opts || {};
  const page = o.page || 1, totalPages = o.totalPages || 1;
  const p = frame(card, 'Pagination', 0, y, card.width, PAGER_H);
  hairline(p, 'Border top', 0, 0, card.width, C.slate100);
  text(p, 'Summary', o.summary, SP.s5, (PAGER_H - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate500 });

  // Centre — "Per page  [ 10 ▾ ]". h-7 select, font-mono tabular-nums.
  const selH = 29.75;                                        // h-7
  const lbl = 'Per page';
  const lblW = measure(lbl, FS.t12);
  const valW = measure(String(o.pageSize || 10), FS.t12);
  const selW = SP.s2 * 2 + valW + SP.s2 + 12.75;
  const groupW = lblW + SP.s2 + selW;
  const gx = (card.width - groupW) / 2;
  text(p, 'Per page label', lbl, gx, (PAGER_H - lh(FS.t12)) / 2, { size: FS.t12, color: C.slate500 });
  const sel = frame(p, 'Select - Per page', gx + lblW + SP.s2, (PAGER_H - selH) / 2, selW, selH, {
    bg: C.white, radius: RAD.lg, stroke: o.sizeOpen ? C.slate300 : C.slate200,
  });
  if (o.sizeOpen) rect(sel, 'Focus ring', -2, -2, selW + 4, selH + 4,
    { bg: C.brand100, radius: RAD.lg, opacity: 0.7 });
  text(sel, 'Value', String(o.pageSize || 10), SP.s2, (selH - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate700 });
  icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s2 - 12.75, (selH - 12.75) / 2, 12.75, C.slate400);

  // Native <select> popup. The OS draws it above every layer, so it goes on the
  // frame rather than inside the card — the card clips its content. Opens
  // upward, which is where the browser puts it this close to the page bottom.
  if (o.sizeOpen && o.overlay) {
    const optH = SP.s1_5 * 2 + lh(FS.t12);
    const menuW = Math.max(selW, 68);
    const menuH = SP.s1 * 2 + PAGE_SIZE_OPTIONS.length * optH;
    const menu = frame(o.overlay.parent, 'Per page options',
      o.overlay.ox + sel.x, o.overlay.oy + y - menuH - 4, menuW, menuH, {
      bg: C.white, radius: RAD.lg, stroke: C.slate200, clip: true, shadow: MENU_SHADOW,
    });
    PAGE_SIZE_OPTIONS.forEach((n, i) => {
      const on = n === (o.pageSize || 10);
      const row = frame(menu, 'Option ' + n, SP.s1, SP.s1 + i * optH, menuW - SP.s2, optH,
        { bg: on ? C.brand50 : undefined, radius: RAD.md });
      text(row, 'Label', String(n), SP.s2, SP.s1_5,
        { size: FS.t12, color: on ? C.brand700 : C.slate700 });
    });
  }

  if (totalPages <= 1) return p;

  const chipH = 29.75;
  const cy = (PAGER_H - chipH) / 2;
  let x = card.width - SP.s5;

  const nextW = SP.s2_5 * 2 + measure('Next', FS.t12, FONT.medium) + SP.s1 + 12.75;
  const next = frame(p, 'Button - Next', x - nextW, cy, nextW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  next.opacity = page === totalPages ? 0.4 : 1;
  text(next, 'Label', 'Next', SP.s2_5, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  icon(next, 'Icon', I.chevronRight, nextW - SP.s2_5 - 12.75, (chipH - 12.75) / 2, 12.75, C.slate700);
  x -= nextW + SP.s1;

  for (let n = totalPages; n >= 1; n--) {
    const isActive = n === page;
    const cw = Math.max(29.75, measure(String(n), FS.t12) + SP.s2 * 2);
    const chip = frame(p, 'Page chip ' + n, x - cw, cy, cw, chipH, {
      bg: isActive ? C.brand500 : C.white, radius: RAD.lg, stroke: isActive ? undefined : C.slate200,
    });
    const ct = text(chip, 'Number', String(n), 0, 0,
      { size: FS.t12, color: isActive ? C.white : C.slate700 });
    centerIn(ct, { x: 0, y: 0, w: cw, h: chipH });
    x -= cw + SP.s1;
  }
  x -= SP.s1;

  const prevW = SP.s2_5 * 2 + 12.75 + SP.s1 + measure('Previous', FS.t12, FONT.medium);
  const prev = frame(p, 'Button - Previous', x - prevW, cy, prevW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  prev.opacity = page === 1 ? 0.4 : 1;
  icon(prev, 'Icon', I.chevronLeft, SP.s2_5, (chipH - 12.75) / 2, 12.75, C.slate700);
  text(prev, 'Label', 'Previous', SP.s2_5 + 12.75 + SP.s1, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  return p;
}

/* ── R4. Routes table ──────────────────────────────────────────────────── */

const ROUTE_COL_DEFS = [
  { key: 'n',     label: 'Id',          width: (r) => measure(String(r.n), FS.t12_5) },
  { key: 'sched', label: 'Schedule', sortable: true,
    width: (r) => Math.max(measure(r.sched, FS.t12_5), measure('(' + r.wd + ')', FS.t11)) },
  { key: 'o',     label: 'Origin',      width: (r) => measure(r.o, FS.t13_5, FONT.medium, -0.3) },
  { key: 'd',     label: 'Destination',
    width: (r) => 12.75 + SP.s2 + measure(r.d, FS.t13_5, FONT.medium, -0.3) },
  { key: 'v',     label: 'Vessel',
    width: (r) => r.v ? Math.max(measure(r.v, FS.t13, FONT.medium, -0.3), measure(vType(r.v), FS.t11))
                      : measure('Unassigned', FS.t12) },
  { key: 'st',    label: 'Status',      width: (r) => pillWidth(ROUTE_TONE[r.st]) },
  { key: 'dep',   label: 'Departed at', width: (r) => r.dep ? measure(r.dep, FS.t12_5) : measure('—', FS.t12) },
  { key: 'on',    label: 'Active', center: true,
    width: (r) => SP.s2_5 * 2 + 14.875 + SP.s1_5 + measure(r.on ? 'Active' : 'Inactive', FS.t10, FONT.semibold) },
  { key: 'nm',    label: 'Distance',
    width: (r) => measure(String(r.nm), FS.sm, FONT.semibold) + SP.s1 + measure('nm', FS.t10) },
  { key: 'hr',    label: 'Duration',
    width: (r) => measure(String(r.hr), FS.sm, FONT.semibold) + SP.s1 + measure('hrs avg', FS.t10) },
];

/** Lifecycle pill — rounded-md px-2 py-0.5, uppercase 10px→11. */
function routePill(parent, x, y, tone) {
  const label = tone.label.toUpperCase();
  const w = measure(label, FS.t10, FONT.semibold, 0.96) + SP.s2 * 2;
  const h = lh(FS.t10) + SP.s05 * 2;
  const pill = frame(parent, 'Status pill', x, y, w, h, { bg: tone.bg, radius: RAD.md });
  text(pill, 'Label', label, SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: tone.fg, tracking: 0.96 });
  return pill;
}

/** Active / Inactive chip — rounded-full, emerald or rose, ring-1, 3px glyph. */
function activeChip(parent, x, y, on) {
  const label = on ? 'Active' : 'Inactive';
  const w = SP.s2_5 * 2 + 14.875 + SP.s1_5 + measure(label, FS.t10, FONT.semibold);
  const h = SP.s1 * 2 + lh(FS.t10);
  const chip = frame(parent, on ? 'Active chip' : 'Inactive chip', x, y, w, h, {
    bg: on ? C.emerald50 : C.rose50, radius: RAD.full,
    stroke: on ? C.emerald200 : C.rose200,
  });
  icon(chip, 'Icon', on ? RI.activeCheck : RI.activeCross, SP.s2_5, (h - 14.875) / 2, 14.875,
    on ? C.emerald700 : C.rose600);
  text(chip, 'Label', label, SP.s2_5 + 14.875 + SP.s1_5, SP.s1,
    { size: FS.t10, weight: FONT.semibold, color: on ? C.emerald700 : C.rose600 });
  return chip;
}

function buildRoutesTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * R_ROW_H : 96.5;
  const cardH = R_TOOLBAR_H + R_THEAD_H + bodyH + PAGER_H;
  const L = layoutColumns(ROUTE_COL_DEFS, rows.length ? rows : ROUTE_ROWS, 0);
  const cols = L.cols;

  const card = frame(parent, 'Card - Configured routes', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  buildRoutesToolbar(card, o.filterCount || 0);

  // The page has no overflow container and the table has no min-w, so at 1440
  // the 11 nowrap columns run past the card. Clipped here, sticky column pinned.
  const scroll = frame(card, 'Table scroll', 0, R_TOOLBAR_H, CONTENT_W, R_THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, L.width, R_THEAD_H + bodyH);

  const thead = frame(table, 'Table header', 0, 0, L.width, R_THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, R_THEAD_H - 1, L.width, C.slate100);
  cols.forEach((c) => {
    const label = c.label.toUpperCase();
    const tw = measure(label, FS.t11, FONT.medium, 0.96);
    const cx = c.center ? c.x + (c.w - tw) / 2 : c.x + R_PAD_X;
    const lt = text(thead, 'Header ' + c.label, label, cx, SP.s2_5,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    if (c.sortable) {
      // SortArrow — down for desc, rotated 180 for asc. Only the sorted column
      // renders one, so the arrow doubles as the sort indicator.
      const ic = icon(thead, 'Icon · sort', RI.sortDown, cx + lt.width + SP.s1_5,
        SP.s2_5 + (lh(FS.t11) - 14.875) / 2, 14.875, C.slate400);
      if (o.sortAsc) ic.rotation = 180;
    }
  });

  const tbody = frame(table, 'Table body', 0, R_THEAD_H, L.width, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'No results', 'No routes match your filters.', 0, 0,
      { size: FS.sm, color: C.slate400, width: L.width, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }
  rows.forEach((r, i) => {
    const row = frame(tbody, 'Row · ' + r.o + ' → ' + r.d, 0, i * R_ROW_H, L.width, R_ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    if (o.menuRowIndex === i) {
      row.fills = fill(C.slate50, 0.6);
      rect(row, 'Hover accent', 0, 0, 3, R_ROW_H, { bg: C.brand500 });
    }
    const mid1 = (R_ROW_H - lh(FS.t12_5)) / 2;

    text(row, 'Id', String(r.n), cols[0].x + R_PAD_X, mid1,
      { size: FS.t12_5, color: C.slate500 });

    text(row, 'Schedule', r.sched, cols[1].x + R_PAD_X, R_PAD_Y,
      { size: FS.t12_5, color: C.slate900 });
    text(row, 'Weekday', '(' + r.wd + ')', cols[1].x + R_PAD_X, R_PAD_Y + lh(FS.t12_5) + SP.s05,
      { size: FS.t11, color: C.slate400 });

    text(row, 'Origin', r.o, cols[2].x + R_PAD_X, (R_ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.medium, color: C.slate900, tracking: -0.3 });

    icon(row, 'Icon · arrow', RI.rowArrow, cols[3].x + R_PAD_X, (R_ROW_H - 12.75) / 2, 12.75, C.slate300);
    text(row, 'Destination', r.d, cols[3].x + R_PAD_X + 12.75 + SP.s2, (R_ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.medium, color: C.slate900, tracking: -0.3 });

    // Vessel — name over its fleet type, matching the two-line cells used
    // elsewhere (Schedule here, "Vehicle & class" on the vehicle-ticket table).
    if (r.v) {
      const vy = (R_ROW_H - R_VESSEL_H) / 2;
      text(row, 'Vessel', r.v, cols[4].x + R_PAD_X, vy,
        { size: FS.t13, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
      text(row, 'Vessel type', vType(r.v), cols[4].x + R_PAD_X, vy + lh(FS.t13) + SP.s05,
        { size: FS.t11, color: C.slate400 });
    } else {
      text(row, 'Vessel', 'Unassigned', cols[4].x + R_PAD_X, (R_ROW_H - lh(FS.t12)) / 2,
        { size: FS.t12, color: C.slate400 });
    }

    const ph = lh(FS.t10) + SP.s05 * 2;
    routePill(row, cols[5].x + R_PAD_X, (R_ROW_H - ph) / 2, ROUTE_TONE[r.st]);

    if (r.dep) text(row, 'Departed at', r.dep, cols[6].x + R_PAD_X, mid1,
      { size: FS.t12_5, color: C.slate900 });
    else text(row, 'Departed at', '—', cols[6].x + R_PAD_X, (R_ROW_H - lh(FS.t12)) / 2,
      { size: FS.t12, color: C.slate400 });

    const chipW = SP.s2_5 * 2 + 14.875 + SP.s1_5 + measure(r.on ? 'Active' : 'Inactive', FS.t10, FONT.semibold);
    const chipH = SP.s1 * 2 + lh(FS.t10);
    activeChip(row, cols[7].x + (cols[7].w - chipW) / 2, (R_ROW_H - chipH) / 2, r.on);

    const dv = text(row, 'Distance', String(r.nm), cols[8].x + R_PAD_X, (R_ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, weight: FONT.semibold, color: C.slate900 });
    text(row, 'Distance unit', 'nm', cols[8].x + R_PAD_X + dv.width + SP.s1,
      (R_ROW_H - lh(FS.sm)) / 2 + (lh(FS.sm) - lh(FS.t10)) / 2, { size: FS.t10, color: C.slate400 });

    const hv = text(row, 'Duration', String(r.hr), cols[9].x + R_PAD_X, (R_ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, weight: FONT.semibold, color: C.slate900 });
    text(row, 'Duration unit', 'hrs avg', cols[9].x + R_PAD_X + hv.width + SP.s1,
      (R_ROW_H - lh(FS.sm)) / 2 + (lh(FS.sm) - lh(FS.t10)) / 2, { size: FS.t10, color: C.slate400 });
  });

  // Sticky actions column
  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - R_ACTIONS_W, 0,
    R_ACTIONS_W, R_THEAD_H + bodyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, R_THEAD_H + bodyH, { bg: C.slate900, opacity: 0.04 });
  const sh = frame(sticky, 'Header cell', 0, 0, R_ACTIONS_W, R_THEAD_H, { bg: C.slate50, opacity: 0.7 });
  hairline(sh, 'Border bottom', 0, R_THEAD_H - 1, R_ACTIONS_W, C.slate100);
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, R_THEAD_H + i * R_ROW_H, R_ACTIONS_W, R_ROW_H,
      { bg: o.menuRowIndex === i ? C.slate50 : C.white, opacity: 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, R_ACTIONS_W, C.slate100);
    kebab(cell, R_PAD_X, (R_ROW_H - 29.75) / 2, o.menuRowIndex === i);
  });

  const pagerY = R_TOOLBAR_H + R_THEAD_H + bodyH;
  buildRoutesPager(card, pagerY, {
    summary: o.pagerSummary, page: o.page || 1, totalPages: o.totalPages || 1,
    pageSize: o.pageSize || 10, sizeOpen: o.sizeOpen,
    // Lets the pager escape the card's clip for the native select popup.
    overlay: o.shell ? {
      parent: o.shell.frame,
      ox: MAIN_X + CONTENT_X,
      oy: TOPBAR_H + CONTENT_Y + o.shell.bodyY,
    } : null,
  });
  return card;
}

/* ── R5. Route row menu (px-2.5 py-1.5, text-[13px], w-52) ─────────────── */

// RowMenu.tsx now resolves a `tone` per item instead of a bare danger flag.
const R_TONE = {
  default: { label: C.slate700,   icon: C.slate400   },
  success: { label: C.emerald600, icon: C.emerald500 },
  warning: { label: C2.amber600,  icon: C.amber500   },
  danger:  { label: C.rose600,    icon: C.rose500    },
};

/**
 * Guards straight from app/routes/page.tsx:
 *   Mark Departed  → success tone, Scheduled only
 *   Mark Scheduled → warning tone; replaces item 1 on BOTH Departed and
 *                    Cancelled rows (a cancelled leg is reinstated the same way
 *                    a mis-logged departure is walked back)
 *   Assign vessel  → Scheduled only, and locked once the leg has confirmed bookings
 *   Disable route  → danger, locked while the leg has confirmed bookings
 *   Enable route   → success tone
 *   Cancel route   → danger; label becomes "Cancelled" and locks once Cancelled
 *                    or Departed
 *   Refund bookings→ warning tone, appended only on Cancelled rows
 */
function routeMenuItems(st, on, hasConfirmed) {
  const items = [];
  if (st === 'Departed' || st === 'Cancelled') {
    items.push({ label: 'Mark Scheduled', ic: RI.markScheduled, tone: 'warning' });
  } else {
    items.push({ label: 'Mark Departed', ic: RI.markDeparted, tone: 'success', disabled: st !== 'Scheduled' });
  }
  items.push({ label: 'Assign vessel', ic: RI.assignVessel, disabled: st !== 'Scheduled' || !!hasConfirmed });
  if (on) items.push({ label: 'Disable route', ic: RI.disableRoute, tone: 'danger', disabled: !!hasConfirmed });
  else items.push({ label: 'Enable route', ic: RI.enableRoute, tone: 'success' });
  items.push({
    label: st === 'Cancelled' ? 'Cancelled' : 'Cancel route', ic: RI.cancelRoute, tone: 'danger',
    disabled: st === 'Cancelled' || st === 'Departed',
  });
  if (st === 'Cancelled') items.push({ label: 'Refund bookings', ic: RI.refund, tone: 'warning' });
  return items;
}

function buildRouteMenu(parent, triggerX, triggerY, items) {
  const W = 221;                                    // w-52 at the 17px root
  const ITEM_H = SP.s1_5 * 2 + lh(FS.t13);          // py-1.5 + text-[13px]
  const H = SP.s1 * 2 + items.length * ITEM_H;
  // RowMenu portals to <body> and picks its side from the room below the
  // trigger — a six-item menu on a low row opens upward. Mirrored here so the
  // menu never runs off the frame.
  const below = triggerY + 29.75 + 6;
  const my = (below + H > FRAME_H - 8) ? triggerY - 6 - H : below;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, my, W, H, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.8, clip: true, shadow: MENU_SHADOW,
  });
  items.forEach((it, i) => {
    const tone = R_TONE[it.tone || 'default'];
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H,
      { radius: RAD.md });
    const txt = it.disabled ? C.slate400 : tone.label;
    const ico = it.disabled ? C.slate300 : tone.icon;
    icon(tile, 'Icon', it.ic, SP.s2_5, (ITEM_H - 17) / 2, 17, ico);
    text(tile, 'Label', it.label, SP.s2_5 + 17 + SP.s2_5, SP.s1_5,
      { size: FS.t13, weight: FONT.medium, color: txt });
  });
  return menu;
}

function routeMenuAnchor(shell, rowIndex) {
  return {
    x: MAIN_X + CONTENT_X + CONTENT_W - R_ACTIONS_W + R_PAD_X,
    y: TOPBAR_H + CONTENT_Y + shell.bodyY + R_TOOLBAR_H + R_THEAD_H
       + rowIndex * R_ROW_H + (R_ROW_H - 29.75) / 2,
  };
}

/* ── R6. Wizard chrome (WizardHeader / Stepper / WizardFooter) ─────────── */

function wizardHeader(parent, W, iconDef, title, caption) {
  const h = SP.s3_5 * 2 + Math.max(29.75, lh(FS.t15) + lh(FS.t11_5));
  const head = frame(parent, 'WizardHeader', 0, 0, W, h);
  hairline(head, 'Border bottom', 0, h - 1, W, C.slate100);
  const badge = frame(head, 'Icon badge', SP.s5, (h - 29.75) / 2, 29.75, 29.75,
    { bg: C.brand50, radius: RAD.lg });
  icon(badge, 'Icon', iconDef, (29.75 - 17) / 2, (29.75 - 17) / 2, 17, C.brand600);
  const tx = SP.s5 + 29.75 + SP.s2_5;
  const blockH = lh(FS.t15) + lh(FS.t11_5);
  text(head, 'Title', title, tx, (h - blockH) / 2,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(head, 'Caption', caption, tx, (h - blockH) / 2 + lh(FS.t15),
    { size: FS.t11_5, color: C.slate500, width: W - tx - SP.s5 - 29.75 - SP.s2 });
  const close = frame(head, 'Button - Close', W - SP.s5 - 29.75, (h - 29.75) / 2, 29.75, 29.75,
    { radius: RAD.md });
  icon(close, 'Icon', I.close, (29.75 - 17) / 2, (29.75 - 17) / 2, 17, C.slate400);
  return h;
}

/** Two-step rail: circle + "STEP n" eyebrow + name, hairline connector. */
function stepperBand(parent, W, y, currentIdx) {
  const steps = ['Details', 'Review'];
  const h = SP.s4 * 2 + Math.max(25.5, lh(FS.t9_5) + lh(FS.t11_5));
  const band = frame(parent, 'Stepper band', 0, y, W, h);
  hairline(band, 'Border bottom', 0, h - 1, W, C.slate100);

  const inner = frame(band, 'Stepper', SP.s6, SP.s4, W - SP.s6 * 2, h - SP.s4 * 2);
  const CIRCLE = 25.5;
  let x = 0;
  steps.forEach((label, i) => {
    const done = i < currentIdx, active = i === currentIdx;
    const circle = frame(inner, 'Step circle ' + (i + 1), x, 0, CIRCLE, CIRCLE, {
      bg: done ? C.brand500 : C.white, radius: RAD.full,
      stroke: done ? undefined : (active ? C.brand500 : C.slate200),
    });
    if (done) icon(circle, 'Icon · check', I.check, (CIRCLE - 12.75) / 2, (CIRCLE - 12.75) / 2, 12.75, C.white);
    else {
      const nt = text(circle, 'Number', String(i + 1), 0, 0, {
        size: FS.t10, weight: FONT.semibold, color: active ? C.brand700 : C.slate400,
      });
      centerIn(nt, { x: 0, y: 0, w: CIRCLE, h: CIRCLE });
    }
    const lx = x + CIRCLE + SP.s2_5;
    text(inner, 'Eyebrow', 'STEP ' + (i + 1), lx, 0,
      { size: FS.t9_5, weight: FONT.semibold, tracking: 1.05,
        color: (!done && !active) ? C.slate400 : C.slate500 });
    text(inner, 'Step name', label, lx, lh(FS.t9_5), {
      size: FS.t11_5, tracking: -0.2,
      weight: active ? FONT.semibold : FONT.medium,
      color: active ? C.slate900 : (done ? C.slate700 : C.slate400),
    });
    const labelW = Math.max(measure('STEP ' + (i + 1), FS.t9_5, FONT.semibold, 1.05),
                            measure(label, FS.t11_5, FONT.medium));
    x = lx + labelW + SP.s3;
    if (i < steps.length - 1) {
      const connW = inner.width - x - (CIRCLE + SP.s2_5 + 90) - SP.s3;
      rect(inner, 'Connector', x, 11, Math.max(connW, 20), 1,
        { bg: i < currentIdx ? C.brand500 : C.slate200, radius: RAD.full });
      x += Math.max(connW, 20) + SP.s3;
    }
  });
  return h;
}

function wizardFooter(parent, W, H, stepIdx, stepCount, continueLabel, continueDisabled) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const h = SP.s4 * 2 + btnH;
  const foot = frame(parent, 'WizardFooter', 0, H - h, W, h);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (h - btnH) / 2;

  const st = text(foot, 'Step counter', 'Step ' + (stepIdx + 1) + ' of ' + stepCount,
    SP.s6, (h - lh(FS.t10)) / 2, { size: FS.t10, color: C.slate500 });
  st.setRangeFills(5, 6, fill(C.slate700));
  st.setRangeFontName(5, 6, { family: FONT.family, style: FONT.medium });

  const isLast = stepIdx === stepCount - 1;
  const contW = SP.s3 * 2 + measure(continueLabel, FS.sm, FONT.medium) + (isLast ? 0 : SP.s1_5 + 14.875);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium);
  const backW = SP.s3 * 2 + 14.875 + SP.s1_5 + measure('Back', FS.sm, FONT.medium);
  let x = W - SP.s6 - contW;

  const cont = frame(foot, 'Button - ' + continueLabel, x, by, contW, btnH,
    { bg: C.brand600, radius: RAD.lg });
  if (continueDisabled) cont.opacity = 0.6;
  text(cont, 'Label', continueLabel, SP.s3, SP.s1_5,
    { size: FS.sm, weight: FONT.medium, color: C.white });
  if (!isLast) icon(cont, 'Icon', I.chevronRight, contW - SP.s3 - 14.875, (btnH - 14.875) / 2, 14.875, C.white);

  if (stepIdx > 0) {
    x -= SP.s2 + backW;
    const back = frame(foot, 'Button - Back', x, by, backW, btnH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    icon(back, 'Icon', I.chevronLeft, SP.s3, (btnH - 14.875) / 2, 14.875, C.slate700);
    text(back, 'Label', 'Back', SP.s3 + 14.875 + SP.s1_5, SP.s1_5,
      { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  }
  x -= SP.s2 + cancelW;
  const ca = frame(foot, 'Button - Cancel', x, by, cancelW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return h;
}

/* ── R7. AssignVesselDialog (components/AssignVesselDialog.tsx) ─────────── */

/**
 * Standalone single-select vessel picker — this replaced CreateRouteModal's
 * assign mode (RouteContextCard + AssignVesselsEditor), which the routes page
 * no longer reaches.
 *
 * A leg carries exactly one vessel, so picking replaces rather than adds. The
 * header names both the current and the newly picked hull, and "Assign Vessel"
 * stays disabled until the pick actually differs from what the leg already has
 * — opening the dialog on an assigned leg therefore starts disabled, with that
 * vessel's row already selected.
 *
 * opts: { current, picked, query, noMatches, visible }
 */
const ASSIGN_W = 714;                              // max-w-2xl → 42rem × 17px

function buildAssignVesselDialog(parent, opts) {
  const o = opts || {};
  const current = o.current === undefined ? 'MV Filipinas Cebu' : o.current;
  const picked = o.picked === undefined ? current : o.picked;
  const changed = picked !== '' && picked !== current;
  const W = ASSIGN_W;

  const headH = SP.s5 * 2 + lh(FS_R.t19) + SP.s1_5 + lh(FS.t13) * 2;
  const searchH = SP.s2_5 * 2 + lh(FS_R.t14);
  const ROW_H2 = SP.s3 * 2 + lh(FS.t15) + SP.s05 + lh(FS.t13);
  const visible = o.visible || 6;
  const listH = o.noMatches ? 51 * 2 + lh(FS.t12) : visible * ROW_H2;
  const bodyH = SP.s4 * 2 + searchH + SP.s3 + listH;
  const footH = SP.s4 * 2 + (SP.s2_5 * 2 + lh(FS_R.t14));
  const H = headH + bodyH + footH;

  const dlg = buildModal(parent, 'Dialog - Assign vessel', W, H, false);

  /* Header — px-6 py-5, border-b */
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  text(head, 'Title', 'Assign Vessel', SP.s6, SP.s5,
    { size: FS_R.t19, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });

  const l1y = SP.s5 + lh(FS_R.t19) + SP.s1_5;
  const curVal = current || 'Unassigned';
  const cur = text(head, 'Current vessel', 'Current vessel: ' + curVal, SP.s6, l1y,
    { size: FS.t13, color: C.slate500 });
  cur.setRangeFills(16, 16 + curVal.length, fill(C.slate700));
  cur.setRangeFontName(16, 16 + curVal.length, { family: FONT.family, style: FONT.semibold });

  const newVal = picked || '—';
  const nw = text(head, 'New vessel', 'New vessel: ' + newVal, SP.s6, l1y + lh(FS.t13),
    { size: FS.t13, color: C.slate500 });
  nw.setRangeFills(12, 12 + newVal.length, fill(C.slate700));
  nw.setRangeFontName(12, 12 + newVal.length, { family: FONT.family, style: FONT.semibold });

  /* Body — px-6 py-4, gap-3 */
  const body = frame(dlg, 'Body', 0, headH, W, bodyH, { clip: true });
  const iw = W - SP.s6 * 2;

  const search = frame(body, 'Search field', SP.s6, SP.s4, iw, searchH,
    { bg: C.white, radius: RAD.xl, stroke: o.query ? C.slate300 : C.slate200 });
  icon(search, 'Icon · search', I.search, SP.s4, (searchH - 17) / 2, 17, C.slate400);
  text(search, o.query ? 'Query' : 'Placeholder', o.query || 'Search vessel...',
    SP.s4 + 17 + SP.s2_5, (searchH - lh(FS_R.t14)) / 2,
    { size: FS_R.t14, color: o.query ? C.slate900 : C.slate400 });

  const listY = SP.s4 + searchH + SP.s3;
  const list = frame(body, 'Vessel list', SP.s6, listY, iw, listH,
    { radius: RAD.xl, stroke: C.slate200, clip: true });

  if (o.noMatches) {
    const t = text(list, 'No matches', 'No vessels match your search.', 0, 0,
      { size: FS.t12, color: C.slate400, width: iw, align: 'CENTER' });
    t.y = (listH - t.height) / 2;
  } else {
    FLEET.slice(0, visible).forEach((v, i) => {
      const on = picked === v.name;
      const row = frame(list, 'Vessel · ' + v.name, 0, i * ROW_H2, iw, ROW_H2,
        { bg: on ? C.brand50 : undefined });
      if (on) row.fills = fill(C.brand50, 0.6);
      const blockH = lh(FS.t15) + SP.s05 + lh(FS.t13);
      const ty = (ROW_H2 - blockH) / 2;
      text(row, 'Name', v.name, SP.s5, ty, {
        size: FS.t15, weight: on ? FONT.semibold : FONT.regular,
        color: on ? C.brand700 : C.slate900,
      });
      text(row, 'Type', typeLabel(v.type), SP.s5, ty + lh(FS.t15) + SP.s05,
        { size: FS.t13, color: on ? C.brand600 : C.slate500 });
      if (on) icon(row, 'Icon · selected', RI.pickCheck, iw - SP.s5 - 21.25,
        (ROW_H2 - 21.25) / 2, 21.25, C.brand600);
    });
  }

  /* Footer — px-6 py-4, justify-end gap-3 */
  const btnH = SP.s2_5 * 2 + lh(FS_R.t14);
  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const assignW = SP.s5 * 2 + measure('Assign Vessel', FS_R.t14, FONT.semibold);
  const caW = SP.s5 * 2 + measure('Cancel', FS_R.t14, FONT.semibold);
  const ca = frame(foot, 'Button - Cancel', W - SP.s6 - assignW - SP.s3 - caW, by, caW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s5, SP.s2_5,
    { size: FS_R.t14, weight: FONT.semibold, color: C.slate700 });
  const btn = frame(foot, 'Button - Assign Vessel', W - SP.s6 - assignW, by, assignW, btnH,
    { bg: changed ? C.brand600 : C.brand300, radius: RAD.lg });
  text(btn, 'Label', 'Assign Vessel', SP.s5, SP.s2_5,
    { size: FS_R.t14, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── R8. Confirm dialogs ───────────────────────────────────────────────── */

// max-w-md — 28rem at the 17px root. (buildFiltersDialog in the shared chassis
// still uses 448, the 16px figure; see the README note.)
const MD_W = 476;

function confirmShell(parent, name, W, badgeBg, badgeRing, badgeFg, badgeIcon, title, bodyRuns, extraH) {
  const PAD = SP.s6, badgeS = SP.s9;
  const textW = W - PAD * 2 - badgeS - SP.s4;
  let bodyChars = 0;
  bodyRuns.forEach((r) => { bodyChars += r.t.length; });
  const lines = Math.max(1, Math.ceil((bodyChars * FS.t13 * 0.5) / textW));
  const block = lh(FS.t15_5) + SP.s1_5 + lines * (FS.t13 * 1.6) + (extraH || 0);
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.sm);
  const H = PAD + Math.max(badgeS, block) + SP.s5 + footH;

  const dlg = buildModal(parent, name, W, H, false);
  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS,
    { bg: badgeBg, radius: RAD.full, stroke: badgeRing, strokeOpacity: 0.7 });
  icon(badge, 'Icon', badgeIcon, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, badgeFg);

  const tx = PAD + badgeS + SP.s4;
  text(dlg, 'Title', title, tx, PAD,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  let full = '';
  bodyRuns.forEach((r) => { full += r.t; });
  const body = text(dlg, 'Body', full, tx, PAD + lh(FS.t15_5) + SP.s1_5,
    { size: FS.t13, color: C.slate600, lh: FS.t13 * 1.6, width: textW });
  let at = 0;
  bodyRuns.forEach((r) => {
    if (r.strong && r.t.length) {
      body.setRangeFills(at, at + r.t.length, fill(C.slate900));
      body.setRangeFontName(at, at + r.t.length, { family: FONT.family, style: FONT.medium });
    }
    at += r.t.length;
  });
  return { dlg: dlg, W: W, H: H, tx: tx, bodyBottom: body.y + body.height, footH: footH };
}

function confirmFooter(parent, W, H, footH, cancelLabel, primaryLabel, primaryBg) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const foot = frame(parent, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const pw = SP.s3 * 2 + measure(primaryLabel, FS.sm, FONT.medium);
  const cw = SP.s3 * 2 + measure(cancelLabel, FS.sm, FONT.medium);
  const ca = frame(foot, 'Button - ' + cancelLabel, W - SP.s6 - pw - SP.s2 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', cancelLabel, SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const pr = frame(foot, 'Button - ' + primaryLabel, W - SP.s6 - pw, by, pw, btnH,
    { bg: primaryBg, radius: RAD.lg });
  text(pr, 'Label', primaryLabel, SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });
}

function buildRouteStatusDialog(parent, disable) {
  const leg = 'Cebu City → Dumaguete City';
  const runs = disable
    ? [{ t: leg, strong: true },
       { t: ' will be set to Inactive — it stops being available for new schedules. Nothing is deleted; you can enable it again at any time.' }]
    : [{ t: leg, strong: true }, { t: ' will be set to Active and available again for scheduling.' }];
  const s = confirmShell(parent, 'Dialog - ' + (disable ? 'Disable' : 'Enable') + ' route', MD_W,
    disable ? C.rose50 : C.emerald50, disable ? C.rose200 : C.emerald200,
    disable ? C.rose600 : C.emerald600, disable ? RI.disableRoute : RI.enableRoute,
    disable ? 'Disable this route?' : 'Enable this route?', runs, 0);
  confirmFooter(s.dlg, s.W, s.H, s.footH, 'Cancel',
    disable ? 'Disable route' : 'Enable route', disable ? C.rose600 : C.emerald600);
  return s.dlg;
}

function buildSetDepartureDialog(parent) {
  const W = MD_W;
  const leg = 'Cebu City → Dumaguete City';
  const fieldH = SP.s5 + lh(FS.t11) + SP.s1_5 + (SP.s2 * 2 + lh(FS.t13));
  const s = confirmShell(parent, 'Dialog - Set actual departure', W,
    C.amber50, C.amber200, C.amber700, RI.markDeparted, 'Set actual departure',
    [{ t: leg, strong: true }, { t: ' will be marked' }, { t: ' Departed', strong: true },
     { t: ' at the time below.' }], fieldH);

  const fy = s.bodyBottom + SP.s5;
  text(s.dlg, 'Field label', 'ACTUAL DEPARTURE', s.tx, fy,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const inH = SP.s2 * 2 + lh(FS.t13);
  const inp = frame(s.dlg, 'Input - datetime-local', s.tx, fy + lh(FS.t11) + SP.s1_5,
    W - s.tx - SP.s6, inH, { bg: C.white, radius: RAD.md, stroke: C.slate200 });
  text(inp, 'Value', '08/13/2026, 04:00 PM', SP.s2_5, SP.s2, { size: FS.t13, color: C.slate900 });
  confirmFooter(s.dlg, W, s.H, s.footH, 'Cancel', 'Mark departed', C2.amber600);
  return s.dlg;
}

/* ── R8b. CancelConfirmDialog — reason capture ─────────────────────────── */

/**
 * The first half of the new cancel flow. Cancelling a leg no longer goes
 * straight to the refund list: the admin must pick a reason first, and that
 * reason is written onto the route (Route.cancelReason) and shown to the
 * passenger in their booking app.
 *
 * "Mark Cancelled" stays disabled until a reason is valid — chosen, and with
 * free text supplied when the choice is "Others".
 *
 * opts: { reason, other, menuOpen, touched }
 */
function buildCancelConfirmDialog(parent, opts) {
  const o = opts || {};
  const W = MD_W;
  const PAD = SP.s6, badgeS = SP.s9;
  const leg = 'Cebu City → Dumaguete City';
  const isOthers = o.reason === 'Others';
  const valid = !!o.reason && (!isOthers || (o.other || '').length > 0);
  const showError = !!o.touched && !valid;

  const tx = PAD + badgeS + SP.s3;
  const textW = W - PAD * 2 - badgeS - SP.s3;
  const bodyStr = 'Route ‘' + leg + '’ will be marked Cancelled. You’ll refund its bookings next.';
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS.t12_5) / textW));
  const bodyH0 = lh(FS.t15) + SP.s1 + bodyLines * (FS.t12_5 * RELAXED);

  const selH = SP.s2 * 2 + lh(FS.sm);
  const areaH = SP.s2 * 2 + lh(FS.t13) * 3;
  const errH = showError ? SP.s1 + lh(FS.t11_5) : 0;
  const noteLines = 2;
  const noteH = SP.s2 + noteLines * (FS.t11_5 * RELAXED);
  const fieldsH = SP.s4 + lh(FS.t11_5) + SP.s1_5 + selH
    + (isOthers ? SP.s2 + areaH : 0) + errH + noteH;
  const btnH = SP.s2 * 2 + lh(FS.t12_5);
  const H = PAD * 2 + Math.max(badgeS, bodyH0) + fieldsH + SP.s5 + btnH;

  const dlg = buildModal(parent, 'Dialog - Cancel route (reason)', W, H, false);

  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS,
    { bg: C.rose50, radius: RAD.full, stroke: C.rose200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', RI.cancelSlash, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C.rose600);

  text(dlg, 'Title', 'Mark this route as ‘Cancelled’?', tx, PAD,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const bd = text(dlg, 'Body', bodyStr, tx, PAD + lh(FS.t15) + SP.s1,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * RELAXED, width: textW });
  // ‘leg’ renders slate-700 semibold; "Cancelled" rose-600 semibold.
  const legAt = bodyStr.indexOf('‘');
  bd.setRangeFills(legAt, legAt + leg.length + 2, fill(C.slate700));
  bd.setRangeFontName(legAt, legAt + leg.length + 2, { family: FONT.family, style: FONT.semibold });
  const cAt = bodyStr.indexOf('Cancelled');
  bd.setRangeFills(cAt, cAt + 9, fill(C.rose600));
  bd.setRangeFontName(cAt, cAt + 9, { family: FONT.family, style: FONT.semibold });

  /* Reason field — mt-4 */
  let fy = PAD + Math.max(badgeS, bodyH0) + SP.s4;
  const lab = text(dlg, 'Field label', 'Cancellation reason *', PAD, fy,
    { size: FS.t11_5, weight: FONT.semibold, color: C.slate700 });
  lab.setRangeFills(20, 21, fill(C.rose500));

  const selY = fy + lh(FS.t11_5) + SP.s1_5;
  const selW = W - PAD * 2;
  const sel = frame(dlg, 'Select - Cancellation reason', PAD, selY, selW, selH, {
    bg: C.white, radius: RAD.lg, stroke: o.menuOpen ? C.gray300 : C.gray200,
  });
  const selLabel = o.reason || 'Select a reason…';
  const st = text(sel, o.reason ? 'Value' : 'Placeholder', selLabel, SP.s3, (selH - lh(FS.sm)) / 2,
    { size: FS.sm, color: o.reason ? C.gray900 : C.gray400 });
  if (!o.reason) st.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
  const chev = icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s3 - 14.875,
    (selH - 14.875) / 2, 14.875, C.gray400);
  if (o.menuOpen) chev.rotation = 180;

  let cy2 = selY + selH;

  if (isOthers) {
    const area = frame(dlg, 'Textarea - Other reason', PAD, cy2 + SP.s2, selW, areaH, {
      bg: C.white, radius: RAD.lg,
      stroke: showError ? C.rose300 : C.slate200,
    });
    text(area, o.other ? 'Value' : 'Placeholder', o.other || 'Describe the reason…',
      SP.s3, SP.s2, { size: FS.t13, color: o.other ? C.slate900 : C.slate400, width: selW - SP.s3 * 2 });
    cy2 += SP.s2 + areaH;
  }

  if (showError) {
    text(dlg, 'Validation error',
      isOthers ? 'Enter the reason before confirming.' : 'Select a cancellation reason before confirming.',
      PAD, cy2 + SP.s1, { size: FS.t11_5, weight: FONT.medium, color: C.rose500 });
    cy2 += SP.s1 + lh(FS.t11_5);
  }

  /* Passenger-visible note — mt-2, icon + two lines */
  const ny = cy2 + SP.s2;
  icon(dlg, 'Icon · info', RI.infoCircle, PAD, ny + 1, 14.875, C.slate400);
  const noteStr = 'The passenger sees this reason in their booking app. Keep it clear and factual.';
  const strong = 'The passenger sees this reason in their booking app.';
  const note = text(dlg, 'Passenger note', noteStr, PAD + 14.875 + SP.s1_5, ny,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * RELAXED,
      width: W - PAD * 2 - 14.875 - SP.s1_5 });
  note.setRangeFills(0, strong.length, fill(C.slate600));
  note.setRangeFontName(0, strong.length, { family: FONT.family, style: FONT.semibold });

  /* Footer — mt-5, justify-end gap-2.5, in-flow (no border-t) */
  const by = H - PAD - btnH;
  const pw = SP.s4 * 2 + measure('Mark Cancelled', FS.t12_5, FONT.semibold);
  const cw = SP.s3_5 * 2 + measure('Cancel', FS.t12_5, FONT.semibold);
  const ca = frame(dlg, 'Button - Cancel', W - PAD - pw - SP.s2_5 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3_5, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const pr = frame(dlg, 'Button - Mark Cancelled', W - PAD - pw, by, pw, btnH,
    { bg: valid ? C.rose600 : C.rose300, radius: RAD.lg });
  text(pr, 'Label', 'Mark Cancelled', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });

  /* Select menu. CancelConfirmDialog does not pass `inline`, so Select portals
     its menu to <body> — it floats over the dialog rather than being clipped by
     it. Drawn on the frame at the trigger's absolute position to match. */
  if (o.menuOpen) {
    const optH = SP.s2 * 2 + lh(FS.sm);
    const menuH = SP.s2 + ROUTE_CANCEL_REASONS.length * optH + SP.s2;
    const menu = frame(parent, 'Reason options',
      dlg.x + PAD, dlg.y + selY + selH + SP.s1, selW, menuH, {
      bg: C.white, radius: RAD.xl, stroke: C.gray200, clip: true, shadow: MENU_SHADOW,
    });
    ROUTE_CANCEL_REASONS.forEach((r, i) => {
      const on = r === o.reason;
      const row = frame(menu, 'Option · ' + r, 0, SP.s2 + i * optH, selW, optH,
        { bg: on ? C.brand50 : undefined });
      text(row, 'Label', r, SP.s3, SP.s2,
        { size: FS.sm, color: on ? C.brand700 : C2.gray700 });
      if (on) icon(row, 'Icon · check', RI.selectCheck, selW - SP.s3 - 17,
        (optH - 17) / 2, 17, C.brand600);
    });
  }
  return dlg;
}

/* ── R8c. CancelRouteDialog — refund mode ──────────────────────────────── */

const CANCEL_BOOKINGS = [
  { who: 'Maria Santos',    ref: 'BK-CEDG-001', pax: 2, amt: '₱1,700' },
  { who: 'Juan dela Cruz',  ref: 'BK-CEDG-002', pax: 3, amt: '₱2,550' },
  { who: 'Ana Reyes',       ref: 'BK-CEDG-003', pax: 4, amt: '₱3,400' },
  { who: 'Carlos Mendoza',  ref: 'BK-CEDG-004', pax: 1, amt: '₱850'   },
  { who: 'Lorna Garcia',    ref: 'BK-CEDG-005', pax: 2, amt: '₱1,700' },
  { who: 'Roberto Flores',  ref: 'BK-CEDG-006', pax: 3, amt: '₱2,550' },
  { who: 'Elena Cruz',      ref: 'BK-CEDG-007', pax: 4, amt: '₱3,400' },
  { who: 'Mark Villanueva', ref: 'BK-CEDG-008', pax: 1, amt: '₱850'   },
  { who: 'Gloria Tan',      ref: 'BK-CEDG-009', pax: 2, amt: '₱1,700' },
  { who: 'Dennis Aquino',   ref: 'BK-CEDG-010', pax: 3, amt: '₱2,550' },
  { who: 'Patricia Lim',    ref: 'BK-CEDG-011', pax: 4, amt: '₱3,400' },
  { who: 'Jose Bautista',   ref: 'BK-CEDG-012', pax: 1, amt: '₱850'   },
];

/**
 * The second half of the flow. Confirming the reason dialog cancels the leg and
 * hands straight off to this one; the "Refund bookings" row action reopens it
 * later for anything booked after the cancellation.
 *
 * mode="refund" is the only mode the routes page mounts today, so that's what
 * these frames draw: amber chrome, "To Refund" badges, and a list filtered to
 * the unrefunded bookings only. The rose "cancel" variant of this component is
 * unreachable from Routes now — see the README.
 */
function buildRefundDialog(parent, empty) {
  const W = 816;                                     // max-w-3xl
  const H = 720;                                     // h-[80vh]
  const leg = 'Cebu City → Dumaguete City';
  const dlg = buildModal(parent, 'Dialog - Refund bookings', W, H, false);

  // Header band
  const badgeS = SP.s9;
  const textW = W - SP.s6 * 2 - badgeS - SP.s4;
  const bodyStr = leg + ' is already cancelled. The bookings below haven’t been refunded yet. '
    + 'Refunds are processed manually — this records them as refunded in the system.';
  const lines = Math.max(1, Math.ceil(measure(bodyStr, FS.t13) / textW));
  const headH = SP.s6 + Math.max(badgeS, lh(FS.t15_5) + SP.s1_5 + lines * (FS.t13 * 1.6)) + SP.s4;
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  const badge = frame(head, 'Icon badge', SP.s6, SP.s6, badgeS, badgeS,
    { bg: C.amber50, radius: RAD.full, stroke: C.amber200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', RI.refund, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C2.amber600);
  const tx = SP.s6 + badgeS + SP.s4;
  text(head, 'Title', 'Refund bookings on this trip?', tx, SP.s6,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const bd = text(head, 'Body', bodyStr, tx, SP.s6 + lh(FS.t15_5) + SP.s1_5,
    { size: FS.t13, color: C.slate600, lh: FS.t13 * 1.6, width: textW });
  bd.setRangeFills(0, leg.length, fill(C.slate900));
  bd.setRangeFontName(0, leg.length, { family: FONT.family, style: FONT.medium });

  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.sm);
  const body = frame(dlg, 'Body', 0, headH, W, H - headH - footH, { clip: true });
  const iw = W - SP.s6 * 2;

  if (empty) {
    const box = frame(body, 'Nothing to refund', SP.s6, SP.s4, iw, 102,
      { bg: C.slate50, opacity: 0.4, radius: RAD.lg, stroke: C.slate200, dash: [5, 4] });
    const t = text(box, 'Copy', 'No bookings on this leg — nothing left to refund.', 0, 0,
      { size: FS.t12_5, color: C.slate400, width: iw, align: 'CENTER' });
    t.y = (102 - t.height) / 2;
  } else {
    // Summary tiles — refund mode counts only the unrefunded bookings.
    const tileH = SP.s2 * 2 + lh(FS.t10) + SP.s05 + lh(FS.t15);
    const tileW = (iw - SP.s2 * 2) / 3;
    [['Bookings', '28'], ['Passengers', '70'], ['To refund', '₱59,500']].forEach((s, i) => {
      const tile = frame(body, 'Stat · ' + s[0], SP.s6 + i * (tileW + SP.s2), SP.s4, tileW, tileH,
        { bg: C.slate50, opacity: 0.6, radius: RAD.lg, stroke: C.slate100 });
      text(tile, 'Label', s[0].toUpperCase(), SP.s3, SP.s2,
        { size: FS.t10, weight: FONT.semibold, color: C.slate400, tracking: 1.1 });
      text(tile, 'Value', s[1], SP.s3, SP.s2 + lh(FS.t10) + SP.s05,
        { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    });

    // Booking list
    const rowH = SP.s2 * 2 + lh(FS.t13) + lh(FS.t9_5);
    const listY = SP.s4 + tileH + SP.s3;
    const list = frame(body, 'Booking list', SP.s6, listY, iw, CANCEL_BOOKINGS.length * rowH,
      { radius: RAD.lg, stroke: C.slate100, clip: true });
    CANCEL_BOOKINGS.forEach((b, i) => {
      const row = frame(list, 'Booking · ' + b.ref, 0, i * rowH, iw, rowH);
      if (i > 0) hairline(row, 'Divider', 0, 0, iw, C.slate100);
      text(row, 'Ticketholder', b.who, SP.s3, SP.s2,
        { size: FS.t13, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
      text(row, 'Ref', b.ref + '  ·  ' + b.pax + ' pax', SP.s3, SP.s2 + lh(FS.t13),
        { size: FS.t9_5, color: C.slate400 });
      // "Pending refund" was relabelled "To Refund".
      const pillLabel = 'TO REFUND';
      const pw = measure(pillLabel, FS.t10, FONT.semibold, 0.6) + SP.s1_5 * 2;
      const ph = lh(FS.t10) + SP.s05 * 2;
      const pill = frame(row, 'Refund pill', iw - SP.s3 - pw, (rowH - ph) / 2, pw, ph,
        { bg: C.amber50, radius: 4 });
      text(pill, 'Label', pillLabel, SP.s1_5, SP.s05,
        { size: FS.t10, weight: FONT.semibold, color: C.amber700, tracking: 0.6 });
      const amt = text(row, 'Amount', b.amt, 0, (rowH - lh(FS.t12)) / 2,
        { size: FS.t12, color: C.slate600 });
      amt.x = iw - SP.s3 - pw - SP.s3 - amt.width;
    });

    // Inline pager
    const py = listY + CANCEL_BOOKINGS.length * rowH + SP.s3;
    text(body, 'Pager summary', 'Showing 1–12 of 28', SP.s6, py, { size: FS.t12, color: C.slate500 });
    const chipH = SP.s1 * 2 + lh(FS.t12);
    let px = W - SP.s6;
    const nextW = SP.s2 * 2 + measure('Next', FS.t12, FONT.medium);
    const next = frame(body, 'Button - Next', px - nextW, py - 2, nextW, chipH,
      { bg: C.white, radius: RAD.md, stroke: C.slate200 });
    text(next, 'Label', 'Next', SP.s2, SP.s1, { size: FS.t12, weight: FONT.medium, color: C.slate700 });
    px -= nextW + SP.s1_5;
    const cnt = text(body, 'Page count', '1 / 3', 0, py, { size: FS.t12, color: C.slate500 });
    cnt.x = px - cnt.width - SP.s1;
    px = cnt.x - SP.s1_5;
    const prevW = SP.s2 * 2 + measure('Prev', FS.t12, FONT.medium);
    const prev = frame(body, 'Button - Prev', px - prevW, py - 2, prevW, chipH,
      { bg: C.white, radius: RAD.md, stroke: C.slate200 });
    prev.opacity = 0.4;
    text(prev, 'Label', 'Prev', SP.s2, SP.s1, { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  }

  // Footer — justify-between. In refund mode the primary locks when there is
  // nothing left to settle.
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const closeW = SP.s3 * 2 + measure('Close', FS.sm, FONT.medium);
  const close = frame(foot, 'Button - Close', SP.s6, by, closeW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(close, 'Label', 'Close', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const pLabel = 'Mark all refunded';
  const pw2 = SP.s3 * 2 + measure(pLabel, FS.sm, FONT.medium);
  const pr = frame(foot, 'Button - ' + pLabel, W - SP.s6 - pw2, by, pw2, btnH,
    { bg: empty ? C2.amber300 : C2.amber600, radius: RAD.lg });
  text(pr, 'Label', pLabel, SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });
  return dlg;
}

/* ── R9. CreateRouteModal — details + review ───────────────────────────── */
function fieldGroupLabel(parent, x, y, w, label, suffix) {
  text(parent, 'Label', label, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate700, tracking: -0.3 });
  if (suffix) {
    const s = text(parent, 'Suffix', suffix, 0, y + lh(FS.t12_5) - lh(FS.t9_5),
      { size: FS.t9_5, weight: FONT.medium, color: C.slate400 });
    s.x = x + w - s.width;
  }
  return lh(FS.t12_5) + SP.s1_5;
}

/** PortSelect in its empty state: dashed border, slate tile, map-pin. */
function portSelect(parent, x, y, w, placeholder) {
  const h = SP.s2_5 * 2 + lh(FS.t13) + SP.s05 + lh(FS.t11_5);
  const f = frame(parent, 'PortSelect · ' + placeholder, x, y, w, h, {
    bg: C.slate50, opacity: 0.4, radius: RAD.xl, stroke: C.slate300, dash: [5, 4],
  });
  const tile = frame(f, 'Icon tile', SP.s3, (h - SP.s9) / 2, SP.s9, SP.s9,
    { bg: C.slate100, radius: RAD.lg, stroke: C.slate200, strokeOpacity: 0.7 });
  icon(tile, 'Icon · pin', RI.mapPin, (SP.s9 - 17) / 2, (SP.s9 - 17) / 2, 17, C.slate400);
  const tx = SP.s3 + SP.s9 + SP.s3;
  const blockH = lh(FS.t13) + SP.s05 + lh(FS.t11_5);
  text(f, 'Placeholder', placeholder, tx, (h - blockH) / 2,
    { size: FS.t13, weight: FONT.medium, color: C.slate400, tracking: -0.3 });
  text(f, 'Hint', 'Search by city', tx, (h - blockH) / 2 + lh(FS.t13) + SP.s05,
    { size: FS.t11_5, color: C.slate400 });
  icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875, (h - 14.875) / 2, 14.875, C.slate400);
  return h;
}

function buildCreateRouteDialog(parent, step) {
  const W = 672;                                    // max-w-2xl
  const headH = SP.s3_5 * 2 + Math.max(29.75, lh(FS.t15) + lh(FS.t11_5));
  const stepH = SP.s4 * 2 + Math.max(25.5, lh(FS.t9_5) + lh(FS.t11_5));
  const footH = SP.s4 * 2 + SP.s1_5 * 2 + lh(FS.sm);

  let bodyH;
  if (step === 0) {
    const portH = SP.s2_5 * 2 + lh(FS.t13) + SP.s05 + lh(FS.t11_5);
    const labelH = lh(FS.t12_5) + SP.s1_5;
    const inputH = SP.s2 * 2 + lh(FS.t13);
    bodyH = SP.s5 * 2 + (labelH + portH) + SP.s5 + (labelH + inputH);
    bodyH = Math.max(bodyH, 280);
  } else {
    bodyH = SP.s5 * 2 + 176 + SP.s4 + 190;
  }
  const H = headH + stepH + bodyH + footH;

  const dlg = buildModal(parent, 'Dialog - Create route · ' + (step === 0 ? 'Details' : 'Review'),
    W, H, false);
  wizardHeader(dlg, W, RI.mapPin, 'Create route',
    step === 0 ? 'Pick the origin and destination ports.' : 'Confirm and create.');
  stepperBand(dlg, W, headH, step);

  const body = frame(dlg, 'Body', 0, headH + stepH, W, bodyH, { clip: true });
  const iw = W - SP.s6 * 2;

  if (step === 0) {
    // Ports row — [1fr auto 1fr]
    const legW = 68;
    const colW = (iw - legW - SP.s3 * 2) / 2;
    const lh1 = fieldGroupLabel(body, SP.s6, SP.s5, colW, 'Origin port');
    portSelect(body, SP.s6, SP.s5 + lh1, colW, 'Select origin');
    const portH = SP.s2_5 * 2 + lh(FS.t13) + SP.s05 + lh(FS.t11_5);

    // ConnectorArrow — hairline, ferry glyph, hairline
    const cx = SP.s6 + colW + SP.s3;
    const cy = SP.s5 + lh1 + portH / 2;
    rect(body, 'Connector rule', cx, cy, 12.75, 1, { bg: C.slate300 });
    icon(body, 'Icon · ferry', RI.ferry, cx + 12.75 + SP.s1_5, cy - 8.5, 17, C.slate300);
    rect(body, 'Connector rule', cx + 12.75 + SP.s1_5 + 17 + SP.s1_5, cy, 12.75, 1, { bg: C.slate300 });

    const rx = SP.s6 + colW + legW + SP.s3 * 2;
    fieldGroupLabel(body, rx, SP.s5, colW, 'Destination port');
    portSelect(body, rx, SP.s5 + lh1, colW, 'Select destination');

    // Distance + Average duration — [1fr 1.6fr]
    const gy = SP.s5 + lh1 + portH + SP.s5;
    const dw = (iw - SP.s3) / 2.6;
    const dur = iw - SP.s3 - dw;
    const inputH = SP.s2 * 2 + lh(FS.t13);
    fieldGroupLabel(body, SP.s6, gy, dw, 'Distance', 'nm');
    const di = frame(body, 'Input - Distance', SP.s6, gy + lh1, dw, inputH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    text(di, 'Placeholder', '42', SP.s3, SP.s2, { size: FS.t13, color: C.slate300 });
    fieldGroupLabel(body, SP.s6 + dw + SP.s3, gy, dur, 'Average duration', 'hours');
    const ui = frame(body, 'Input - Average duration', SP.s6 + dw + SP.s3, gy + lh1, dur, inputH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    text(ui, 'Placeholder', '3.5', SP.s3, SP.s2, { size: FS.t13, color: C.slate300 });
  } else {
    // Hero card
    const heroH = 176;
    const hero = frame(body, 'Hero - New route', SP.s6, SP.s5, iw, heroH,
      { bg: C.brand500, radius: RAD.xxl, clip: true });
    text(hero, 'Eyebrow', 'NEW ROUTE', SP.s1_5 + SP.s2_5, SP.s1_5 + SP.s1_5,
      { size: FS.t9_5, weight: FONT.semibold, color: C.white, tracking: 2.07 });
    const inner = frame(hero, 'Card', SP.s1_5, SP.s1_5 + SP.s1_5 + lh(FS.t9_5) + SP.s1_5,
      iw - SP.s1_5 * 2, heroH - (SP.s1_5 * 3 + lh(FS.t9_5)) - SP.s1_5,
      { bg: C.white, radius: RAD.xl });
    const codeY = SP.s5;
    const half = inner.width / 2;
    text(inner, 'Origin code', 'CEB', 0, codeY,
      { size: 23, weight: FONT.bold, color: C.slate900, tracking: 1.38, width: half - 40, align: 'RIGHT' });
    text(inner, 'Origin city', 'Cebu City', 0, codeY + lh(23) + SP.s05,
      { size: FS.t11, color: C.slate500, width: half - 40, align: 'RIGHT' });
    const legSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="51" height="12.75" viewBox="0 0 48 12" '
      + 'fill="none" stroke="' + C.slate300 + '" stroke-width="1.5" stroke-linecap="round" '
      + 'stroke-linejoin="round"><path d="M2 6 H38" stroke-dasharray="3 3"/><path d="M38 2 L44 6 L38 10"/></svg>';
    svgNode(inner, 'Leg', legSvg, half - 25.5, codeY + lh(23) / 2 - 6.375);
    text(inner, 'Destination code', 'DGT', half + 40, codeY,
      { size: 23, weight: FONT.bold, color: C.slate900, tracking: 1.38, width: half - 40, align: 'LEFT' });
    text(inner, 'Destination city', 'Dumaguete City', half + 40, codeY + lh(23) + SP.s05,
      { size: FS.t11, color: C.slate500, width: half - 40, align: 'LEFT' });

    // Details card
    const dy = SP.s5 + heroH + SP.s4;
    const rowH = SP.s2 * 2 + lh(FS.t12_5);
    const dHead = SP.s3_5 + lh(FS.t13) + SP.s2;
    const det = frame(body, 'Details card', SP.s6, dy, iw, dHead + rowH * 4 + SP.s3_5,
      { bg: C.white, radius: RAD.xl, stroke: C.slate200, clip: true });
    text(det, 'Title', 'Details', SP.s4, SP.s3_5,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    const ed = frame(det, 'Button - Edit', iw - SP.s4 - 62, SP.s3_5 - 2, 62, lh(FS.t11_5) + SP.s05 * 2,
      { radius: RAD.md });
    icon(ed, 'Icon', I.pencil, SP.s2, (ed.height - 12.75) / 2, 12.75, C.brand700);
    text(ed, 'Label', 'Edit', SP.s2 + 12.75 + SP.s1, SP.s05,
      { size: FS.t11_5, weight: FONT.medium, color: C.brand700 });
    [['Origin', 'Cebu City', null], ['Destination', 'Dumaguete City', null],
     ['Distance', '42', 'nm'], ['Crossing', '3.75', 'hrs avg']].forEach((r, i) => {
      const row = frame(det, 'Row · ' + r[0], SP.s4, dHead + i * rowH, iw - SP.s4 * 2, rowH);
      if (i > 0) hairline(row, 'Divider', 0, 0, iw - SP.s4 * 2, C.slate100);
      text(row, 'Label', r[0], 0, SP.s2, { size: FS.t12, color: C.slate500 });
      if (r[2]) {
        const u = text(row, 'Unit', r[2], 0, SP.s2 + (lh(FS.t12_5) - lh(FS.t9_5)) / 2,
          { size: FS.t9_5, color: C.slate400 });
        u.x = row.width - u.width;
        const v = text(row, 'Value', r[1], 0, SP.s2,
          { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
        v.x = u.x - SP.s1 - v.width;
      } else {
        const v = text(row, 'Value', r[1], 0, SP.s2,
          { size: FS.t12_5, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
        v.x = row.width - v.width;
      }
    });
  }

  wizardFooter(dlg, W, H, step, 2, step === 0 ? 'Continue' : 'Create route', step === 0);
  return dlg;
}

/* ── R10. Frames ───────────────────────────────────────────────────────── */

const R_TITLE = 'Routes', R_NAV = 'Routes';
const pagerLine = (a, b) => 'Showing ' + a + '–' + b + ' of 26 routes';
const LEG = 'Cebu City → Dumaguete City';

// Every dialog frame sits over the same page-1 table, so the chrome behind the
// scrim is identical and the dialogs read as one flow.
function pageBehind(shell, opts) {
  const o = opts || {};
  return buildRoutesTable(shell.content, shell.bodyY, {
    rows: o.rows || ROUTE_ROWS, pagerSummary: pagerLine(1, 10),
    page: 1, totalPages: 3, filterCount: o.filterCount,
  });
}

const BUILDERS = [
  /* ── Configured routes ─────────────────────────────────────────────── */

  { name: 'Routes / Configured routes / 01 — View configured routes — Loading',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); buildSkeleton(s.content, s.bodyY, 9); } },

  { name: 'Routes / Configured routes / 02 — View configured routes — Default list',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s); } },

  { name: 'Routes / Configured routes / 03 — Sort by schedule — Ascending',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS_ASC, sortAsc: true,
        pagerSummary: pagerLine(1, 10), page: 1, totalPages: 3 }); } },

  { name: 'Routes / Configured routes / 04 — Filter — No results',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      // Pagination renders even with nothing to page through — the footer
      // carries the only running count now that the toolbar sub-line is gone.
      buildRoutesTable(s.content, s.bodyY, { rows: [], filterCount: 2,
        pagerSummary: 'Showing 0–0 of 0 routes', page: 1, totalPages: 1 }); } },

  { name: 'Routes / Configured routes / 05 — Open route filters — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildFiltersDialog(s.frame, ROUTE_FILTER_FIELDS, 0); } },

  { name: 'Routes / Configured routes / 06 — Apply filters — Filters applied',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      buildRoutesTable(s.content, s.bodyY, {
        rows: ROUTE_ROWS.filter((r) => r.st === 'Scheduled' && r.on),
        filterCount: 2, pagerSummary: 'Showing 1–8 of 8 routes', page: 1, totalPages: 1 }); } },

  { name: 'Routes / Configured routes / 07 — Go to next page — Page 2',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS_P2, pagerSummary: pagerLine(11, 20),
        page: 2, totalPages: 3 }); } },

  // Ten rows push the footer below the 900px fold, so this frame uses the
  // filtered short list — the only way to see the pager on a 1440x900 screen.
  { name: 'Routes / Configured routes / 08 — Rows per page — Selector open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      buildRoutesTable(s.content, s.bodyY, {
        rows: ROUTE_ROWS.filter((r) => r.st === 'Scheduled' && r.on), filterCount: 2,
        pagerSummary: 'Showing 1–8 of 8 routes', page: 1, totalPages: 1,
        sizeOpen: true, shell: s }); } },

  /* ── Row actions ───────────────────────────────────────────────────── */

  { name: 'Routes / Route actions / 01 — Scheduled route — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      const i = 3;
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS, menuRowIndex: i,
        pagerSummary: pagerLine(1, 10), page: 1, totalPages: 3 });
      const a = routeMenuAnchor(s, i);
      buildRouteMenu(s.frame, a.x, a.y, routeMenuItems('Scheduled', true, false)); } },

  { name: 'Routes / Route actions / 02 — Departed route — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      const i = 1;
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS_ASC, sortAsc: true, menuRowIndex: i,
        pagerSummary: pagerLine(1, 10), page: 1, totalPages: 3 });
      const a = routeMenuAnchor(s, i);
      buildRouteMenu(s.frame, a.x, a.y, routeMenuItems('Departed', true, false)); } },

  // The frame this pass exists for: a Cancelled leg now gets Mark Scheduled
  // (reinstate) at the top and Refund bookings appended at the bottom.
  { name: 'Routes / Route actions / 03 — Cancelled route — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      const i = 6;
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS, menuRowIndex: i,
        pagerSummary: pagerLine(1, 10), page: 1, totalPages: 3 });
      const a = routeMenuAnchor(s, i);
      buildRouteMenu(s.frame, a.x, a.y, routeMenuItems('Cancelled', true, false)); } },

  { name: 'Routes / Route actions / 04 — Inactive route — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      const i = 6;
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS_P2, menuRowIndex: i,
        pagerSummary: pagerLine(11, 20), page: 2, totalPages: 3 });
      const a = routeMenuAnchor(s, i);
      buildRouteMenu(s.frame, a.x, a.y, routeMenuItems('Scheduled', false, false)); } },

  { name: 'Routes / Route actions / 05 — Locked by bookings — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV);
      const i = 5;
      buildRoutesTable(s.content, s.bodyY, { rows: ROUTE_ROWS, menuRowIndex: i,
        pagerSummary: pagerLine(1, 10), page: 1, totalPages: 3 });
      const a = routeMenuAnchor(s, i);
      buildRouteMenu(s.frame, a.x, a.y, routeMenuItems('Scheduled', true, true)); } },

  /* ── Assign vessel ─────────────────────────────────────────────────── */

  { name: 'Routes / Assign vessel / 01 — Dialog open — Current vessel preselected',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      // Opens seeded to the leg's current hull, so Assign Vessel starts locked.
      buildAssignVesselDialog(s.frame, { current: 'MV Visayan Star', picked: 'MV Visayan Star' }); } },

  { name: 'Routes / Assign vessel / 02 — New vessel picked — Ready to assign',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildAssignVesselDialog(s.frame, { current: 'MV Visayan Star', picked: 'FC Sinulog' }); } },

  { name: 'Routes / Assign vessel / 03 — Unassigned leg — Nothing picked',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildAssignVesselDialog(s.frame, { current: '', picked: '' }); } },

  { name: 'Routes / Assign vessel / 04 — Search vessels — No matches',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildAssignVesselDialog(s.frame, { current: 'MV Visayan Star', picked: 'MV Visayan Star',
        query: 'catamaran', noMatches: true }); } },

  { name: 'Routes / Assign vessel / 05 — Vessel assigned — Toast',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildToast(s.frame, 'Vessel assigned to ' + LEG); } },

  /* ── Route status (Active / Inactive) ──────────────────────────────── */

  { name: 'Routes / Route status / 01 — Disable route — Confirm dialog',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildRouteStatusDialog(s.frame, true); } },

  { name: 'Routes / Route status / 02 — Enable route — Confirm dialog',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildRouteStatusDialog(s.frame, false); } },

  /* ── Lifecycle ─────────────────────────────────────────────────────── */

  { name: 'Routes / Lifecycle / 01 — Mark Departed — Set actual departure',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildSetDepartureDialog(s.frame); } },

  { name: 'Routes / Lifecycle / 02 — Cancel route — Reason required',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCancelConfirmDialog(s.frame, {}); } },

  { name: 'Routes / Lifecycle / 03 — Cancel route — Reason menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCancelConfirmDialog(s.frame, { menuOpen: true }); } },

  { name: 'Routes / Lifecycle / 04 — Cancel route — Reason selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCancelConfirmDialog(s.frame, { reason: 'Bad weather / port closure', touched: true }); } },

  { name: 'Routes / Lifecycle / 05 — Cancel route — Others, free text',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCancelConfirmDialog(s.frame, { reason: 'Others', touched: true,
        other: 'Vessel pulled for emergency drydock inspection by MARINA.' }); } },

  { name: 'Routes / Lifecycle / 06 — Cancel route — Validation error',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCancelConfirmDialog(s.frame, { reason: 'Others', other: '', touched: true }); } },

  { name: 'Routes / Lifecycle / 07 — Refund bookings — Bookings to refund',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildRefundDialog(s.frame, false); } },

  { name: 'Routes / Lifecycle / 08 — Refund bookings — Nothing left to refund',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildRefundDialog(s.frame, true); } },

  { name: 'Routes / Lifecycle / 09 — Refund complete — Toast',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildToast(s.frame, '12 bookings marked Refunded'); } },

  /* ── Create route (unreachable today — see the README) ──────────────── */

  { name: 'Routes / Create route / 01 — Details step — Empty form',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCreateRouteDialog(s.frame, 0); } },

  { name: 'Routes / Create route / 02 — Review step — Ready to create',
    build: (x, y, n) => { const s = buildShell(n, x, y, R_TITLE, R_NAV); pageBehind(s);
      buildCreateRouteDialog(s.frame, 1); } },
];

/* ── R11. Run — creates its own section below everything on the page ───── */

const SECTION_NAME = 'Routes — All states (v3)';

async function main() {
  FONT = await loadFonts();

  // Anchor to the page that already holds the Tickets/Bookings sections.
  let page = null;
  try {
    await figma.loadAllPagesAsync();
    const anchor = figma.root.findOne((n) =>
      n.type === 'SECTION' && n.name.indexOf('Tickets- Passenger') === 0);
    page = anchor ? anchor.parent : null;
  } catch (e) { page = null; }
  if (!page) page = figma.currentPage;
  if (typeof figma.setCurrentPageAsync === 'function') await figma.setCurrentPageAsync(page);
  else figma.currentPage = page;

  loadImages();

  const rows = Math.ceil(BUILDERS.length / GRID_COLS);
  const needW = GRID_MARGIN_X * 2 + GRID_COLS * FRAME_W + (GRID_COLS - 1) * GRID_GAP;
  const needH = GRID_MARGIN_Y * 2 + rows * FRAME_H + (rows - 1) * GRID_GAP;

  // Reuse the section if a previous run made it; otherwise create it clear of
  // every existing section on the page.
  let section = page.findOne((n) => n.type === 'SECTION' && n.name === SECTION_NAME);
  if (!section) {
    let bottom = 0, left = 0;
    page.children.forEach((c) => {
      if (c.type !== 'SECTION') return;
      bottom = Math.max(bottom, c.y + c.height);
      left = Math.min(left, c.x);
    });
    section = figma.createSection();
    section.name = SECTION_NAME;
    page.appendChild(section);
    section.x = left;
    section.y = bottom + 400;
    section.resizeWithoutConstraints(needW, needH);
  } else if (section.resizeWithoutConstraints) {
    section.resizeWithoutConstraints(Math.max(section.width, needW), Math.max(section.height, needH));
  }

  // Additive: never touch a frame that is already there.
  const existing = Object.create(null);
  section.children.forEach((c) => { existing[c.name] = true; });

  const sectionBox = section.absoluteBoundingBox;
  const made = [];
  let skipped = 0;
  for (let i = 0; i < BUILDERS.length; i++) {
    if (existing[BUILDERS[i].name]) { skipped++; continue; }
    const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
    const x = GRID_MARGIN_X + col * (FRAME_W + GRID_GAP);
    const y = GRID_MARGIN_Y + row * (FRAME_H + GRID_GAP);

    LAST_SHELL = null;
    BUILDERS[i].build(x, y, BUILDERS[i].name);
    const node = LAST_SHELL;
    if (!node) continue;

    section.appendChild(node);
    node.x = x; node.y = y;
    const box = node.absoluteBoundingBox;
    if (box && sectionBox) {
      node.x += (sectionBox.x + x) - box.x;
      node.y += (sectionBox.y + y) - box.y;
    }
    made.push(node);
  }
  flushSvgCache();

  if (made.length) {
    figma.currentPage.selection = made;
    figma.viewport.scrollAndZoomIntoView(made);
  }
  figma.closePlugin(
    made.length
      ? 'Added ' + made.length + ' frame' + (made.length === 1 ? '' : 's') + ' to "' + SECTION_NAME + '"'
        + (skipped ? ' · kept ' + skipped + ' existing' : '')
      : 'Nothing to add — all ' + skipped + ' frames already exist in "' + SECTION_NAME + '".');
}

main().catch((e) => figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e))));
