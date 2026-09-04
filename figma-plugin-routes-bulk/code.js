/* ============================================================================
 * Tripket — Build "Routes · Bulk actions & Cancel validation — All states"
 * ----------------------------------------------------------------------------
 * Scoped to TWO changes only. It does not rebuild the Routes section:
 *
 *   1. Bulk actions on app/routes/page.tsx — row/header select checkboxes, the
 *      selection banner that replaces <thead>, the "Disable routes" toolbar
 *      button that displaces Filters, and BulkDisableRoutesDialog.
 *   2. CancelConfirmDialog free-text validation — REASON_MIN = 10 /
 *      REASON_MAX = 200, the character counter and its three colour tiers.
 *
 * Everything else on the page (filters, row menu, wizard, refund flow) stays in
 * `tripket-routes-allstates`. Frames are additive and land in their own
 * section, so the existing Routes frames are never touched.
 *
 * Chrome layer (sidebar, topbar, table stack, tokens) is copied byte-for-byte
 * from figma-plugin-routes/code.js lines 1-1538. New code starts at "B1.".
 *
 * Real CSS pixels at 1440x900. globals.css sets html { font-size: 17px } so rem
 * utilities are 17px-based (px-5 = 21.25, py-2.5 = 10.625) while literal px
 * classes do NOT scale — h-4 w-4 checkboxes are 17, rounded-[5px] stays 5,
 * min-w-[20px] stays 20. globals.css also lifts every text-[Npx] by ~1px; the
 * FS table already encodes that (text-[13px] -> 14).
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

/* ── B1. Bulk-selection tokens, icons, and copy ────────────────────────── */

/**
 * Everything below is new to this plugin. Two features, one section:
 * bulk selection on the routes table, and the min/max validator on the
 * shared CancelConfirmDialog.
 */

const BI = {
  // SelectCheckbox glyphs — strokeWidth 3.5, drawn at h-2.5 w-2.5 (10.625).
  cbCheck: { sw: 3.5, d: '<path d="M5 12l5 5 9-11"/>' },
  cbDash:  { sw: 3.5, d: '<path d="M6 12h12"/>' },
  // The bulk-disable slash is a longer chord than RI.disableRoute's.
  bulkSlash: { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>' },
  arrowRight: { sw: 2, d: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  infoCircle: { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>' },
};

// components/CancelConfirmDialog.tsx — exported bounds, shared by every
// surface that captures a free-text reason so the rule can't drift.
const REASON_MIN = 10;
const REASON_MAX = 200;

const CB = 17;          // h-4 w-4
const CB_GLYPH = 10.625; // h-2.5 w-2.5
const SEL_W = R_PAD_X * 2 + CB;                                   // w-10 th, overridden by px-5 + 17
const R_BANNER_H = SP.s2_5 * 2 + Math.max(CB, lh(FS.t13));        // px-5 py-2.5

/* ── B2. SelectCheckbox, selection banner, bulk toolbar ────────────────── */

/**
 * SelectCheckbox — a real <input> visually replaced by a 17px square.
 * `indeterminate` only shows when not checked (the ref callback in source
 * sets `el.indeterminate = !!indeterminate && !checked`).
 */
function selectCheckbox(parent, x, y, state) {
  const on = state === 'checked', mixed = state === 'indeterminate';
  const box = frame(parent, 'SelectCheckbox · ' + (state || 'unchecked'), x, y, CB, CB, {
    bg: on || mixed ? C.brand500 : C.white,
    radius: 5,
    stroke: on || mixed ? C.brand500 : C.slate300,
  });
  if (on) icon(box, 'Icon · check', BI.cbCheck, (CB - CB_GLYPH) / 2, (CB - CB_GLYPH) / 2, CB_GLYPH, C.white);
  else if (mixed) icon(box, 'Icon · dash', BI.cbDash, (CB - CB_GLYPH) / 2, (CB - CB_GLYPH) / 2, CB_GLYPH, C.white);
  return box;
}

/**
 * Toolbar for the bulk build. With a selection live the Filters button is
 * displaced by "Disable routes" — the source swaps them rather than showing
 * both, since acting on the selection is the only thing the operator is there
 * to do at that point.
 */
function buildBulkToolbar(card, opts) {
  const o = opts || {};
  const count = o.count || 0;
  if (count === 0) return buildRoutesToolbar(card, o.filterCount || 0);

  const tb = frame(card, 'Toolbar', 0, 0, card.width, R_TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, R_TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', 'Configured routes', R_PAD_X, (R_TOOLBAR_H - lh(FS.base)) / 2,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  // px-3.5 py-2, gap-2, h-5 badge with min-w-[20px]
  const label = 'Disable routes';
  const badgeW = Math.max(20, SP.s1_5 * 2 + measure(String(count), FS.t10, FONT.bold));
  const bw = SP.s3_5 * 2 + CB + SP.s2 + measure(label, FS.t13, FONT.semibold) + SP.s2 + badgeW;
  const bh = SP.s2 * 2 + lh(FS.t13);
  const btn = frame(tb, 'Button - Disable routes', card.width - R_PAD_X - bw, (R_TOOLBAR_H - bh) / 2,
    bw, bh, { bg: C.white, radius: RAD.lg, stroke: C.rose300 });
  icon(btn, 'Icon', BI.bulkSlash, SP.s3_5, (bh - CB) / 2, CB, C.rose600);
  text(btn, 'Label', label, SP.s3_5 + CB + SP.s2, SP.s2,
    { size: FS.t13, weight: FONT.semibold, color: C.rose600 });
  const badge = frame(btn, 'Selected count', bw - SP.s3_5 - badgeW, (bh - SP.s5) / 2, badgeW, SP.s5,
    { bg: C.rose500, radius: RAD.full });
  const bt = text(badge, 'Count', String(count), 0, 0,
    { size: FS.t10, weight: FONT.bold, color: C.white });
  centerIn(bt, { x: 0, y: 0, w: badgeW, h: SP.s5 });
  return tb;
}

/**
 * Selection banner — sits between toolbar and table and carries the select-all
 * control, so <thead> is hidden while it's up rather than duplicating it.
 */
function buildSelectionBanner(card, y, count, headerState) {
  const b = frame(card, 'Selection banner', 0, y, card.width, R_BANNER_H,
    { bg: C.brand50, opacity: 0.6 });
  hairline(b, 'Border bottom', 0, R_BANNER_H - 1, card.width, C.brand100);
  selectCheckbox(b, R_PAD_X, (R_BANNER_H - CB) / 2, headerState);

  let x = R_PAD_X + CB + SP.s3;
  const label = count + ' route' + (count === 1 ? '' : 's') + ' selected';
  const lt = text(b, 'Selected count', label, x, (R_BANNER_H - lh(FS.t13)) / 2,
    { size: FS.t13, weight: FONT.semibold, color: C2.slate800 || C.slate700, tracking: -0.3 });
  x += lt.width + SP.s3;
  const pipe = text(b, 'Divider', '|', x, (R_BANNER_H - lh(FS.t13)) / 2,
    { size: FS.t13, color: C.slate300 });
  x += pipe.width + SP.s3;
  text(b, 'Button - Clear selection', 'Clear selection', x, (R_BANNER_H - lh(FS.t13)) / 2,
    { size: FS.t13, weight: FONT.semibold, color: C.brand600 });
  return b;
}

/* ── B3. Routes table with the select column ───────────────────────────── */

// The select column is a `w-10` th, but px-5 + a 17px box wins at 59.5.
const BULK_COL_DEFS = [{ key: 'sel', label: '', width: () => CB }].concat(ROUTE_COL_DEFS);

/**
 * opts: { rows, selected:Set-like array of indices, headerState, filterCount,
 *         pagerSummary, page, totalPages, pageSize, shell }
 */
function buildBulkRoutesTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || ROUTE_ROWS;
  const sel = o.selected || [];
  const isSel = (i) => sel.indexOf(i) !== -1;
  const count = sel.length;
  const banner = count > 0;

  const bodyH = rows.length ? rows.length * R_ROW_H : 96.5;
  const headH = banner ? R_BANNER_H : R_THEAD_H;
  const cardH = R_TOOLBAR_H + headH + bodyH + PAGER_H;
  const L = layoutColumns(BULK_COL_DEFS, rows, 0);
  const cols = L.cols;

  const card = frame(parent, 'Card - Configured routes', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  buildBulkToolbar(card, { count: count, filterCount: o.filterCount || 0 });
  if (banner) buildSelectionBanner(card, R_TOOLBAR_H, count, o.headerState || 'indeterminate');

  const scroll = frame(card, 'Table scroll', 0, R_TOOLBAR_H + (banner ? R_BANNER_H : 0),
    CONTENT_W, (banner ? 0 : R_THEAD_H) + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, L.width, (banner ? 0 : R_THEAD_H) + bodyH);

  // <thead className={selected.length > 0 ? 'hidden' : undefined}>
  if (!banner) {
    const thead = frame(table, 'Table header', 0, 0, L.width, R_THEAD_H, { bg: C.slate50, opacity: 0.5 });
    hairline(thead, 'Border bottom', 0, R_THEAD_H - 1, L.width, C.slate100);
    selectCheckbox(thead, cols[0].x + R_PAD_X, (R_THEAD_H - CB) / 2, o.headerState || 'unchecked');
    cols.forEach((c, ci) => {
      if (ci === 0) return;
      const label = c.label.toUpperCase();
      const tw = measure(label, FS.t11, FONT.medium, 0.96);
      const cx = c.center ? c.x + (c.w - tw) / 2 : c.x + R_PAD_X;
      const lt = text(thead, 'Header ' + c.label, label, cx, SP.s2_5,
        { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
      if (c.sortable) {
        const ic = icon(thead, 'Icon · sort', RI.sortDown, cx + lt.width + SP.s1_5,
          SP.s2_5 + (lh(FS.t11) - 14.875) / 2, 14.875, C.slate400);
        if (o.sortAsc) ic.rotation = 180;
      }
    });
  }

  const tbody = frame(table, 'Table body', 0, banner ? 0 : R_THEAD_H, L.width, bodyH);
  rows.forEach((r, i) => {
    const on = isSel(i);
    const row = frame(tbody, 'Row · ' + r.o + ' → ' + r.d, 0, i * R_ROW_H, L.width, R_ROW_H,
      on ? { bg: C.brand50, opacity: 0.5 } : undefined);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    // Selected rows keep the accent bar pinned instead of revealing it on hover.
    if (on) rect(row, 'Accent bar', 0, 0, 3, R_ROW_H, { bg: C.brand500 });
    selectCheckbox(row, cols[0].x + R_PAD_X, (R_ROW_H - CB) / 2, on ? 'checked' : 'unchecked');

    const mid1 = (R_ROW_H - lh(FS.t12_5)) / 2;
    text(row, 'Id', String(r.n), cols[1].x + R_PAD_X, mid1, { size: FS.t12_5, color: C.slate500 });
    text(row, 'Schedule', r.sched, cols[2].x + R_PAD_X, R_PAD_Y, { size: FS.t12_5, color: C.slate900 });
    text(row, 'Weekday', '(' + r.wd + ')', cols[2].x + R_PAD_X, R_PAD_Y + lh(FS.t12_5) + SP.s05,
      { size: FS.t11, color: C.slate400 });
    text(row, 'Origin', r.o, cols[3].x + R_PAD_X, (R_ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
    icon(row, 'Icon · arrow', RI.rowArrow, cols[4].x + R_PAD_X, (R_ROW_H - 12.75) / 2, 12.75, C.slate300);
    text(row, 'Destination', r.d, cols[4].x + R_PAD_X + 12.75 + SP.s2, (R_ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
    if (r.v) {
      const vy = (R_ROW_H - R_VESSEL_H) / 2;
      text(row, 'Vessel', r.v, cols[5].x + R_PAD_X, vy,
        { size: FS.t13, weight: FONT.medium, color: C.slate900, tracking: -0.3 });
      text(row, 'Vessel type', vType(r.v), cols[5].x + R_PAD_X, vy + lh(FS.t13) + SP.s05,
        { size: FS.t11, color: C.slate400 });
    } else {
      text(row, 'Vessel', 'Unassigned', cols[5].x + R_PAD_X, (R_ROW_H - lh(FS.t12)) / 2,
        { size: FS.t12, color: C.slate400 });
    }
    const ph = lh(FS.t10) + SP.s05 * 2;
    routePill(row, cols[6].x + R_PAD_X, (R_ROW_H - ph) / 2, ROUTE_TONE[r.st]);
    if (r.dep) text(row, 'Departed at', r.dep, cols[7].x + R_PAD_X, mid1, { size: FS.t12_5, color: C.slate900 });
    else text(row, 'Departed at', '—', cols[7].x + R_PAD_X, (R_ROW_H - lh(FS.t12)) / 2,
      { size: FS.t12, color: C.slate400 });
    const chipW = SP.s2_5 * 2 + 14.875 + SP.s1_5 + measure(r.on ? 'Active' : 'Inactive', FS.t10, FONT.semibold);
    const chipH = SP.s1 * 2 + lh(FS.t10);
    activeChip(row, cols[8].x + (cols[8].w - chipW) / 2, (R_ROW_H - chipH) / 2, r.on);
    const dv = text(row, 'Distance', String(r.nm), cols[9].x + R_PAD_X, (R_ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, weight: FONT.semibold, color: C.slate900 });
    text(row, 'Distance unit', 'nm', cols[9].x + R_PAD_X + dv.width + SP.s1,
      (R_ROW_H - lh(FS.sm)) / 2 + (lh(FS.sm) - lh(FS.t10)) / 2, { size: FS.t10, color: C.slate400 });
    const hv = text(row, 'Duration', String(r.hr), cols[10].x + R_PAD_X, (R_ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, weight: FONT.semibold, color: C.slate900 });
    text(row, 'Duration unit', 'hrs avg', cols[10].x + R_PAD_X + hv.width + SP.s1,
      (R_ROW_H - lh(FS.sm)) / 2 + (lh(FS.sm) - lh(FS.t10)) / 2, { size: FS.t10, color: C.slate400 });
  });

  // Sticky actions column — no header cell while the banner is up.
  const stickyH = (banner ? 0 : R_THEAD_H) + bodyH;
  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - R_ACTIONS_W, 0,
    R_ACTIONS_W, stickyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, stickyH, { bg: C.slate900, opacity: 0.04 });
  if (!banner) {
    const sh = frame(sticky, 'Header cell', 0, 0, R_ACTIONS_W, R_THEAD_H, { bg: C.slate50, opacity: 0.7 });
    hairline(sh, 'Border bottom', 0, R_THEAD_H - 1, R_ACTIONS_W, C.slate100);
  }
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, (banner ? 0 : R_THEAD_H) + i * R_ROW_H,
      R_ACTIONS_W, R_ROW_H, { bg: isSel(i) ? C.brand50 : C.white, opacity: isSel(i) ? 0.5 : 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, R_ACTIONS_W, C.slate100);
    kebab(cell, R_PAD_X, (R_ROW_H - 29.75) / 2, false);
  });

  buildRoutesPager(card, R_TOOLBAR_H + headH + bodyH, {
    summary: o.pagerSummary, page: o.page || 1, totalPages: o.totalPages || 1,
    pageSize: o.pageSize || 10,
  });
  return card;
}

/* ── B4. BulkDisableRoutesDialog (components/BulkDisableRoutesDialog.tsx) ─ */

C2.slate800 = C2.slate800 || '#1E293B';
const LG_W = 544;   // max-w-lg — 32rem at the 17px root
const MD_W_B = 476; // max-w-md — 28rem at the 17px root
const BADGE_10 = 42.5; // h-10 w-10

/**
 * The summary restates the FILTERS the selection was made under rather than
 * listing every route: a bulk action can span dozens of rows, and "which
 * filters produced this set" is what an operator needs to verify. The count is
 * the check that the set is the expected size.
 *
 * opts: { count, origin, destination, dateFrom, dateTo }
 */
function buildBulkDisableDialog(parent, opts) {
  const o = opts || {};
  const count = o.count || 0;
  const W = LG_W, PAD = SP.s6, badgeS = BADGE_10;

  const headTx = PAD + badgeS + SP.s3_5;
  const headTw = W - PAD - headTx;
  const bodyStr = 'The selected routes will be marked Disabled.';
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS_R.t14) / headTw));
  const headH = Math.max(badgeS, lh(FS.t17) + SP.s1 + bodyLines * (FS_R.t14 * RELAXED));

  // Summary card
  const badgeH = SP.s1 * 2 + lh(FS.t13_5);
  const sumTopH = SP.s3 * 2 + Math.max(lh(FS_R.t14), badgeH);
  const blockH = lh(FS.t10) + SP.s1 + lh(FS_R.t14);
  const sumBotH = SP.s3 * 2 + blockH * 2 + SP.s3;
  const sumH = sumTopH + sumBotH;

  const noteH = 2 * (FS.t13 * RELAXED);
  const btnH = SP.s2_5 * 2 + lh(FS_R.t14);
  const H = PAD * 2 + headH + SP.s4 + sumH + SP.s3 + noteH + SP.s5 + btnH;

  const dlg = buildModal(parent, 'Dialog - Disable selected routes', W, H, false);

  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS, { bg: C.rose50, radius: RAD.full });
  icon(badge, 'Icon', BI.bulkSlash, (badgeS - SP.s5) / 2, (badgeS - SP.s5) / 2, SP.s5, C.rose600);

  text(dlg, 'Title', 'Disable selected routes?', headTx, PAD,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  const bd = text(dlg, 'Body', bodyStr, headTx, PAD + lh(FS.t17) + SP.s1,
    { size: FS_R.t14, color: C.slate500, lh: FS_R.t14 * RELAXED, width: headTw });
  const dAt = bodyStr.indexOf('Disabled');
  bd.setRangeFills(dAt, dAt + 8, fill(C.rose600));
  bd.setRangeFontName(dAt, dAt + 8, { family: FONT.family, style: FONT.semibold });

  /* Summary — what's being acted on, and under which filters. */
  const sy = PAD + headH + SP.s4;
  const sum = frame(dlg, 'Summary', PAD, sy, W - PAD * 2, sumH,
    { radius: RAD.xl, stroke: C.slate200, clip: true });
  const sumW = W - PAD * 2;

  text(sum, 'Label', 'Routes to be disabled', SP.s4, (sumTopH - lh(FS_R.t14)) / 2,
    { size: FS_R.t14, weight: FONT.medium, color: C.slate700, tracking: -0.3 });
  const cntStr = count + ' selected';
  const cntW = SP.s3 * 2 + measure(cntStr, FS.t13_5, FONT.bold);
  const cnt = frame(sum, 'Selected count', sumW - SP.s4 - cntW, (sumTopH - badgeH) / 2, cntW, badgeH,
    { bg: C.rose50, radius: RAD.full });
  text(cnt, 'Count', cntStr, SP.s3, SP.s1, { size: FS.t13_5, weight: FONT.bold, color: C.rose600 });

  const bot = frame(sum, 'Filters', 0, sumTopH, sumW, sumBotH, { bg: C.slate50, opacity: 0.6 });
  hairline(bot, 'Border top', 0, 0, sumW, C.slate100);
  const pair = (name, label, a, b, by) => {
    text(bot, name + ' label', label, SP.s4, by,
      { size: FS.t10, weight: FONT.semibold, color: C.slate400, tracking: 1.1 });
    const vy = by + lh(FS.t10) + SP.s1;
    const at = text(bot, name + ' from', a, SP.s4, vy,
      { size: FS_R.t14, color: C2.slate800, tracking: -0.3 });
    const ax = SP.s4 + at.width + SP.s2;
    icon(bot, 'Icon · arrow', BI.arrowRight, ax, vy + (lh(FS_R.t14) - 14.875) / 2, 14.875, C.slate400);
    text(bot, name + ' to', b, ax + 14.875 + SP.s2, vy,
      { size: FS_R.t14, color: C2.slate800, tracking: -0.3 });
  };
  pair('Route', 'ROUTE', o.origin || 'Any origin', o.destination || 'Any destination', SP.s3);
  pair('Schedule', 'SCHEDULE DATE', o.dateFrom || '—', o.dateTo || '—', SP.s3 + blockH + SP.s3);

  /* Note — mt-3 */
  const ny = sy + sumH + SP.s3;
  icon(dlg, 'Icon · info', BI.infoCircle, PAD, ny + SP.s05, CB, C.slate400);
  text(dlg, 'Note',
    'These selected routes will be disabled based on the current filters above. To change the filters, clear the current selection first.',
    PAD + CB + SP.s2, ny,
    { size: FS.t13, color: C.slate400, lh: FS.t13 * RELAXED, width: W - PAD * 2 - CB - SP.s2 });

  /* Footer — mt-5, justify-end gap-3 */
  const by = H - PAD - btnH;
  const primary = 'Disable ' + count + ' route' + (count === 1 ? '' : 's');
  const pw = SP.s4 * 2 + measure(primary, FS_R.t14, FONT.semibold);
  const cw = SP.s4 * 2 + measure('Keep enabled', FS_R.t14, FONT.semibold);
  const keep = frame(dlg, 'Button - Keep enabled', W - PAD - pw - SP.s3 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(keep, 'Label', 'Keep enabled', SP.s4, SP.s2_5,
    { size: FS_R.t14, weight: FONT.semibold, color: C.slate700 });
  const go = frame(dlg, 'Button - ' + primary, W - PAD - pw, by, pw, btnH, { bg: C.rose600, radius: RAD.lg });
  text(go, 'Label', primary, SP.s4, SP.s2_5, { size: FS_R.t14, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── B5. CancelConfirmDialog — REASON_MIN / REASON_MAX validation ───────── */

/**
 * Supersedes buildCancelConfirmDialog in figma-plugin-routes. What's new:
 *
 *   • free text must reach REASON_MIN (10) before "Mark Cancelled" enables;
 *   • the textarea is capped at REASON_MAX (200) via maxLength, so the max is
 *     enforced by refusing keystrokes rather than by rejecting on submit;
 *   • a character counter shares one row with the validation message —
 *     message left, count right, on a single baseline;
 *   • the counter has three tiers: slate-400 normally, amber-600 inside the
 *     last 30 characters, rose-500 medium once the cap is hit.
 *
 * opts: { reason, other, touched }
 */
function buildCancelReasonDialog(parent, opts) {
  const o = opts || {};
  const W = MD_W_B, PAD = SP.s6, badgeS = SP.s9;
  const leg = 'Cebu City → Dumaguete City';
  const other = o.other || '';
  const otherLen = other.trim().length;
  const isOthers = o.reason === 'Others';
  const tooShort = otherLen > 0 && otherLen < REASON_MIN;
  const valid = !!o.reason && (!isOthers || otherLen >= REASON_MIN);
  const showErr = (!!o.touched && !valid) || tooShort;
  const showCounter = isOthers && otherLen > 0;
  const errText = !showErr ? ''
    : !isOthers ? 'Select a cancellation reason before confirming.'
    : tooShort ? 'Use at least ' + REASON_MIN + ' characters.'
    : 'Enter the reason before confirming.';

  const tx = PAD + badgeS + SP.s3;
  const textW = W - PAD * 2 - badgeS - SP.s3;
  const bodyStr = 'Route ‘' + leg + '’ will be marked Cancelled. You’ll refund its bookings next.';
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS.t12_5) / textW));
  const bodyH0 = lh(FS.t15) + SP.s1 + bodyLines * (FS.t12_5 * RELAXED);

  const selH = SP.s2 * 2 + lh(FS.sm);
  const areaH = SP.s2 * 2 + lh(FS.t13) * 3;                 // rows={3}
  const rowH = (showErr || showCounter) ? SP.s1 + lh(FS.t11_5) : 0;
  const noteH = SP.s2 + 2 * (FS.t11_5 * RELAXED);
  const fieldsH = SP.s4 + lh(FS.t11_5) + SP.s1_5 + selH
    + (isOthers ? SP.s2 + areaH : 0) + rowH + noteH;
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
  const legAt = bodyStr.indexOf('‘');
  bd.setRangeFills(legAt, legAt + leg.length + 2, fill(C.slate700));
  bd.setRangeFontName(legAt, legAt + leg.length + 2, { family: FONT.family, style: FONT.semibold });
  const cAt = bodyStr.indexOf('Cancelled');
  bd.setRangeFills(cAt, cAt + 9, fill(C.rose600));
  bd.setRangeFontName(cAt, cAt + 9, { family: FONT.family, style: FONT.semibold });

  let fy = PAD + Math.max(badgeS, bodyH0) + SP.s4;
  const lab = text(dlg, 'Field label', 'Cancellation reason *', PAD, fy,
    { size: FS.t11_5, weight: FONT.semibold, color: C.slate700 });
  lab.setRangeFills(20, 21, fill(C.rose500));

  const selY = fy + lh(FS.t11_5) + SP.s1_5;
  const selW = W - PAD * 2;
  const sel = frame(dlg, 'Select - Cancellation reason', PAD, selY, selW, selH,
    { bg: C.white, radius: RAD.lg, stroke: C.gray200 });
  const st = text(sel, o.reason ? 'Value' : 'Placeholder', o.reason || 'Select a reason…',
    SP.s3, (selH - lh(FS.sm)) / 2, { size: FS.sm, color: o.reason ? C.gray900 : C.gray400 });
  if (!o.reason) st.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
  icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s3 - 14.875, (selH - 14.875) / 2, 14.875, C.gray400);

  let cy = selY + selH;

  if (isOthers) {
    // border-rose-300 while the field is empty-after-touch or under the floor.
    const bad = (!!o.touched && otherLen === 0) || tooShort;
    const area = frame(dlg, 'Textarea - Other reason', PAD, cy + SP.s2, selW, areaH,
      { bg: C.white, radius: RAD.lg, stroke: bad ? C.rose300 : C.slate200, clip: true });
    text(area, other ? 'Value' : 'Placeholder',
      other || 'Describe the reason (at least ' + REASON_MIN + ' characters)…',
      SP.s3, SP.s2, { size: FS.t13, color: other ? C2.slate800 : C.slate400,
        lh: lh(FS.t13), width: selW - SP.s3 * 2 });
    cy += SP.s2 + areaH;
  }

  /* Validation message and counter share one row — message left, count right,
     so they sit on a single baseline instead of stacking. */
  if (showErr || showCounter) {
    const ry = cy + SP.s1;
    if (errText) text(dlg, 'Validation error', errText, PAD, ry,
      { size: FS.t11_5, weight: FONT.medium, color: C.rose500 });
    if (showCounter) {
      const n = other.length;
      const cc = n >= REASON_MAX ? C.rose500 : n > REASON_MAX - 30 ? C2.amber600 : C.slate400;
      const cstr = n + ' / ' + REASON_MAX;
      text(dlg, 'Character counter', cstr, W - PAD - measure(cstr, FS.t11, n >= REASON_MAX ? FONT.medium : FONT.regular),
        ry, { size: FS.t11, weight: n >= REASON_MAX ? FONT.medium : FONT.regular, color: cc });
    }
    cy = ry + lh(FS.t11_5);
  }

  const ny = cy + SP.s2;
  icon(dlg, 'Icon · info', BI.infoCircle, PAD, ny + 1, 14.875, C.slate400);
  const noteStr = 'The passenger sees this reason in their booking app. Keep it clear and factual.';
  const strong = 'The passenger sees this reason in their booking app.';
  const note = text(dlg, 'Passenger note', noteStr, PAD + 14.875 + SP.s1_5, ny,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * RELAXED, width: W - PAD * 2 - 14.875 - SP.s1_5 });
  note.setRangeFills(0, strong.length, fill(C.slate600));
  note.setRangeFontName(0, strong.length, { family: FONT.family, style: FONT.semibold });

  const by = H - PAD - btnH;
  const pw = SP.s4 * 2 + measure('Mark Cancelled', FS.t12_5, FONT.semibold);
  const cw = SP.s3_5 * 2 + measure('Cancel', FS.t12_5, FONT.semibold);
  const ca = frame(dlg, 'Button - Cancel', W - PAD - pw - SP.s2_5 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3_5, SP.s2, { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const pr = frame(dlg, 'Button - Mark Cancelled', W - PAD - pw, by, pw, btnH,
    { bg: valid ? C.rose600 : C.rose300, radius: RAD.lg });
  text(pr, 'Label', 'Mark Cancelled', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── B6. Frames ────────────────────────────────────────────────────────── */

const B_TITLE = 'Routes', B_NAV = 'Routes';
const bPager = (a, b) => 'Showing ' + a + '–' + b + ' of 26 routes';

// Free-text samples. Lengths drive the counter, so they are sliced from one
// source string rather than hand-counted — REASON_MAXED is exactly the cap,
// cut mid-word the way maxLength actually truncates a paste.
const REASON_SRC =
  'Vessel reassigned to an emergency medical transfer requested by the provincial health office, ' +
  'so this sailing is grounded until a replacement hull is cleared by the coast guard inspector ' +
  'and the port authority reopens the berth for commercial departures.';
const REASON_SHORT = 'bad wx';                                  // 6 — under REASON_MIN
const REASON_OK    = 'Vessel reassigned to an emergency medical transfer.';
const REASON_NEAR  = REASON_SRC.slice(0, 178);                  // amber band
const REASON_MAXED = REASON_SRC.slice(0, REASON_MAX);           // 200 — capped

const SEL_1  = [0];
const SEL_4  = [0, 1, 3, 6];
const SEL_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function bulkPage(shell, opts) {
  const o = opts || {};
  return buildBulkRoutesTable(shell.content, shell.bodyY, {
    rows: ROUTE_ROWS,
    selected: o.selected || [],
    headerState: o.headerState,
    filterCount: o.filterCount || 0,
    pagerSummary: bPager(1, 10), page: 1, totalPages: 3,
  });
}

const BUILDERS = [
  /* ── Bulk actions ──────────────────────────────────────────────────── */

  { name: 'Routes / Bulk actions / 01 — View configured routes — No selection',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      // Baseline: thead visible with its select-all box, Filters in the toolbar.
      bulkPage(s, { selected: [], headerState: 'unchecked' }); } },

  { name: 'Routes / Bulk actions / 02 — Select one route — 1 selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      bulkPage(s, { selected: SEL_1, headerState: 'indeterminate' }); } },

  { name: 'Routes / Bulk actions / 03 — Select several routes — 4 selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      bulkPage(s, { selected: SEL_4, headerState: 'indeterminate' }); } },

  { name: 'Routes / Bulk actions / 04 — Select all on page — 10 selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      bulkPage(s, { selected: SEL_10, headerState: 'checked' }); } },

  { name: 'Routes / Bulk actions / 05 — Open bulk disable — Confirm dialog',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      bulkPage(s, { selected: SEL_4, headerState: 'indeterminate', filterCount: 2 });
      buildScrim(s.frame, 0.3);
      buildBulkDisableDialog(s.frame, {
        count: 4, origin: 'Cebu City', destination: 'Dumaguete City',
        dateFrom: 'Aug 1, 2026, 12:00 AM', dateTo: 'Aug 31, 2026, 11:59 PM',
      }); } },

  { name: 'Routes / Bulk actions / 06 — Confirm disable — Applied with skips',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      // Selection is dropped on confirm, so the toolbar is back to Filters.
      bulkPage(s, { selected: [], headerState: 'unchecked' });
      buildToast(s.frame, '2 routes disabled · 2 skipped (confirmed bookings)'); } },

  { name: 'Routes / Bulk actions / 07 — Confirm disable — Nothing eligible',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV);
      bulkPage(s, { selected: [], headerState: 'unchecked' });
      buildToast(s.frame,
        'No routes disabled — the selected legs have confirmed bookings or are already disabled.'); } },

  /* ── Cancel reason validation (REASON_MIN 10 / REASON_MAX 200) ──────── */

  { name: 'Routes / Cancel validation / 01 — Confirm with no reason — Required error',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: '', other: '', touched: true }); } },

  { name: 'Routes / Cancel validation / 02 — Choose Others — Empty free text',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: 'Others', other: '', touched: true }); } },

  { name: 'Routes / Cancel validation / 03 — Below minimum — Under 10 characters',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: 'Others', other: REASON_SHORT, touched: true }); } },

  { name: 'Routes / Cancel validation / 04 — Valid reason — Confirm enabled',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: 'Others', other: REASON_OK, touched: true }); } },

  { name: 'Routes / Cancel validation / 05 — Approaching limit — Amber counter',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: 'Others', other: REASON_NEAR, touched: true }); } },

  { name: 'Routes / Cancel validation / 06 — Character cap reached — Rose counter',
    build: (x, y, n) => { const s = buildShell(n, x, y, B_TITLE, B_NAV); bulkPage(s);
      buildScrim(s.frame, 0.3);
      buildCancelReasonDialog(s.frame, { reason: 'Others', other: REASON_MAXED, touched: true }); } },
];

/* ── B7. Run — creates its own section below everything on the page ────── */

const SECTION_NAME = 'Routes · Bulk actions & Cancel validation — All states';

async function main() {
  FONT = await loadFonts();
  loadImages();

  const page = figma.currentPage;
  const rows = Math.ceil(BUILDERS.length / GRID_COLS);
  const needW = GRID_MARGIN_X * 2 + GRID_COLS * FRAME_W + (GRID_COLS - 1) * GRID_GAP;
  const needH = GRID_MARGIN_Y * 2 + rows * FRAME_H + (rows - 1) * GRID_GAP;

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
