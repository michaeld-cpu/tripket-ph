/* ============================================================================
 * Tripket — Build "Tickets — All states (v2)"
 * ----------------------------------------------------------------------------
 * Rebuilds BOTH ticket sub-pages as native Figma frames:
 *   app/tickets/passengers/page.tsx  ->  Passenger tickets
 *   app/tickets/vehicles/page.tsx    ->  Vehicle tickets
 * (/tickets itself is just a redirect to /tickets/passengers.)
 *
 * Unlike the original figma-plugin, this one CREATES its own section below
 * every existing section on the page rather than writing into the imported
 * "Tickets- Passenger..." section — so nothing already in the file is touched.
 *
 * Fifth plugin in the set. It shares the chrome layer with Routes, Vessels and
 * Bookings (sidebar, topbar, page header, table primitives, modal shell,
 * embedded logos, text measurement); tickets-only code starts at "T1.".
 *
 * Both sub-page tables are px-6 / py-4 / thead py-3 with a sticky actions
 * column, so the shared CELL_PAD_X, ROW_H, THEAD_H, ACTIONS_W, layoutColumns,
 * routeCell, copyableId, departureW and buildStickyActions are reused as-is.
 *
 * Measurements are real CSS pixels at 1440x900. globals.css sets
 * html { font-size: 17px }, so rem utilities are 17px-based (px-6 = 25.5,
 * py-4 = 17), and the type-scale layer lifts arbitrary text-[Npx] ~1px.
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

/* ── T1. Tickets tokens, icons, seed data ──────────────────────────────── */

const C2 = {
  yellow700b: '#A16207', amber800: '#92400E', gray700: '#374151',
};

const RELAXED = 1.625;

// ticketStatusTone / ticketStatusLabel — lib/bookings-data.ts. Drives the
// passenger table; "To Refund" surfaces as "For Refund".
const T_TONE = {
  Pending:   { bg: C.yellow50,   fg: C.yellow700,  label: 'Pending'    },
  Issued:    { bg: C.emerald100, fg: C.emerald800, label: 'Issued'     },
  Cancelled: { bg: C.slate100,   fg: C.slate500,   label: 'Cancelled'  },
  ToRefund:  { bg: C.amber50,    fg: C2.amber800,  label: 'For Refund' },
  Refunded:  { bg: C.slate100,   fg: C.slate500,   label: 'Refunded'   },
};

// The VEHICLE table shows the parent BOOKING's status, not a ticket status —
// a booking carries at most one vehicle, so the two are the same record.
const B_TONE = {
  Pending:   { bg: C.yellow50,   fg: C.yellow700,  label: 'Pending'      },
  Confirmed: { bg: C.emerald100, fg: C.emerald800, label: 'Confirmed'    },
  Submitted: { bg: C.brand50,    fg: C.brand700,   label: 'Under Review' },
  Cancelled: { bg: C.slate100,   fg: C.slate500,   label: 'Cancelled'    },
  ToRefund:  { bg: C.amber50,    fg: C2.amber800,  label: 'For Refund'   },
  Refunded:  { bg: C.slate100,   fg: C.slate500,   label: 'Refunded'     },
};

const TI = {
  viewBooking: { sw: 1.75, d: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>' },
  edit:        { sw: 1.75, d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  markIssued:  { sw: 1.75, d: '<path d="M5 12l5 5 9-11"/>' },
  refund:      { sw: 1.75, d: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>' },
  cancelX:     { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
  sortUpDown:  { sw: 2,    d: '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>' },
  chevDown:    { sw: 2,    d: '<path d="m6 9 6 6 6-6"/>' },
  closeX:      { sw: 1.75, d: '<path d="M6 6l12 12M18 6 6 18"/>' },
  comped:      { sw: 2,    d: '<path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z"/><path d="M5 14V8a1 1 0 0 1 1-1h7l5 4"/>' },
  removedPax:  { sw: 2,    d: '<circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><path d="M16 11h5"/>' },
  inbox:       { sw: 1.5,  d: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>' },
  selectCheck: { sw: 2.5,  d: '<path d="M5 12l5 5 9-11"/>' },
  plusSmall:   { sw: 1.8,  d: '<path d="M12 5v14M5 12h14"/>' },
  infoCircle:  { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>' },
  cancelSlash: { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
  docCheck:    { sw: 1.75, d: '<path d="M20 6 9 17l-5-5"/>' },
  docMissing:  { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>' },
};

/**
 * Seed rows. Like the Bookings plugin — and unlike Routes and Vessels — these
 * are representative rather than byte-exact: both pages flatten whatever
 * `deriveBookings()` produced, which is generated from the voyages store.
 * The vocabulary (FIRST_NAMES / LAST_NAMES, `TKT-####` refs, the fleet, the
 * port pairs, the fare classes) is real; the specific rows are not.
 */
const PAX_TICKETS = [
  { no: 'T2026-0451', st: 'Issued',   name: 'Camille Torres',  ref: 'TKT-0017', oc: 'MNL', ocity: 'Manila',        dc: 'CEB', dcity: 'Cebu City',       dep: 'Aug 18', tm: '19:00', cls: 'Business', amt: '₱2,650' },
  { no: 'T2026-0452', st: 'Issued',   name: 'Miguel Torres',   ref: 'TKT-0017', oc: 'MNL', ocity: 'Manila',        dc: 'CEB', dcity: 'Cebu City',       dep: 'Aug 18', tm: '19:00', cls: 'Tourist',  amt: '₱2,310' },
  { no: null,         st: 'ToRefund', name: 'Sofia Torres',    ref: 'TKT-0017', oc: 'MNL', ocity: 'Manila',        dc: 'CEB', dcity: 'Cebu City',       dep: 'Aug 18', tm: '19:00', cls: 'Economy',  amt: '₱2,090' },
  { no: null,         st: 'Refunded', name: 'Diego Torres',    ref: 'TKT-0017', oc: 'MNL', ocity: 'Manila',        dc: 'CEB', dcity: 'Cebu City',       dep: 'Aug 18', tm: '19:00', cls: 'Economy',  amt: '₱2,190' },
  { no: 'T2026-0448', st: 'Issued',   name: 'Andrea Lim',      ref: 'TKT-0016', oc: 'BAT', ocity: 'Batangas City', dc: 'CAL', dcity: 'Calapan City',    dep: 'Aug 17', tm: '06:00', cls: 'Economy',  amt: '₱1,590' },
  { no: null,         st: 'Pending',  name: 'Rafael Lim',      ref: 'TKT-0016', oc: 'BAT', ocity: 'Batangas City', dc: 'CAL', dcity: 'Calapan City',    dep: 'Aug 17', tm: '06:00', cls: 'Economy',  comped: true },
  { no: 'T2026-0440', st: 'Issued',   name: 'Sofia Navarro',   ref: 'TKT-0015', oc: 'CEB', ocity: 'Cebu City',     dc: 'DVO', dcity: 'Davao City',      dep: 'Aug 16', tm: '21:00', cls: 'Tourist',  amt: '₱2,550' },
  { no: 'T2026-0441', st: 'Issued',   name: 'Noel Navarro',    ref: 'TKT-0015', oc: 'CEB', ocity: 'Cebu City',     dc: 'DVO', dcity: 'Davao City',      dep: 'Aug 16', tm: '21:00', cls: 'Economy',  amt: '₱2,550' },
  { no: null,         st: 'Pending',  name: 'Bianca Diaz',     ref: 'TKT-0014', oc: 'MNL', ocity: 'Manila',        dc: 'PPS', dcity: 'Puerto Princesa', dep: 'Aug 20', tm: '18:00', cls: 'Economy',  amt: '₱2,700' },
  { no: null,         st: 'Pending',  name: 'Diego Pascual',   ref: 'TKT-0014', oc: 'MNL', ocity: 'Manila',        dc: 'PPS', dcity: 'Puerto Princesa', dep: 'Aug 20', tm: '18:00', cls: 'Economy',  amt: '₱2,700' },
  { no: 'T2026-0431', st: 'Issued',   name: 'Noel Castro',     ref: 'TKT-0012', oc: 'CEB', ocity: 'Cebu City',     dc: 'TAG', dcity: 'Tagbilaran City', dep: 'Aug 15', tm: '11:00', cls: 'Economy',  amt: '₱1,430' },
  { no: 'T2026-0432', st: 'Issued',   name: 'Patricia Castro', ref: 'TKT-0012', oc: 'CEB', ocity: 'Cebu City',     dc: 'TAG', dcity: 'Tagbilaran City', dep: 'Aug 15', tm: '11:00', cls: 'Economy',  comped: true },
  { no: 'T2026-0420', st: 'Issued',   name: 'Carlos Mendoza',  ref: 'TKT-0004', oc: 'MNL', ocity: 'Manila',        dc: 'CDO', dcity: 'Cagayan de Oro',  dep: 'Aug 14', tm: '16:00', cls: 'Tourist',  amt: '₱2,700' },
  { no: 'T2026-0421', st: 'Issued',   name: 'Gloria Mendoza',  ref: 'TKT-0004', oc: 'MNL', ocity: 'Manila',        dc: 'CDO', dcity: 'Cagayan de Oro',  dep: 'Aug 14', tm: '16:00', cls: 'Economy',  amt: '₱2,700' },
  { no: null,         st: 'Cancelled',name: 'Jose Mendoza',    ref: 'TKT-0004', oc: 'MNL', ocity: 'Manila',        dc: 'CDO', dcity: 'Cagayan de Oro',  dep: 'Aug 14', tm: '16:00', cls: 'Economy',  amt: '₱2,700', removed: true },
];

// `query` matches id, bookingRef, name, both port codes and the vessel.
const PAX_SEARCH = PAX_TICKETS.filter((t) => t.ref === 'TKT-0017');
const PAX_SHORT = PAX_TICKETS.slice(0, 5);

const VEHICLE_TICKETS = [
  { no: 'V2026-0090', st: 'Confirmed', who: 'Camille Torres',  ref: 'TKT-0017', make: 'Toyota Vios',      cls: 'Car / SUV',    oc: 'MNL', ocity: 'Manila',        dc: 'CEB', dcity: 'Cebu City',       dep: 'Aug 18, 2026', tm: '7:00 PM',  amt: '₱9,240' },
  { no: null,         st: 'Submitted', who: 'Miguel Ramos',    ref: 'TKT-0016', make: 'Honda Click',      cls: 'Motorcycle',   oc: 'BAT', ocity: 'Batangas City', dc: 'CAL', dcity: 'Calapan City',    dep: 'Aug 17, 2026', tm: '6:00 AM',  amt: '₱3,180' },
  { no: 'V2026-0088', st: 'Confirmed', who: 'Sofia Navarro',   ref: 'TKT-0015', make: 'Isuzu D-Max',      cls: 'Pickup / AUV', oc: 'CEB', ocity: 'Cebu City',     dc: 'DVO', dcity: 'Davao City',      dep: 'Aug 16, 2026', tm: '9:00 PM',  amt: '₱7,650' },
  { no: null,         st: 'Pending',   who: 'Diego Pascual',   ref: 'TKT-0014', make: 'Mitsubishi L300', cls: 'Light Truck',  oc: 'MNL', ocity: 'Manila',        dc: 'PPS', dcity: 'Puerto Princesa', dep: 'Aug 20, 2026', tm: '6:00 PM',  amt: '₱5,400' },
  { no: 'V2026-0081', st: 'Confirmed', who: 'Noel Castro',     ref: 'TKT-0012', make: 'Suzuki Ertiga',    cls: 'Car / SUV',    oc: 'CEB', ocity: 'Cebu City',     dc: 'TAG', dcity: 'Tagbilaran City', dep: 'Aug 15, 2026', tm: '11:00 AM', amt: '₱2,860' },
  { no: 'V2026-0074', st: 'Confirmed', who: 'Carlos Mendoza',  ref: 'TKT-0004', make: 'Nissan Navara',    cls: 'Pickup / AUV', oc: 'MNL', ocity: 'Manila',        dc: 'CDO', dcity: 'Cagayan de Oro',  dep: 'Aug 14, 2026', tm: '4:00 PM',  amt: '₱8,100' },
  { no: 'V2026-0062', st: 'ToRefund',  who: 'Juan dela Cruz',  ref: 'TKT-0002', make: 'Yamaha Mio',       cls: 'Motorcycle',   oc: 'BAT', ocity: 'Batangas City', dc: 'ODG', dcity: 'Odiongan',        dep: 'Aug 13, 2026', tm: '5:00 AM',  amt: '₱4,320' },
  { no: 'V2026-0055', st: 'Refunded',  who: 'Maria Santos',    ref: 'TKT-0001', make: 'Ford Ranger',      cls: 'Pickup / AUV', oc: 'MNL', ocity: 'Manila',        dc: 'BCD', dcity: 'Bacolod City',    dep: 'Aug 12, 2026', tm: '7:00 PM',  amt: '₱4,700' },
];

const VEH_SEARCH = VEHICLE_TICKETS.filter((v) => v.cls === 'Pickup / AUV');

// The passenger page's six filter fields. The vehicle page has NO filters —
// only a search box.
const PAX_FILTER_FIELDS = [
  { label: 'Route',          value: 'All routes'          },
  { label: 'Vessel',         value: 'All vessels'         },
  { label: 'Status',         value: 'All status'          },
  { label: 'Fare class',     value: 'All classes'         },
  { label: 'Passenger type', value: 'All passenger types' },
  { label: 'Booking date',   kind: 'dateRange', value: 'Jul 14 – Aug 13, 2026' },
];

// TICKET_CANCEL_REASONS — the ticket-level set, added to
// components/CancelConfirmDialog.tsx alongside the booking and route sets.
// Both sub-pages pass it, so passenger and vehicle cancellations now offer the
// same three reasons — and none of the booking or route ones.
const CANCEL_REASONS = [
  'Duplicate Ticket',
  'Invalid/Missing Requirements',
  'Others',
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* ── T2. Metrics — the chassis table primitives already match both tables ─ */

// px-6 / py-4 / thead py-3 / sticky right actions, on both sub-pages. So
// CELL_PAD_X, CELL_PAD_Y, ROW_H, THEAD_H, ACTIONS_W and layoutColumns are
// reused unchanged.
const PAX_MIN_W = 1280;
const VEH_MIN_W = 1120;
const T_TOOLBAR_H = SP.s4 * 2 + (SP.s1_5 * 2 + lh(FS.sm));   // py-4 around py-1.5 controls
const T_SEARCH_W = 306;                                       // w-72

function tPillW(map, key) {
  return measure(map[key].label.toUpperCase(), FS.t10, FONT.semibold, 0.88) + SP.s2 * 2;
}
function tPill(parent, x, y, map, key) {
  const t = map[key];
  const w = tPillW(map, key);
  const h = lh(FS.t10) + SP.s05 * 2;
  const pill = frame(parent, 'Status pill', x, y, w, h, { bg: t.bg, radius: RAD.md });
  text(pill, 'Label', t.label.toUpperCase(), SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: t.fg, tracking: 0.88 });
  return pill;
}

/* ── T3. Shared toolbar — h2 + w-72 search (+ Filters on passengers) ───── */

function buildTicketsToolbar(card, opts) {
  const o = opts || {};
  const tb = frame(card, 'Toolbar', 0, 0, card.width, T_TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, T_TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', o.title, SP.s5, (T_TOOLBAR_H - lh(FS.base)) / 2,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  const ctrlH = SP.s1_5 * 2 + lh(FS.sm);
  const cy = (T_TOOLBAR_H - ctrlH) / 2;
  let rightX = card.width - SP.s5;

  if (o.withFilters) {
    const lw = measure('Filters', FS.t13, FONT.medium);
    let fw = SP.s3 * 2 + 14.875 + SP.s2 + lw;
    if (o.filterCount > 0) fw += SP.s2 + SP.s5;
    const fb = frame(tb, 'Button - Filters', rightX - fw, (T_TOOLBAR_H - SP.s9) / 2, fw, SP.s9,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    icon(fb, 'Icon', I.filters, SP.s3, (SP.s9 - 14.875) / 2, 14.875, C.slate500);
    text(fb, 'Label', 'Filters', SP.s3 + 14.875 + SP.s2, (SP.s9 - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.medium, color: C.slate700 });
    if (o.filterCount > 0) {
      const badge = frame(fb, 'Active count', fw - SP.s3 - SP.s5, (SP.s9 - SP.s5) / 2, SP.s5, SP.s5,
        { bg: C.brand500, radius: RAD.full });
      const bt = text(badge, 'Count', String(o.filterCount), 0, 0,
        { size: FS.t9_5, weight: FONT.semibold, color: C.white });
      centerIn(bt, { x: 0, y: 0, w: SP.s5, h: SP.s5 });
    }
    rightX -= fw + SP.s2;
  }

  const sf = frame(tb, 'Search field', rightX - T_SEARCH_W, cy, T_SEARCH_W, ctrlH, {
    bg: C.white, radius: RAD.lg, stroke: o.query ? C.slate300 : C.slate200,
  });
  if (o.query) rect(sf, 'Focus ring', -2, -2, T_SEARCH_W + 4, ctrlH + 4,
    { bg: C.brand100, radius: RAD.lg, opacity: 0.7 });
  icon(sf, 'Icon · search', I.search, SP.s3, (ctrlH - 17) / 2, 17, C.slate400);
  text(sf, o.query ? 'Query' : 'Placeholder', o.query || o.placeholder,
    SP.s3 + 17 + SP.s2, (ctrlH - lh(FS.sm)) / 2,
    { size: FS.sm, color: o.query ? C.slate900 : C.slate400 });
  return tb;
}

/* ── T4. Shared pager with the rows-per-page control ───────────────────── */

function buildTicketsPager(card, y, opts) {
  const o = opts || {};
  const page = o.page || 1, totalPages = o.totalPages || 1;
  const p = frame(card, 'Pagination', 0, y, card.width, PAGER_H);
  hairline(p, 'Border top', 0, 0, card.width, C.slate100);
  text(p, 'Summary', o.summary, SP.s5, (PAGER_H - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate500 });

  const selH = 29.75;
  const lblW = measure('Per page', FS.t12);
  const valW = measure(String(o.pageSize || 10), FS.t12);
  const selW = SP.s2 * 2 + valW + SP.s2 + 12.75;
  const gx = (card.width - (lblW + SP.s2 + selW)) / 2;
  text(p, 'Per page label', 'Per page', gx, (PAGER_H - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate500 });
  const sel = frame(p, 'Select - Per page', gx + lblW + SP.s2, (PAGER_H - selH) / 2, selW, selH, {
    bg: C.white, radius: RAD.lg, stroke: o.sizeOpen ? C.slate300 : C.slate200,
  });
  if (o.sizeOpen) rect(sel, 'Focus ring', -2, -2, selW + 4, selH + 4,
    { bg: C.brand100, radius: RAD.lg, opacity: 0.7 });
  text(sel, 'Value', String(o.pageSize || 10), SP.s2, (selH - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate700 });
  icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s2 - 12.75, (selH - 12.75) / 2, 12.75, C.slate400);

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

/* ── T5. Passenger tickets table ───────────────────────────────────────── */

const PAX_COL_DEFS = [
  { key: 'no',   label: 'Ticket number',
    width: (t) => t.no ? copyIdWidth(t.no) : measure('—', FS.sm) },
  { key: 'st',   label: 'Status',  width: (t) => tPillW(T_TONE, t.st) },
  { key: 'name', label: 'Passenger', sortable: true,
    width: (t) => Math.max(measure(t.name, FS.t13_5, FONT.semibold, -0.3),
      t.removed ? 12.75 + SP.s1 + measure('Removed by customer', FS.t10_5, FONT.medium) : 0) },
  { key: 'ref',  label: 'Booking ref', width: (t) => copyIdWidth(t.ref) },
  { key: 'rt',   label: 'Route',   width: (t) => routeCellW(t) },
  { key: 'dep',  label: 'Departure', sortable: true, width: (t) => departureW(t) },
  { key: 'cls',  label: 'Class',   width: (t) => measure(t.cls, FS.t12_5, FONT.medium, -0.3) },
  { key: 'amt',  label: 'Amount',
    width: (t) => t.comped
      ? SP.s1_5 * 2 + 10.625 + SP.s1 + measure('COMPED', FS.t10, FONT.semibold, 0.88)
      : measure(t.amt, FS.t12_5, FONT.semibold) },
];

function buildPaxTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 51 * 2 + lh(FS.sm);
  const cardH = T_TOOLBAR_H + THEAD_H + bodyH + PAGER_H;
  const L = layoutColumns(PAX_COL_DEFS, rows.length ? rows : PAX_TICKETS, PAX_MIN_W);
  const cols = L.cols;

  const card = frame(parent, 'Card - All passenger tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  buildTicketsToolbar(card, {
    title: 'All passenger tickets', placeholder: 'Search ticket, passenger, or booking…',
    withFilters: true, query: o.query, filterCount: o.filterCount,
  });

  const scroll = frame(card, 'Table scroll', 0, T_TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', -(o.scrollX || 0), 0, L.width, THEAD_H + bodyH);

  const thead = frame(table, 'Table header', 0, 0, L.width, THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, L.width, C.slate100);
  cols.forEach((c) => {
    const lt = text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + CELL_PAD_X, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    // Passenger and Departure carry a SortIcon — but no onSort handler, so the
    // table can't actually be sorted. See the README.
    if (c.sortable) icon(thead, 'Icon · sort', TI.sortUpDown,
      c.x + CELL_PAD_X + lt.width + SP.s1_5, SP.s3 + (lh(FS.t11) - 12.75) / 2, 12.75, C.slate300);
  });

  const tbody = frame(table, 'Table body', 0, THEAD_H, L.width, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'No results', 'No tickets match your filters.', 0, 0,
      { size: FS.sm, color: C.slate400, width: L.width, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }

  rows.forEach((t, i) => {
    const row = frame(tbody, 'Row · ' + t.name, 0, i * ROW_H, L.width, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    if (o.menuRowIndex === i) {
      row.fills = fill(C.slate50, 0.6);
      rect(row, 'Hover accent', 0, 0, 3, ROW_H, { bg: C.brand500 });
    }
    const mid = (ROW_H - lh(FS.t12_5)) / 2;

    if (t.no) copyableId(row, t.no, cols[0].x + CELL_PAD_X, mid, o.copiedRowIndex === i);
    else text(row, 'Ticket number', '—', cols[0].x + CELL_PAD_X, (ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, color: C.slate300 });

    const ph = lh(FS.t10) + SP.s05 * 2;
    tPill(row, cols[1].x + CELL_PAD_X, (ROW_H - ph) / 2, T_TONE, t.st);

    if (t.removed) {
      const blockH = lh(FS.t13_5) + SP.s05 + lh(FS.t10_5);
      const ny = (ROW_H - blockH) / 2;
      text(row, 'Passenger', t.name, cols[2].x + CELL_PAD_X, ny,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
      icon(row, 'Icon · removed', TI.removedPax, cols[2].x + CELL_PAD_X,
        ny + lh(FS.t13_5) + SP.s05 + 2, 12.75, C.amber700);
      text(row, 'Removed', 'Removed by customer',
        cols[2].x + CELL_PAD_X + 12.75 + SP.s1, ny + lh(FS.t13_5) + SP.s05,
        { size: FS.t10_5, weight: FONT.medium, color: C.amber700 });
    } else {
      text(row, 'Passenger', t.name, cols[2].x + CELL_PAD_X, (ROW_H - lh(FS.t13_5)) / 2,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    }

    copyableId(row, t.ref, cols[3].x + CELL_PAD_X, mid, false);
    routeCell(row, t, cols[4].x + CELL_PAD_X, CELL_PAD_Y);

    const dt = text(row, 'Departure date', t.dep, cols[5].x + CELL_PAD_X, (ROW_H - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', t.tm, cols[5].x + CELL_PAD_X + dt.width + SP.s1_5,
      (ROW_H - lh(FS.t13)) / 2, { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    text(row, 'Class', t.cls, cols[6].x + CELL_PAD_X, (ROW_H - lh(FS.t12_5)) / 2,
      { size: FS.t12_5, weight: FONT.medium, color: C.slate700, tracking: -0.3 });

    // A seat covered by the vehicle fare reads as a sky "Comped" chip rather
    // than ₱0.
    if (t.comped) {
      const label = 'COMPED';
      const cw = SP.s1_5 * 2 + 10.625 + SP.s1 + measure(label, FS.t10, FONT.semibold, 0.88);
      const ch = lh(FS.t10) + SP.s05 * 2;
      const chip = frame(row, 'Comped chip', cols[7].x + CELL_PAD_X, (ROW_H - ch) / 2, cw, ch,
        { bg: C.sky50, radius: RAD.md, stroke: C.sky50 });
      icon(chip, 'Icon', TI.comped, SP.s1_5, (ch - 10.625) / 2, 10.625, C.sky700);
      text(chip, 'Label', label, SP.s1_5 + 10.625 + SP.s1, SP.s05,
        { size: FS.t10, weight: FONT.semibold, color: C.sky700, tracking: 0.88 });
    } else {
      text(row, 'Amount', t.amt, cols[7].x + CELL_PAD_X, mid,
        { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
    }
  });

  buildStickyActions(scroll, rows, bodyH, o.menuRowIndex);
  buildTicketsPager(card, T_TOOLBAR_H + THEAD_H + bodyH, {
    summary: o.pagerSummary, page: o.page || 1, totalPages: o.totalPages || 1,
    pageSize: o.pageSize || 15, sizeOpen: o.sizeOpen,
    overlay: o.shell ? {
      parent: o.shell.frame, ox: MAIN_X + CONTENT_X, oy: TOPBAR_H + CONTENT_Y + o.shell.bodyY,
    } : null,
  });
  return { card: card, cols: cols };
}

/* ── T6. Vehicle tickets table ─────────────────────────────────────────── */

const VEH_COL_DEFS = [
  { key: 'no',   label: 'Ticket number',
    width: (v) => v.no ? copyIdWidth(v.no) : measure('—', FS.sm) },
  { key: 'st',   label: 'Status', width: (v) => tPillW(B_TONE, v.st) },
  { key: 'who',  label: 'Ticketholder',
    width: (v) => measure(v.who, FS.t13_5, FONT.semibold, -0.3) },
  { key: 'ref',  label: 'Booking ref', width: (v) => copyIdWidth(v.ref) },
  { key: 'veh',  label: 'Vehicle & class',
    width: (v) => Math.max(measure(v.make, FS.t13, FONT.semibold, -0.3), measure(v.cls, FS.t11)) },
  { key: 'rt',   label: 'Route', width: (v) => routeCellW(v) },
  { key: 'dep',  label: 'Departure', width: (v) => departureW(v) },
  { key: 'amt',  label: 'Amount', width: (v) => measure(v.amt, FS.t12_5, FONT.semibold) },
];

function buildVehTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 51 * 2 + lh(FS.sm);
  const cardH = T_TOOLBAR_H + THEAD_H + bodyH + PAGER_H;
  const L = layoutColumns(VEH_COL_DEFS, rows.length ? rows : VEHICLE_TICKETS, VEH_MIN_W);
  const cols = L.cols;

  const card = frame(parent, 'Card - All vehicle tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  // No Filters button on this page — search only.
  buildTicketsToolbar(card, {
    title: 'All vehicle tickets', placeholder: 'Search ticket, plate, or booking…',
    withFilters: false, query: o.query,
  });

  const scroll = frame(card, 'Table scroll', 0, T_TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', -(o.scrollX || 0), 0, L.width, THEAD_H + bodyH);

  const thead = frame(table, 'Table header', 0, 0, L.width, THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, L.width, C.slate100);
  cols.forEach((c) => {
    text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + CELL_PAD_X, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  });

  const tbody = frame(table, 'Table body', 0, THEAD_H, L.width, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'No results', 'No vehicle tickets match your search.', 0, 0,
      { size: FS.sm, color: C.slate400, width: L.width, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }

  rows.forEach((v, i) => {
    const row = frame(tbody, 'Row · ' + v.ref, 0, i * ROW_H, L.width, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    if (o.menuRowIndex === i) {
      row.fills = fill(C.slate50, 0.6);
      rect(row, 'Hover accent', 0, 0, 3, ROW_H, { bg: C.brand500 });
    }
    const mid = (ROW_H - lh(FS.t12_5)) / 2;

    if (v.no) copyableId(row, v.no, cols[0].x + CELL_PAD_X, mid, o.copiedRowIndex === i);
    else text(row, 'Ticket number', '—', cols[0].x + CELL_PAD_X, (ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, color: C.slate300 });

    const ph = lh(FS.t10) + SP.s05 * 2;
    tPill(row, cols[1].x + CELL_PAD_X, (ROW_H - ph) / 2, B_TONE, v.st);

    text(row, 'Ticketholder', v.who, cols[2].x + CELL_PAD_X, (ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

    copyableId(row, v.ref, cols[3].x + CELL_PAD_X, mid, false);

    const vy = (ROW_H - (lh(FS.t13) + SP.s05 + lh(FS.t11))) / 2;
    text(row, 'Vehicle', v.make, cols[4].x + CELL_PAD_X, vy,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Vehicle class', v.cls, cols[4].x + CELL_PAD_X, vy + lh(FS.t13) + SP.s05,
      { size: FS.t11, color: C.slate400 });

    routeCell(row, v, cols[5].x + CELL_PAD_X, CELL_PAD_Y);

    const dt = text(row, 'Departure date', v.dep, cols[6].x + CELL_PAD_X, (ROW_H - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', v.tm, cols[6].x + CELL_PAD_X + dt.width + SP.s1_5,
      (ROW_H - lh(FS.t13)) / 2, { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    text(row, 'Amount', v.amt, cols[7].x + CELL_PAD_X, mid,
      { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
  });

  buildStickyActions(scroll, rows, bodyH, o.menuRowIndex);
  buildTicketsPager(card, T_TOOLBAR_H + THEAD_H + bodyH, {
    summary: o.pagerSummary, page: o.page || 1, totalPages: o.totalPages || 1,
    pageSize: o.pageSize || 10, sizeOpen: o.sizeOpen,
    overlay: o.shell ? {
      parent: o.shell.frame, ox: MAIN_X + CONTENT_X, oy: TOPBAR_H + CONTENT_Y + o.shell.bodyY,
    } : null,
  });
  return { card: card, cols: cols };
}

/* ── T7. Row menus ─────────────────────────────────────────────────────── */

const T_MENU_TONE = {
  default: { label: C.slate700, icon: C.slate400 },
  danger:  { label: C.rose600,  icon: C.rose500  },
};

/**
 * Passenger row menu — five items. Every one of them uses the legacy `danger`
 * shorthand or no tone at all; `tone` is never passed on this page, so Mark
 * Issued and Refund render in the default slate.
 */
function paxMenuItems(st, editable) {
  return [
    { label: 'View booking',   ic: TI.viewBooking },
    { label: 'Edit passenger', ic: TI.edit, disabled: editable === false },
    { label: 'Mark Issued',    ic: TI.markIssued,
      disabled: st === 'Cancelled' || st === 'Refunded' || st === 'Issued' },
    { label: 'Refund',         ic: TI.refund, disabled: st !== 'ToRefund' },
    { label: 'Cancel ticket',  ic: TI.cancelX, tone: 'danger',
      disabled: st === 'ToRefund' || st === 'Refunded' },
  ];
}

/** Vehicle row menu — four items, gated on the parent BOOKING's status. */
function vehMenuItems(st) {
  return [
    { label: 'View booking',  ic: TI.viewBooking },
    { label: 'Edit vehicle',  ic: TI.edit,
      disabled: st === 'ToRefund' || st === 'Refunded' || st === 'Cancelled' },
    { label: 'Cancel ticket', ic: TI.cancelX, tone: 'danger',
      disabled: st === 'ToRefund' || st === 'Refunded' || st === 'Submitted' },
    { label: 'Refund',        ic: TI.refund, disabled: st !== 'ToRefund' },
  ];
}

function buildTicketMenu(parent, triggerX, triggerY, items) {
  const W = 221;
  const ITEM_H = SP.s1_5 * 2 + lh(FS.t13);
  const H = SP.s1 * 2 + items.length * ITEM_H;
  const below = triggerY + 29.75 + 6;
  const my = (below + H > FRAME_H - 8) ? triggerY - 6 - H : below;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, my, W, H, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.8, clip: true, shadow: MENU_SHADOW,
  });
  items.forEach((it, i) => {
    const tone = T_MENU_TONE[it.tone || 'default'];
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H,
      { radius: RAD.md });
    icon(tile, 'Icon', it.ic, SP.s2_5, (ITEM_H - 17) / 2, 17,
      it.disabled ? C.slate300 : tone.icon);
    text(tile, 'Label', it.label, SP.s2_5 + 17 + SP.s2_5, SP.s1_5,
      { size: FS.t13, weight: FONT.medium, color: it.disabled ? C.slate400 : tone.label });
  });
  return menu;
}

function ticketMenuAnchor(shell, rowIndex) {
  return {
    x: MAIN_X + CONTENT_X + CONTENT_W - ACTIONS_W + CELL_PAD_X,
    y: TOPBAR_H + CONTENT_Y + shell.bodyY + T_TOOLBAR_H + THEAD_H
       + rowIndex * ROW_H + (ROW_H - 29.75) / 2,
  };
}

/* ── T8. Shared detail-dialog parts ────────────────────────────────────── */

/** The 48×12 dashed arrow both detail dialogs use between the port codes. */
function dashArrow(parent, x, y) {
  const g = frame(parent, 'Dashed arrow', x, y, 42.5, 12.75);
  const r = rect(g, 'Line', 0, 6, 32, 1, { bg: C.slate300 });
  r.dashPattern = [3, 3];
  icon(g, 'Head', { sw: 1.5, d: '<path d="M9 4 L15 12 L9 20"/>' }, 30, 0, 12.75, C.slate300);
  return g;
}

/**
 * Route summary card — identical anatomy on both detail dialogs: 20px port
 * codes, dashed arrows either side of the line avatar, then a 2-up meta row.
 * `etd` renders only on the passenger dialog, and only while Issued.
 */
function routeSummaryCard(parent, x, y, w, r, etd) {
  const codeH = lh(21);
  const topH = SP.s4 + codeH + SP.s05 + lh(FS.t11) + (etd ? SP.s3 + lh(FS.t11) : 0) + SP.s3;
  const metaH = SP.s3 * 2 + lh(FS.t10) + SP.s1 + lh(FS.t12_5) + SP.s05 + lh(FS.t11_5);
  const card = frame(parent, 'Route summary', x, y, w, topH + metaH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });

  const side = (w - SP.s5 * 2 - 42.5 * 2 - 60 - SP.s3 * 4) / 2;
  let cx = SP.s5;
  text(card, 'Origin code', r.oc, cx, SP.s4,
    { size: 21, weight: FONT.bold, color: C.slate900, tracking: 1.26, width: side, align: 'CENTER' });
  text(card, 'Origin city', r.ocity, cx, SP.s4 + codeH + SP.s05,
    { size: FS.t11, color: C.slate500, width: side, align: 'CENTER' });
  cx += side + SP.s3;
  dashArrow(card, cx, SP.s4 + (codeH - 12.75) / 2);
  cx += 42.5 + SP.s3;
  logoTile(card, cx + (60 - 32) / 2, SP.s4, 32);
  text(card, 'Line name', LINE.name, cx - 30, SP.s4 + 32 + SP.s1,
    { size: FS.t9_5, weight: FONT.medium, color: C.slate500, width: 120, align: 'CENTER' });
  cx += 60 + SP.s3;
  dashArrow(card, cx, SP.s4 + (codeH - 12.75) / 2);
  cx += 42.5 + SP.s3;
  text(card, 'Destination code', r.dc, cx, SP.s4,
    { size: 21, weight: FONT.bold, color: C.slate900, tracking: 1.26, width: side, align: 'CENTER' });
  text(card, 'Destination city', r.dcity, cx, SP.s4 + codeH + SP.s05,
    { size: FS.t11, color: C.slate500, width: side, align: 'CENTER' });

  if (etd) text(card, 'ETD', '( ' + etd + ' )', 0, SP.s4 + codeH + SP.s05 + lh(FS.t11) + SP.s3,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, width: w, align: 'CENTER' });

  const meta = frame(card, 'Meta row', 0, topH, w, metaH);
  hairline(meta, 'Border top', 0, 0, w, C.slate100);
  rect(meta, 'Divider', w / 2, 0, 1, metaH, { bg: C.slate100 });
  [['Departure', r.dep, r.tm], ['Vessel', r.ves, null]].forEach((m, i) => {
    const mx = i * (w / 2) + SP.s4;
    text(meta, 'Label', m[0].toUpperCase(), mx, SP.s3,
      { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
    text(meta, 'Value', m[1], mx, SP.s3 + lh(FS.t10) + SP.s1,
      { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    if (m[2]) text(meta, 'Sub', m[2], mx, SP.s3 + lh(FS.t10) + SP.s1 + lh(FS.t12_5) + SP.s05,
      { size: FS.t11_5, weight: FONT.medium, color: C.slate600 });
  });
  return topH + metaH;
}

/** "Label / value" pair used across both dialogs' detail grids. */
function metaPair(parent, x, y, w, label, value, sub, muted) {
  text(parent, 'Label', label, x, y, { size: FS.t10_5, color: C.slate500 });
  text(parent, 'Value', value, x, y + lh(FS.t10_5) + SP.s05, {
    size: FS.t12_5, weight: FONT.semibold, color: muted ? C.slate300 : C.slate900,
    tracking: -0.3, width: w,
  });
  if (sub) text(parent, 'Sub', sub, x, y + lh(FS.t10_5) + SP.s05 + lh(FS.t12_5) + SP.s05,
    { size: FS.t11_5, weight: FONT.medium, color: C.slate500 });
  return lh(FS.t10_5) + SP.s05 + lh(FS.t12_5) + (sub ? SP.s05 + lh(FS.t11_5) : 0);
}

/**
 * Requirement row — TicketRequirementRow (passenger dialog) and VehicleDocRow
 * (vehicle dialog). Both are a 40px thumbnail, a two-line label (name over a
 * muted REQUIRED caption), and a status chip pushed to the right edge.
 *
 * The two differ in small ways, faithfully reproduced here:
 *   ticket  — li flex justify-between gap-2.5, no padding; label font-medium at
 *             12.5px; an un-uploaded slot gets a DASHED ring and a rose
 *             "Missing" chip (slate "Not provided" when the doc is optional)
 *   vehicle — li gap-3 rounded-lg px-1 py-1.5; label 13px semibold; the thumb
 *             tile is always solid slate-100 with a solid ring, and a missing
 *             doc gets a slate "Missing" chip, never rose
 *
 * The real rows render the uploaded photo itself; the plugin has no access to
 * those URLs, so an uploaded slot is drawn as a filled tile with the same photo
 * glyph the component falls back to.
 */
const REQ_THUMB = 42.5;                              // h-10 w-10

function requirementRowH(variant) {
  return (variant === 'vehicle' ? SP.s1_5 * 2 : 0) + REQ_THUMB;
}

function requirementRow(parent, x, y, w, label, uploaded, opts) {
  const o = opts || {};
  const vehicle = o.variant === 'vehicle';
  const required = o.required !== false;
  const padY = vehicle ? SP.s1_5 : 0;
  const padX = vehicle ? SP.s1 : 0;
  const gap = vehicle ? SP.s3 : SP.s2_5;
  const labelSize = vehicle ? FS.t13 : FS.t12_5;
  const labelWeight = vehicle ? FONT.semibold : FONT.medium;
  const h = requirementRowH(o.variant);

  const row = frame(parent, 'Requirement · ' + label, x, y, w, h,
    vehicle ? { radius: RAD.lg } : {});

  /* Thumbnail — the photo when uploaded, an empty-slot glyph when not. */
  const thumb = frame(row, uploaded ? 'Thumbnail' : 'Empty slot',
    padX, padY, REQ_THUMB, REQ_THUMB, {
      bg: vehicle ? C.slate100 : (uploaded ? C.slate200 : C.slate50),
      radius: RAD.md,
      stroke: C.slate200,
      // ring-dashed on an un-uploaded passenger slot.
      dash: (!vehicle && !uploaded) ? [3, 3] : undefined,
    });
  icon(thumb, 'Icon', uploaded ? I.photo : I.imageDash,
    (REQ_THUMB - 17) / 2, (REQ_THUMB - 17) / 2, 17,
    uploaded ? C.slate400 : C.slate300);

  /* Chip — measured first so the label can be truncated against it. */
  const chipLabel = uploaded ? 'UPLOADED' : (required && !vehicle ? 'MISSING'
    : vehicle ? 'MISSING' : 'NOT PROVIDED');
  const chipBg = uploaded ? C.emerald50
    : (required && !vehicle ? C.rose50 : C.slate100);
  const chipFg = uploaded ? C.emerald700
    : (required && !vehicle ? C.rose600 : C.slate500);
  const chipH = lh(FS.t10) + SP.s05 * 2;
  const chipW = SP.s2 * 2 + (uploaded ? 12.75 + SP.s1 : 0)
    + measure(chipLabel, FS.t10, FONT.semibold, 0.88);
  const chip = frame(row, 'Status chip', w - padX - chipW, (h - chipH) / 2, chipW, chipH,
    { bg: chipBg, radius: RAD.md });
  let cx = SP.s2;
  if (uploaded) {
    icon(chip, 'Icon · check', TI.markIssued, cx, (chipH - 12.75) / 2, 12.75, chipFg);
    cx += 12.75 + SP.s1;
  }
  text(chip, 'Label', chipLabel, cx, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: chipFg, tracking: 0.88 });

  /* Two-line label block. */
  const tx = padX + REQ_THUMB + gap;
  const blockH = lh(labelSize) + lh(FS.t10);
  const ty = (h - blockH) / 2;
  text(row, 'Label', label, tx, ty, {
    size: labelSize, weight: labelWeight, color: C.slate900, tracking: -0.3,
    width: w - tx - padX - chipW - SP.s3,
  });
  text(row, 'Required', 'REQUIRED', tx, ty + lh(labelSize),
    { size: FS.t10, weight: FONT.medium, color: C.slate400, tracking: 0.88 });
  return h;
}

/**
 * The Update-status menu both detail dialogs share: `absolute bottom-full
 * right-0 mb-2 w-56 p-1`, an `UPDATE STATUS` eyebrow, then one row per option
 * with a tone chip naming where the record lands. Cancel is rose and its chip
 * reads "For Refund".
 */
function updateStatusMenu(parent, rightX, bottomY, opts, tones) {
  const W = 238;                                     // w-56
  const optH = SP.s2 * 2 + lh(FS.t12_5);
  const eyebrowH = SP.s2 * 2 + lh(FS.t10);
  const H = SP.s1 * 2 + eyebrowH + opts.length * optH;
  const menu = frame(parent, 'Update status menu', rightX - W, bottomY - H - SP.s2, W, H, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7,
    clip: true, shadow: MENU_SHADOW,
  });
  text(menu, 'Eyebrow', 'UPDATE STATUS', SP.s1 + SP.s2, SP.s1 + SP.s2,
    { size: FS.t10, weight: FONT.medium, color: C.slate400, tracking: 0.88 });
  opts.forEach((o, i) => {
    const isCancel = o.cancel;
    const row = frame(menu, 'Option · ' + o.label, SP.s1, SP.s1 + eyebrowH + i * optH,
      W - SP.s2, optH, { radius: RAD.md });
    text(row, 'Label', o.label, SP.s2, SP.s2, {
      size: FS.t12_5, weight: FONT.medium,
      color: o.disabled ? C.slate300 : (isCancel ? C.rose600 : C.slate700),
    });
    const tone = tones[o.tone];
    const bg = isCancel ? C.rose50 : tone.bg;
    const fg = isCancel ? C.rose600 : tone.fg;
    const label = tone.label.toUpperCase();
    const cw = measure(label, FS.t9_5, FONT.semibold, 0.84) + SP.s1_5 * 2;
    const ch = lh(FS.t9_5) + SP.s05 * 2;
    const chip = frame(row, 'Tone chip', W - SP.s2 - SP.s2 - cw, (optH - ch) / 2, cw, ch,
      { bg: bg, radius: 4 });
    if (o.disabled) chip.opacity = 0.5;
    text(chip, 'Label', label, SP.s1_5, SP.s05,
      { size: FS.t9_5, weight: FONT.semibold, color: fg, tracking: 0.84 });
  });
  return menu;
}

/** Footer shared by both detail dialogs: Close · Go to booking · Update status. */
function detailFooter(parent, W, H, footH) {
  const btnH = SP.s1_5 * 2 + lh(FS.t12_5);
  const foot = frame(parent, 'Footer', 0, H - footH, W, footH, { bg: C.slate50, opacity: 0.6 });
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const cw = SP.s3 * 2 + measure('Close', FS.t12_5, FONT.medium);
  const cb = frame(foot, 'Button - Close', SP.s6, by, cw, btnH, { radius: RAD.lg });
  text(cb, 'Label', 'Close', SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });

  const upW = SP.s3 * 2 + measure('UPDATE STATUS', FS.t12_5, FONT.semibold, 0.5) + SP.s2 + 12.75;
  const up = frame(foot, 'Button - Update status', W - SP.s6 - upW, by, upW, btnH,
    { bg: C.brand500, radius: RAD.lg });
  text(up, 'Label', 'UPDATE STATUS', SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white, tracking: 0.5 });
  icon(up, 'Icon · chevron', TI.chevDown, upW - SP.s3 - 12.75, (btnH - 12.75) / 2, 12.75, C.white);

  const gw = SP.s3 * 2 + measure('Go to booking', FS.t12_5, FONT.medium);
  const gb = frame(foot, 'Button - Go to booking', W - SP.s6 - upW - SP.s2 - gw, by, gw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(gb, 'Label', 'Go to booking', SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });
  return foot;
}

/* ── T9. TicketDetailDialog (passengers) ───────────────────────────────── */

const PAX_DLG_W = 714;                               // max-w-2xl
const PAX_DLG_H = 810;                               // max-h-[90vh]

/** canPick() from StatusPicker — simpler than the booking picker's. */
const PAX_STATUS_OPTIONS = [
  { value: 'Issued',    tone: 'Issued',    label: 'Mark Issued'   },
  { value: 'Refunded',  tone: 'Refunded',  label: 'Refund'        },
  { value: 'Cancelled', tone: 'ToRefund',  label: 'Cancel ticket', cancel: true },
];

function paxCanPick(s, current) {
  if (s === current) return false;
  if (current === 'Refunded') return false;
  if (s === 'Refunded') return current === 'ToRefund';
  if (current === 'ToRefund') return false;
  return true;
}

function paxStatusMenuOptions(current) {
  return PAX_STATUS_OPTIONS
    .filter((o) => o.value !== current)
    .map((o) => ({ label: o.label, tone: o.tone, cancel: o.cancel,
                   disabled: !paxCanPick(o.value, current) }));
}

/** opts: { status, statusMenuOpen } */
function buildTicketDetailDialog(parent, opts) {
  const o = opts || {};
  const st = o.status || 'Issued';
  const W = PAX_DLG_W, H = PAX_DLG_H;
  const issued = st === 'Issued';
  const number = issued ? 'T2026-0451' : null;

  // This dialog rolls its own black/55 scrim rather than using Modal's black/30.
  buildScrim(parent, 0.55);
  const dlg = frame(parent, 'Dialog - Ticket detail',
    (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
      bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7,
      clip: true, shadow: DIALOG_SHADOW,
    });

  /* Header — px-6 py-5 */
  const pillH = lh(FS.t10) + SP.s05 * 2;
  const headBlock = Math.max(pillH, SP.s5) + SP.s1_5 + lh(FS.t17) + SP.s05 + lh(FS.t11);
  const headH = SP.s5 * 2 + headBlock;
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  let hx = SP.s6;
  if (number) {
    copyableId(head, number, hx, SP.s5, false);
    hx += copyIdWidth(number) + SP.s2;
  } else {
    const nt = text(head, 'No number', 'No ticket number yet', hx, SP.s5,
      { size: FS.t12_5, weight: FONT.semibold, color: C.slate400, tracking: 0.54 });
    hx += nt.width + SP.s2;
  }
  // The header pill renders the RAW status value, not ticketStatusLabel — so a
  // "To Refund" ticket reads "TO REFUND" here and "FOR REFUND" in the table.
  tPill(head, hx, SP.s5, T_TONE, st);
  text(head, 'Passenger', 'Camille Torres', SP.s6, SP.s5 + Math.max(pillH, SP.s5) + SP.s1_5,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  const bref = 'TKT-0017';
  const ub = text(head, 'Under booking', 'Under booking ' + bref, SP.s6,
    SP.s5 + Math.max(pillH, SP.s5) + SP.s1_5 + lh(FS.t17) + SP.s05,
    { size: FS.t11, color: C.slate500 });
  ub.setRangeFills(14, 14 + bref.length, fill(C.slate700));
  ub.setRangeFontName(14, 14 + bref.length, { family: FONT.family, style: FONT.medium });
  const close = frame(head, 'Button - Close', W - SP.s6 - SP.s8, SP.s5, SP.s8, SP.s8,
    { radius: RAD.full });
  icon(close, 'Icon', TI.closeX, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.slate400);

  const btnH = SP.s1_5 * 2 + lh(FS.t12_5);
  const footH = SP.s3_5 * 2 + btnH;
  detailFooter(dlg, W, H, footH);

  /* Body — px-6 py-5, space-y-5 */
  const bodyH = H - headH - footH;
  const body = frame(dlg, 'Body', 0, headH, W, bodyH, { clip: true });
  const iw = W - SP.s6 * 2;
  let cy = SP.s5;

  cy += routeSummaryCard(body, SP.s6, cy, iw, {
    oc: 'MNL', ocity: 'Manila', dc: 'CEB', dcity: 'Cebu City',
    dep: 'Aug 18', tm: '19:00', ves: 'MV Palawan Breeze',
  }, issued ? 'Departs in 5 days' : null) + SP.s5;

  /* Passenger card — 2-col dl, 8 pairs incl. the new Operator ticket */
  const pairH = lh(FS.t10_5) + SP.s05 + lh(FS.t12_5);
  const idPairH = pairH + SP.s05 + lh(FS.t11_5);
  const rowsY = [0, pairH + SP.s3, (pairH + SP.s3) * 2, (pairH + SP.s3) * 3];
  const paxH = SP.s4 * 2 + lh(FS.t11) + SP.s2 + rowsY[3] + idPairH;
  const pc = frame(body, 'Passenger card', SP.s6, cy, iw, paxH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  text(pc, 'Label', 'PASSENGER', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const cellW = (iw - SP.s4 * 2 - SP.s4) / 2;
  const gy = SP.s4 + lh(FS.t11) + SP.s2;
  [['Ticket number', number || '—', null, !number],
   ['Operator ticket', '—', null, true],
   ['Gender', 'F', null, false],
   ['Age', '34', null, false],
   ['Nationality', 'Filipino', null, false],
   ['ID', 'Philippine Passport', 'P1234567A', false],
   ['Phone (Optional)', '+63 9171234567', null, false],
   ['Email (Optional)', 'Camille.torres@example.com', null, false]].forEach((d, k) => {
    metaPair(pc, SP.s4 + (k % 2) * (cellW + SP.s4), gy + rowsY[Math.floor(k / 2)],
      cellW, d[0], d[1], d[2], d[3]);
  });
  cy += paxH + SP.s5;

  /* Valid ID photos — p-4 card, label, then a space-y-1.5 list. */
  const reqH = requirementRowH();
  const photosH = SP.s4 * 2 + lh(FS.t11) + SP.s2 + reqH * 2 + SP.s1_5;
  const ph2 = frame(body, 'Valid ID photos', SP.s6, cy, iw, photosH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  text(ph2, 'Label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const reqY = SP.s4 + lh(FS.t11) + SP.s2;
  requirementRow(ph2, SP.s4, reqY, iw - SP.s4 * 2,
    'Philippine Passport — Front', true);
  requirementRow(ph2, SP.s4, reqY + reqH + SP.s1_5, iw - SP.s4 * 2,
    'Philippine Passport — Back', false);
  cy += photosH + SP.s5;

  /* Payment information */
  const payHeadH = SP.s2_5 * 2 + lh(FS.t11);
  const payH = payHeadH + SP.s3 * 2 + pairH + SP.s3 + lh(FS.t12_5) + SP.s3 + lh(FS.t13);
  const pay = frame(body, 'Payment information', SP.s6, cy, iw, payH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  const pHead = frame(pay, 'Header', 0, 0, iw, payHeadH, { bg: C.slate50, opacity: 0.6 });
  hairline(pHead, 'Border bottom', 0, payHeadH - 1, iw, C.slate100);
  text(pHead, 'Label', 'PAYMENT INFORMATION', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const psTone = issued ? T_TONE.Issued : T_TONE[st];
  const psw = measure(psTone.label.toUpperCase(), FS.t10, FONT.semibold, 0.88) + SP.s1_5 * 2;
  const psh = lh(FS.t10) + SP.s05 * 2;
  const ps = frame(pHead, 'Pay status', iw - SP.s4 - psw, (payHeadH - psh) / 2, psw, psh,
    { bg: psTone.bg, radius: RAD.md });
  text(ps, 'Label', psTone.label.toUpperCase(), SP.s1_5, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: psTone.fg, tracking: 0.88 });
  metaPair(pay, SP.s4, payHeadH + SP.s3, cellW, 'Booked on', 'Aug 12, 2026', null, false);
  const fy = payHeadH + SP.s3 + pairH + SP.s3;
  text(pay, 'Fare label', 'Business fare', SP.s4, fy,
    { size: FS.t12_5, color: C.slate600 });
  const fv = text(pay, 'Fare', '₱2,650', 0, fy, { size: FS.t12_5, weight: FONT.medium, color: C.slate900 });
  fv.x = iw - SP.s4 - fv.width;
  const ty = fy + lh(FS.t12_5) + SP.s3;
  hairline(pay, 'Total divider', SP.s4, ty - SP.s1_5, iw - SP.s4 * 2, C.slate100);
  text(pay, 'Total label', 'TOTAL AMOUNT', SP.s4, ty,
    { size: FS.t10_5, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  const tv = text(pay, 'Total', '₱2,650', 0, ty, { size: FS.t13, weight: FONT.bold, color: C.slate900 });
  tv.x = iw - SP.s4 - tv.width;
  cy += payH + SP.s5;

  if (cy > bodyH) {
    const trackH = bodyH * (bodyH / cy);
    rect(body, 'Scrollbar', W - 8, 2, 4, trackH - 4,
      { bg: C.slate300, radius: RAD.full, opacity: 0.8 });
  }

  if (o.statusMenuOpen) {
    updateStatusMenu(parent, dlg.x + W - SP.s6, dlg.y + H - footH,
      paxStatusMenuOptions(st), T_TONE);
  }
  return dlg;
}

/* ── T10. VehicleDetailDialog ──────────────────────────────────────────── */

const VEH_DLG_W = 612;                               // max-w-xl → 36rem × 17px
const VEH_DLG_H = 792;                               // max-h-[88vh]

/** opts: { status, statusMenuOpen } */
function buildVehicleDetailDialog(parent, opts) {
  const o = opts || {};
  const st = o.status || 'Confirmed';
  const W = VEH_DLG_W, H = VEH_DLG_H;
  const number = (st === 'Pending' || st === 'Submitted') ? null : 'V2026-0090';

  const dlg = buildModal(parent, 'Dialog - Vehicle ticket detail', W, H, false);

  const pillH = lh(FS.t10) + SP.s05 * 2;
  const headBlock = Math.max(pillH, SP.s5) + SP.s1_5 + lh(FS.t17) + SP.s05 + lh(FS.t11);
  const headH = SP.s5 * 2 + headBlock;
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  const idText = number || 'TKT-0017-V';
  const it = text(head, 'Ticket number', idText, SP.s6, SP.s5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  tPill(head, SP.s6 + it.width + SP.s2, SP.s5, B_TONE, st);
  // The heading renders the contact EMAIL, not the ticketholder name the table
  // shows in its own "Ticketholder" column.
  text(head, 'Ticketholder', 'Camille.torres@example.com', SP.s6,
    SP.s5 + Math.max(pillH, SP.s5) + SP.s1_5,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  // The dialog shows bookingRefNo (the operator-assigned reference) when the
  // booking has one, falling back to the system ref.
  const bref = 'BREF2026-0089';
  const ub = text(head, 'Under booking', 'Under booking ' + bref, SP.s6,
    SP.s5 + Math.max(pillH, SP.s5) + SP.s1_5 + lh(FS.t17) + SP.s05,
    { size: FS.t11, color: C.slate500 });
  ub.setRangeFills(14, 14 + bref.length, fill(C.slate700));
  ub.setRangeFontName(14, 14 + bref.length, { family: FONT.family, style: FONT.medium });
  const close = frame(head, 'Button - Close', W - SP.s6 - SP.s8, SP.s5, SP.s8, SP.s8,
    { radius: RAD.full });
  icon(close, 'Icon', TI.closeX, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.slate400);

  const btnH = SP.s1_5 * 2 + lh(FS.t12_5);
  const footH = SP.s3_5 * 2 + btnH;
  detailFooter(dlg, W, H, footH);

  const bodyH = H - headH - footH;
  const body = frame(dlg, 'Body', 0, headH, W, bodyH, { clip: true });
  const iw = W - SP.s6 * 2;
  let cy = SP.s5;

  cy += routeSummaryCard(body, SP.s6, cy, iw, {
    oc: 'MNL', ocity: 'Manila', dc: 'CEB', dcity: 'Cebu City',
    dep: 'Aug 18, 2026', tm: '7:00 PM', ves: 'MV Palawan Breeze',
  }, null) + SP.s5;

  /* Vehicle card — header strip + a 2×3 grid */
  const vHeadH = SP.s2_5 * 2 + lh(FS.t11);
  const pairH = lh(FS.t10_5) + SP.s05 + lh(FS.t12_5);
  const vBodyH = SP.s4 * 2 + pairH * 3 + SP.s4 * 2;
  const vc = frame(body, 'Vehicle card', SP.s6, cy, iw, vHeadH + vBodyH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  const vh = frame(vc, 'Header', 0, 0, iw, vHeadH, { bg: C.slate50, opacity: 0.6 });
  hairline(vh, 'Border bottom', 0, vHeadH - 1, iw, C.slate100);
  text(vh, 'Label', 'VEHICLE', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const vCellW = (iw - SP.s4 * 2 - SP.s6) / 2;
  [['Ticket number', number || '—', !number], ['Operator ticket', '—', true],
   ['Make & Model', 'Toyota Vios', false], ['Type', 'Car / SUV', false],
   ['Plate No.', 'ABC 1234', false], ['Year', '2021', false]].forEach((d, k) => {
    metaPair(vc, SP.s4 + (k % 2) * (vCellW + SP.s6),
      vHeadH + SP.s4 + Math.floor(k / 2) * (pairH + SP.s4), vCellW, d[0], d[1], null, d[2]);
  });
  cy += vHeadH + vBodyH + SP.s5;

  /* Valid ID photos — OR / CR / Vehicle photo. px-4 pt-4 label, then a
     space-y-1.5 list with px-4 pb-4 pt-2. */
  const reqH = requirementRowH('vehicle');
  const docsH = SP.s4 + lh(FS.t11) + SP.s2 + reqH * 3 + SP.s1_5 * 2 + SP.s4;
  const dc = frame(body, 'Valid ID photos', SP.s6, cy, iw, docsH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  text(dc, 'Label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const docY = SP.s4 + lh(FS.t11) + SP.s2;
  [['Official Receipt (OR)', true], ['Certificate of Registration (CR)', true],
   ['Vehicle Photo', false]].forEach((d, k) => {
    requirementRow(dc, SP.s4 - SP.s1, docY + k * (reqH + SP.s1_5),
      iw - (SP.s4 - SP.s1) * 2, d[0], d[1], { variant: 'vehicle' });
  });
  cy += docsH + SP.s5;

  if (cy > bodyH) {
    const trackH = bodyH * (bodyH / cy);
    rect(body, 'Scrollbar', W - 8, 2, 4, trackH - 4,
      { bg: C.slate300, radius: RAD.full, opacity: 0.8 });
  }

  // Only two options here — Refund and Cancel ticket. There is no "Mark
  // Issued": a vehicle ticket is numbered when its booking is approved.
  if (o.statusMenuOpen) {
    updateStatusMenu(parent, dlg.x + W - SP.s6, dlg.y + H - footH, [
      { label: 'Refund', tone: 'Refunded', disabled: st !== 'ToRefund' },
      { label: 'Cancel ticket', tone: 'ToRefund', cancel: true,
        disabled: st === 'ToRefund' || st === 'Refunded' || st === 'Submitted' },
    ], B_TONE);
  }
  return dlg;
}

/* ── T11. MarkPaidDialog ───────────────────────────────────────────────── */

const SM_W = 408;                                    // max-w-sm → 24rem × 17px

/** opts: { filled } — the confirm is locked until a ticket number is typed. */
function buildMarkIssuedDialog(parent, opts) {
  const o = opts || {};
  const W = SM_W, PAD = SP.s6, badgeS = SP.s9;
  const inH = SP.s2 * 2 + lh(FS.t13);
  const areaH = SP.s2 * 2 + lh(FS.t13) * 3;
  const labelH = lh(FS.t11) + SP.s1_5;
  const bodyStr = 'Enter the ticket number issued for this passenger.';
  const textW = W - PAD * 2 - badgeS - SP.s3;
  const headBlock = lh(FS.t15_5) + SP.s1 + lh(FS.t12_5);
  const fieldsH = SP.s4 + labelH + inH + SP.s4 + labelH + areaH;
  const footH = SP.s3_5 * 2 + (SP.s1_5 * 2 + lh(FS.sm));
  const H = PAD + Math.max(badgeS, headBlock) + fieldsH + SP.s5 + footH;

  const dlg = buildModal(parent, 'Dialog - Mark as issued', W, H, false);
  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS,
    { bg: C.emerald50, radius: RAD.full, stroke: C.emerald200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', TI.markIssued, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C.emerald600);
  const tx = PAD + badgeS + SP.s3;
  text(dlg, 'Title', 'Mark as issued', tx, PAD,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(dlg, 'Body', bodyStr, tx, PAD + lh(FS.t15_5) + SP.s1,
    { size: FS.t12_5, color: C.slate500, width: textW });

  let fy = PAD + Math.max(badgeS, headBlock) + SP.s4;
  text(dlg, 'Field label', 'TICKET NUMBER', PAD, fy,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const inp = frame(dlg, 'Input - Ticket number', PAD, fy + labelH, W - PAD * 2, inH,
    { bg: C.white, radius: RAD.lg, stroke: o.filled ? C.emerald200 : C.slate200 });
  text(inp, o.filled ? 'Value' : 'Placeholder', o.filled ? 'T2026-0451' : 'e.g. T1234567',
    SP.s3, SP.s2, { size: FS.t13, color: o.filled ? C.slate900 : C.slate400 });
  fy += labelH + inH + SP.s4;

  const nl = text(dlg, 'Field label', 'NOTE', PAD, fy,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  text(dlg, 'Optional', '(optional)', PAD + nl.width + SP.s1_5, fy,
    { size: FS.t11, color: C.slate400 });
  const area = frame(dlg, 'Textarea - Note', PAD, fy + labelH, W - PAD * 2, areaH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(area, o.filled ? 'Value' : 'Placeholder',
    o.filled ? 'Reissued after the passenger corrected their surname.' : 'Add a note for this ticket…',
    SP.s3, SP.s2, { size: FS.t13, color: o.filled ? C.slate900 : C.slate400,
      width: W - PAD * 2 - SP.s3 * 2 });

  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const pw = SP.s3 * 2 + measure('Mark issued', FS.sm, FONT.medium);
  const cw = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium);
  const ca = frame(foot, 'Button - Cancel', W - PAD - pw - SP.s2 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const pr = frame(foot, 'Button - Mark issued', W - PAD - pw, by, pw, btnH,
    { bg: C.emerald600, radius: RAD.lg });
  if (!o.filled) pr.opacity = 0.6;
  text(pr, 'Label', 'Mark issued', SP.s3, SP.s1_5,
    { size: FS.sm, weight: FONT.medium, color: C.white });
  return dlg;
}

/* ── T12. CancelConfirmDialog — noun="ticket" ──────────────────────────── */

const MD_W = 476;

/** opts: { reason, menuOpen } */
function buildCancelTicketDialog(parent, opts) {
  const o = opts || {};
  const W = MD_W, PAD = SP.s6, badgeS = SP.s9;
  const valid = !!o.reason && o.reason !== 'Others';

  const tx = PAD + badgeS + SP.s3;
  const textW = W - PAD * 2 - badgeS - SP.s3;
  const bodyStr = 'This marks the ticket For Refund. The payout is processed separately.';
  const lines = Math.max(1, Math.ceil(measure(bodyStr, FS.t12_5) / textW));
  const headBlock = lh(FS.t15) + SP.s1 + lines * (FS.t12_5 * RELAXED);

  const selH = SP.s2 * 2 + lh(FS.sm);
  const noteH = SP.s2 + 2 * (FS.t11_5 * RELAXED);
  const fieldsH = SP.s4 + lh(FS.t11_5) + SP.s1_5 + selH + noteH;
  const btnH = SP.s2 * 2 + lh(FS.t12_5);
  const H = PAD * 2 + Math.max(badgeS, headBlock) + fieldsH + SP.s5 + btnH;

  const dlg = buildModal(parent, 'Dialog - Cancel ticket', W, H, false);
  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS,
    { bg: C.rose50, radius: RAD.full, stroke: C.rose200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', TI.cancelSlash, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C.rose600);

  text(dlg, 'Title', 'Cancel ticket ‘' + (o.subject || 'TKT-0002') + '’?', tx, PAD,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(dlg, 'Body', bodyStr, tx, PAD + lh(FS.t15) + SP.s1,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * RELAXED, width: textW });

  const fy = PAD + Math.max(badgeS, headBlock) + SP.s4;
  const lab = text(dlg, 'Field label', 'Cancellation reason *', PAD, fy,
    { size: FS.t11_5, weight: FONT.semibold, color: C.slate700 });
  lab.setRangeFills(20, 21, fill(C.rose500));

  const selY = fy + lh(FS.t11_5) + SP.s1_5;
  const selW = W - PAD * 2;
  const sel = frame(dlg, 'Select - Cancellation reason', PAD, selY, selW, selH, {
    bg: C.white, radius: RAD.lg, stroke: o.menuOpen ? C.gray300 : C.gray200,
  });
  const stx = text(sel, o.reason ? 'Value' : 'Placeholder', o.reason || 'Select a reason…',
    SP.s3, (selH - lh(FS.sm)) / 2, { size: FS.sm, color: o.reason ? C.gray900 : C.gray400 });
  if (!o.reason) stx.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
  const chev = icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s3 - 14.875,
    (selH - 14.875) / 2, 14.875, C.gray400);
  if (o.menuOpen) chev.rotation = 180;

  const ny = selY + selH + SP.s2;
  icon(dlg, 'Icon · info', TI.infoCircle, PAD, ny + 1, 14.875, C.slate400);
  const noteStr = 'The passenger sees this reason in their booking app. Keep it clear and factual.';
  const strong = 'The passenger sees this reason in their booking app.';
  const note = text(dlg, 'Passenger note', noteStr, PAD + 14.875 + SP.s1_5, ny,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * RELAXED,
      width: W - PAD * 2 - 14.875 - SP.s1_5 });
  note.setRangeFills(0, strong.length, fill(C.slate600));
  note.setRangeFontName(0, strong.length, { family: FONT.family, style: FONT.semibold });

  const by = H - PAD - btnH;
  const pw = SP.s4 * 2 + measure('Cancel ticket', FS.t12_5, FONT.semibold);
  const cw = SP.s3_5 * 2 + measure('Keep ticket', FS.t12_5, FONT.semibold);
  const ca = frame(dlg, 'Button - Keep ticket', W - PAD - pw - SP.s2_5 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Keep ticket', SP.s3_5, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const pr = frame(dlg, 'Button - Cancel ticket', W - PAD - pw, by, pw, btnH,
    { bg: valid ? C.rose600 : C.rose300, radius: RAD.lg });
  text(pr, 'Label', 'Cancel ticket', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });

  if (o.menuOpen) {
    const optH = SP.s2 * 2 + lh(FS.sm);
    const menuH = SP.s2 * 2 + CANCEL_REASONS.length * optH;
    const menu = frame(parent, 'Reason options', dlg.x + PAD, dlg.y + selY + selH + SP.s1,
      selW, menuH, {
        bg: C.white, radius: RAD.xl, stroke: C.gray200, clip: true, shadow: MENU_SHADOW,
      });
    CANCEL_REASONS.forEach((r, i) => {
      const on = r === o.reason;
      const row = frame(menu, 'Option · ' + r, 0, SP.s2 + i * optH, selW, optH,
        { bg: on ? C.brand50 : undefined });
      text(row, 'Label', r, SP.s3, SP.s2, { size: FS.sm, color: on ? C.brand700 : C2.gray700 });
      if (on) icon(row, 'Icon · check', TI.selectCheck, selW - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
    });
  }
  return dlg;
}

/* ── T12b. EditEntityDialog — the shared passenger / vehicle editor ────── */

/**
 * components/EditEntityDialog.tsx. One dialog, two forms — the SAME component
 * the Bookings page uses, mounted here from each sub-page's row menu:
 *   passengers → "Edit passenger" → init { kind: "passenger", ticket }
 *   vehicles   → "Edit vehicle"   → init { kind: "vehicle", vehicle }
 *
 * Opened from the row menu rather than a detail dialog, so nothing sits behind
 * it here — unlike the Bookings page, where it stacks over the open booking.
 *
 * Save is `dirty && valid && !locked`, so it starts DISABLED on a freshly
 * opened form: nothing has changed yet.
 *
 * Fare, amount, pax type and fare class are deliberately absent — they drive
 * payment totals and stay read-only.
 */
const EDIT_W = 544;                                  // max-w-lg → 32rem × 17px

const EDIT_THEME = {
  passenger: { bg: C.brand50,  fg: C.brand600,  ring: C.brand200,  tag: 'PASSENGER',
               tagBg: C.brand50,  tagFg: C.brand700,
               ic: { sw: 1.75, d: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>' } },
  vehicle:   { bg: C.indigo50, fg: C.indigo600, ring: C.indigo200, tag: 'VEHICLE',
               tagBg: C.indigo50, tagFg: C.indigo700,
               ic: { sw: 1.6,  d: '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5"/><path d="M5 17h14"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>' } },
};

const EDIT_INPUT_H = SP.s2 * 2 + lh(FS.t13);         // px-3 py-2 text-[13px]
const EDIT_LABEL_H = lh(FS.t11_5) + SP.s1;           // label + mt-1
const EDIT_FIELD_H = EDIT_LABEL_H + EDIT_INPUT_H;
const EDIT_ERR_H = SP.s1 + lh(FS.t11);
const EDIT_PHOTO_BOX = 102;                          // h-24
const EDIT_PHOTO_H = lh(FS.t11_5) + SP.s1 + EDIT_PHOTO_BOX;
const EDIT_GAP = SP.s3_5;                            // gap-3.5
const EDIT_RULE_H = SP.s1 + 1 + SP.s3_5 + lh(FS.t10);

/** Labelled input / select, with an optional rose error line. */
function editField(parent, x, y, w, label, value, placeholder, opts) {
  const o = opts || {};
  text(parent, 'Field label', label, x, y,
    { size: FS.t11_5, weight: FONT.semibold, color: C.slate600 });
  const iy = y + EDIT_LABEL_H;
  const f = frame(parent, (o.select ? 'Select - ' : 'Input - ') + label, x, iy, w, EDIT_INPUT_H, {
    // disabled:bg-slate-50 disabled:text-slate-400 when the form is locked.
    bg: o.locked ? C.slate50 : C.white, radius: RAD.lg,
    stroke: o.error ? C.rose300 : C.slate200,
  });
  const shown = value || placeholder;
  text(f, value ? 'Value' : 'Placeholder', shown, SP.s3, SP.s2, {
    size: FS.t13,
    color: o.locked ? C.slate400 : (value ? C.slate800 || C.slate900 : C.slate400),
  });
  if (o.select) icon(f, 'Icon · chevron', TI.chevDown, w - SP.s3 - 14.875,
    (EDIT_INPUT_H - 14.875) / 2, 14.875, C.gray400);
  let h = EDIT_FIELD_H;
  if (o.error) {
    text(parent, 'Field error', o.error, x, y + h + SP.s1,
      { size: FS.t11, weight: FONT.medium, color: C.rose500, width: w });
    h += EDIT_ERR_H;
  }
  return h;
}

/** PhotoField — an h-24 thumbnail with Replace, or a dashed Upload drop-zone. */
function editPhotoField(parent, x, y, w, label, uploaded, opts) {
  const o = opts || {};
  const required = o.required !== false;
  const lt = text(parent, 'Photo label', label, x, y, {
    size: FS.t11_5, weight: FONT.semibold, color: C.slate600,
    lh: FS.t11_5 * 1.375, width: w - (required && !uploaded ? 60 : 0),
  });
  if (required && !uploaded) {
    const cl = 'MISSING';
    const cw = measure(cl, FS.t9, FONT.bold) + SP.s1 * 2;
    const ch = lh(FS.t9) + SP.s05 * 2;
    const chip = frame(parent, 'Missing chip', x + w - cw, y + 1, cw, ch,
      { bg: C.rose50, radius: 4 });
    text(chip, 'Label', cl, SP.s1, SP.s05,
      { size: FS.t9, weight: FONT.bold, color: C.rose500 });
  }
  const by = y + lh(FS.t11_5) + SP.s1;
  if (uploaded) {
    const box = frame(parent, 'Photo · ' + label, x, by, w, EDIT_PHOTO_BOX,
      { bg: C.slate200, radius: RAD.lg, stroke: C.slate200, clip: true });
    icon(box, 'Icon', I.photo, (w - 25.5) / 2, (EDIT_PHOTO_BOX - 25.5) / 2, 25.5, C.slate400);
  } else {
    // border-2 dashed — rose while the doc is required, slate when optional or
    // the form is locked.
    const stroke = o.locked ? C.slate200 : (required ? C.rose200 : C.slate200);
    const fg = o.locked ? C.slate300 : (required ? C.rose300 : C.slate400);
    const box = frame(parent, 'Upload · ' + label, x, by, w, EDIT_PHOTO_BOX, {
      radius: RAD.lg, stroke: stroke, strokeW: 2, dash: [5, 4],
    });
    icon(box, 'Icon · plus', TI.plusSmall, (w - 17) / 2,
      EDIT_PHOTO_BOX / 2 - 17 - SP.s1 / 2, 17, fg);
    text(box, 'Label', 'Upload', 0, EDIT_PHOTO_BOX / 2 + SP.s1 / 2,
      { size: FS.t11_5, weight: FONT.medium, color: fg, width: w, align: 'CENTER' });
  }
  return EDIT_PHOTO_H;
}

/** Dashed section rule with a small uppercase caption. */
function editRule(parent, x, y, w, caption) {
  const r = rect(parent, 'Section rule', x, y + SP.s1, w, 1, { bg: C.slate200 });
  r.dashPattern = [4, 3];
  text(parent, 'Section label', caption.toUpperCase(), x, y + SP.s1 + 1 + SP.s3_5,
    { size: FS.t10, weight: FONT.semibold, color: C.slate400, tracking: 0.88 });
  return EDIT_RULE_H;
}

/** opts: { kind: 'passenger'|'vehicle', locked, errors } */
function buildEditEntityDialog(parent, opts) {
  const o = opts || {};
  const kind = o.kind || 'passenger';
  const th = EDIT_THEME[kind];
  const locked = !!o.locked;
  const errs = o.errors || {};
  const W = EDIT_W;

  /* Rows, so the height can be derived before the modal is made. */
  const rows = kind === 'passenger'
    ? [
        { pair: [['First name', 'Ana', 'e.g. Ana', {}], ['Last name', 'Torres', 'e.g. Torres', {}]] },
        { pair: [['Birth date', 'Mar 4, 1992', 'Select birth date', { select: true }],
                 ['Gender', 'Female', '', { select: true }]] },
        { pair: [['Nationality', 'Filipino', 'e.g. Filipino', {}], null] },
        { rule: 'Valid ID' },
        { pair: [['ID type', 'Philippine Passport', 'No ID type', { select: true }],
                 ['ID number', 'P1234567A', '', {}]] },
        { photos: [['ID photo — front', true, true], ['ID photo — back', false, true]] },
      ]
    : [
        { pair: [['Plate conduction', 'ABC 1234', 'e.g. ABC-1234', {}],
                 ['Vehicle class', 'Car / SUV', 'Select a class', { select: true }]] },
        { pair: [['Make', 'Toyota', 'e.g. Toyota', {}], ['Model', 'Vios', 'e.g. Vios', {}]] },
        { pair: [['Year', '2021', '', {}], null] },
        { rule: 'Documents & photo' },
        { photos: [['Official Receipt (OR)', true, true],
                   ['Certificate of Registration (CR)', true, true]] },
        { wide: ['Vehicle photo', false, false] },
      ];

  const rowH = (r) => {
    if (r.rule) return EDIT_RULE_H;
    if (r.photos || r.wide) return EDIT_PHOTO_H;
    let h = EDIT_FIELD_H;
    r.pair.forEach((c) => { if (c && errs[c[0]]) h = EDIT_FIELD_H + EDIT_ERR_H; });
    return h;
  };
  let bodyH = SP.s4 * 2;
  rows.forEach((r, i) => { bodyH += rowH(r) + (i < rows.length - 1 ? EDIT_GAP : 0); });

  const headH = SP.s5 + Math.max(42.5, lh(FS.t15) + SP.s05 + lh(FS.t12)) + SP.s4;
  const bannerH = locked ? SP.s4 + (SP.s2 * 2 + lh(FS.t12)) : 0;
  const btnH = SP.s2 * 2 + lh(FS.t12_5);
  const footH = SP.s4 * 2 + btnH;
  const H = headH + bannerH + bodyH + footH;

  // layer="top" → the scrim is black/40 rather than black/30.
  const dlg = buildModal(parent, 'Dialog - Edit ' + kind, W, H, true);

  /* Header — px-6 pb-4 pt-5, gap-3 */
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  const badgeS = 42.5;                                // h-10 w-10
  const badge = frame(head, 'Icon badge', SP.s6, SP.s5, badgeS, badgeS,
    { bg: th.bg, radius: RAD.full, stroke: th.ring, strokeOpacity: 0.7 });
  icon(badge, 'Icon', th.ic, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, th.fg);
  const tx = SP.s6 + badgeS + SP.s3;
  const blockH = lh(FS.t15) + SP.s05 + lh(FS.t12);
  const ty = SP.s5 + (Math.max(badgeS, blockH) - blockH) / 2;
  const title = text(head, 'Title', kind === 'passenger' ? 'Edit passenger' : 'Edit vehicle', tx, ty,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const tagW = measure(th.tag, FS.t9_5, FONT.bold, 0.84) + SP.s1_5 * 2;
  const tagH = lh(FS.t9_5) + SP.s05 * 2;
  const tag = frame(head, 'Kind tag', tx + title.width + SP.s2,
    ty + (lh(FS.t15) - tagH) / 2, tagW, tagH, { bg: th.tagBg, radius: RAD.full });
  text(tag, 'Label', th.tag, SP.s1_5, SP.s05,
    { size: FS.t9_5, weight: FONT.bold, color: th.tagFg, tracking: 0.84 });
  // `Ticket ${ticketNumber ?? id}` / `Vehicle ${ticketNumber}` — or the literal
  // "Vehicle details" when the vehicle has no number yet.
  text(head, 'Subtitle',
    kind === 'passenger' ? 'Ticket T2026-0451' : 'Vehicle V2026-0090',
    tx, ty + lh(FS.t15) + SP.s05, { size: FS.t12, color: C.slate500 });

  /* Locked banner — mx-6 mt-4, amber */
  if (locked) {
    const bh = SP.s2 * 2 + lh(FS.t12);
    const b = frame(dlg, 'Locked banner', SP.s6, headH + SP.s4, W - SP.s6 * 2, bh,
      { bg: C.amber50, radius: RAD.lg, stroke: C.amber200 });
    icon(b, 'Icon · lock', { sw: 1.9, d: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' },
      SP.s3, SP.s2 + 2, 14.875, C.amber800);
    text(b, 'Reason', 'This booking has settled and can no longer be edited.',
      SP.s3 + 14.875 + SP.s2, SP.s2,
      { size: FS.t12, color: C.amber800, width: W - SP.s6 * 2 - SP.s3 * 2 - 14.875 - SP.s2 });
  }

  /* Body — grid-cols-2 gap-3.5 px-6 py-4 */
  const body = frame(dlg, 'Body', 0, headH + bannerH, W, bodyH, { clip: true });
  const iw = W - SP.s6 * 2;
  const colW = (iw - EDIT_GAP) / 2;
  let fy = SP.s4;
  rows.forEach((r) => {
    if (r.rule) {
      editRule(body, SP.s6, fy, iw, r.rule);
    } else if (r.wide) {
      editPhotoField(body, SP.s6, fy, iw, r.wide[0], r.wide[1],
        { required: r.wide[2], locked: locked });
    } else if (r.photos) {
      r.photos.forEach((pf, k) => {
        editPhotoField(body, SP.s6 + k * (colW + EDIT_GAP), fy, colW, pf[0], pf[1],
          { required: pf[2], locked: locked });
      });
    } else {
      r.pair.forEach((c, k) => {
        if (!c) return;
        editField(body, SP.s6 + k * (colW + EDIT_GAP), fy, colW, c[0], c[1], c[2],
          { select: c[3].select, locked: locked, error: errs[c[0]] });
      });
    }
    fy += rowH(r) + EDIT_GAP;
  });

  /* Footer — px-6 py-4, justify-end gap-2.5. Save needs dirty && valid && !locked. */
  const canSave = !!o.dirty && !o.invalid && !locked;
  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const by = (footH - btnH) / 2;
  const pw = SP.s4 * 2 + measure('Save changes', FS.t12_5, FONT.semibold);
  const cw = SP.s3_5 * 2 + measure('Cancel', FS.t12_5, FONT.semibold);
  const ca = frame(foot, 'Button - Cancel', W - SP.s6 - pw - SP.s2_5 - cw, by, cw, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3_5, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const pr = frame(foot, 'Button - Save changes', W - SP.s6 - pw, by, pw, btnH,
    { bg: canSave ? C.brand500 : C.brand300, radius: RAD.lg });
  text(pr, 'Label', 'Save changes', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── T13. Empty states ─────────────────────────────────────────────────── */

function buildTicketsEmptyState(parent, y, title, bodyStr) {
  const H = 400;
  const panel = frame(parent, 'EmptyState - inbox', 0, y, CONTENT_W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, dash: [5, 4],
  });
  const badgeS = 51;
  const bodyW = 476;
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS.t12_5) / bodyW));
  const block = badgeS + SP.s4 + lh(FS.t15) + SP.s1_5 + bodyLines * (FS.t12_5 * RELAXED);
  let cy = (H - block) / 2;
  const badge = frame(panel, 'Icon badge', (CONTENT_W - badgeS) / 2, cy, badgeS, badgeS,
    { bg: C.slate100, radius: RAD.full, stroke: C.slate200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', TI.inbox, (badgeS - 25.5) / 2, (badgeS - 25.5) / 2, 25.5, C.slate400);
  cy += badgeS + SP.s4;
  const t = text(panel, 'Title', title, 0, cy,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3,
      width: CONTENT_W, align: 'CENTER' });
  cy += t.height + SP.s1_5;
  text(panel, 'Body', bodyStr, (CONTENT_W - bodyW) / 2, cy,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * RELAXED, width: bodyW, align: 'CENTER' });
  return panel;
}

/* ── T14. Frames ───────────────────────────────────────────────────────── */

const PAX_TITLE = 'Passenger Tickets', VEH_TITLE = 'Vehicle Tickets';
// Both sub-pages sit under the "Tickets" group in the sidebar, as the
// "Passengers" and "Vehicles" child items.
const PAX_NAV = 'Passengers', VEH_NAV = 'Vehicles';

const PAX_PAGER = 'Showing 1–15 of 96 tickets';
const VEH_PAGER = 'Showing 1–8 of 8 vehicle tickets';

function paxPage(shell, opts) {
  const o = opts || {};
  return buildPaxTable(shell.content, shell.bodyY, {
    rows: o.rows || PAX_TICKETS, pagerSummary: o.summary || PAX_PAGER,
    page: o.page || 1, totalPages: o.totalPages || 7,
    query: o.query, filterCount: o.filterCount, menuRowIndex: o.menuRowIndex,
    copiedRowIndex: o.copiedRowIndex, sizeOpen: o.sizeOpen, scrollX: o.scrollX,
    pageSize: o.pageSize || 15, shell: shell,
  });
}

function vehPage(shell, opts) {
  const o = opts || {};
  return buildVehTable(shell.content, shell.bodyY, {
    rows: o.rows || VEHICLE_TICKETS, pagerSummary: o.summary || VEH_PAGER,
    page: o.page || 1, totalPages: o.totalPages || 1,
    query: o.query, menuRowIndex: o.menuRowIndex, copiedRowIndex: o.copiedRowIndex,
    sizeOpen: o.sizeOpen, scrollX: o.scrollX, shell: shell,
  });
}

const BUILDERS = [
  /* ── Passenger tickets ─────────────────────────────────────────────── */

  { name: 'Tickets / Passenger tickets / 01 — View tickets — Loading',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildSkeleton(s.content, s.bodyY, 8); } },

  { name: 'Tickets / Passenger tickets / 02 — No tickets yet — Empty state',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildTicketsEmptyState(s.content, s.bodyY, 'No tickets yet',
        'Tickets appear here once bookings are created. Each passenger gets their own ticket under a booking.'); } },

  // Page size is 15 here, so the table runs well past the 900px fold.
  { name: 'Tickets / Passenger tickets / 03 — View tickets — Default list',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s); } },

  { name: 'Tickets / Passenger tickets / 04 — Search ticket or booking — Results',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { rows: PAX_SEARCH, query: 'TKT-0017',
        summary: 'Showing 1–4 of 4 tickets', totalPages: 1 }); } },

  { name: 'Tickets / Passenger tickets / 05 — Filter — No results',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { rows: [], filterCount: 2,
        summary: 'Showing 0–0 of 0 tickets', totalPages: 1 }); } },

  { name: 'Tickets / Passenger tickets / 06 — Open ticket filters — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildFiltersDialog(s.frame, PAX_FILTER_FIELDS, 0); } },

  { name: 'Tickets / Passenger tickets / 07 — Apply filters — Filters applied',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { rows: PAX_TICKETS.filter((t) => t.st === 'Issued'), filterCount: 2,
        summary: 'Showing 1–8 of 8 tickets', totalPages: 1 }); } },

  { name: 'Tickets / Passenger tickets / 08 — Copy ticket number — Copied',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { copiedRowIndex: 0 });
      buildToast(s.frame, 'T2026-0451 copied'); } },

  // The 15-row page pushes the footer far past the fold, so this uses the
  // searched short list.
  { name: 'Tickets / Passenger tickets / 09 — Rows per page — Selector open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { rows: PAX_SEARCH, query: 'TKT-0017',
        summary: 'Showing 1–4 of 4 tickets', totalPages: 1, sizeOpen: true }); } },

  { name: 'Tickets / Passenger tickets / 10 — Wide table — Scrolled right',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { scrollX: PAX_MIN_W - CONTENT_W }); } },

  /* ── Passenger row actions ─────────────────────────────────────────── */

  { name: 'Tickets / Passenger actions / 01 — Issued ticket — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const i = 0;
      paxPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, paxMenuItems('Issued', true)); } },

  { name: 'Tickets / Passenger actions / 02 — Pending ticket — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const i = 5;
      paxPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, paxMenuItems('Pending', true)); } },

  { name: 'Tickets / Passenger actions / 03 — For Refund ticket — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const i = 2;
      paxPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, paxMenuItems('ToRefund', false)); } },

  { name: 'Tickets / Passenger actions / 04 — Refunded ticket — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const i = 3;
      paxPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, paxMenuItems('Refunded', false)); } },

  /* ── Mark Issued ───────────────────────────────────────────────────── */

  { name: 'Tickets / Mark Issued / 01 — Empty form — Confirm disabled',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildMarkIssuedDialog(s.frame, {}); } },

  { name: 'Tickets / Mark Issued / 02 — Ticket number entered — Ready',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildMarkIssuedDialog(s.frame, { filled: true }); } },

  /* ── Ticket detail ─────────────────────────────────────────────────── */

  { name: 'Tickets / Ticket detail / 01 — Issued ticket — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildTicketDetailDialog(s.frame, { status: 'Issued' }); } },

  // A Pending ticket has no number and no ETD caption — the caption renders
  // only while Issued.
  { name: 'Tickets / Ticket detail / 02 — Pending ticket — No number, no ETD',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildTicketDetailDialog(s.frame, { status: 'Pending' }); } },

  { name: 'Tickets / Ticket detail / 03 — Update status — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildTicketDetailDialog(s.frame, { status: 'Issued', statusMenuOpen: true }); } },

  /* ── Vehicle tickets ───────────────────────────────────────────────── */

  { name: 'Tickets / Vehicle tickets / 01 — View vehicle tickets — Loading',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildSkeleton(s.content, s.bodyY, 8); } },

  { name: 'Tickets / Vehicle tickets / 02 — No vehicle tickets yet — Empty state',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildTicketsEmptyState(s.content, s.bodyY, 'No vehicle tickets yet',
        'Vehicle tickets appear here once a booking includes a vehicle.'); } },

  { name: 'Tickets / Vehicle tickets / 03 — View vehicle tickets — Default list',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s); } },

  { name: 'Tickets / Vehicle tickets / 04 — Search ticket or plate — Results',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      vehPage(s, { rows: VEH_SEARCH, query: 'Pickup',
        summary: 'Showing 1–3 of 3 vehicle tickets' }); } },

  { name: 'Tickets / Vehicle tickets / 05 — Search — No results',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      vehPage(s, { rows: [], query: 'XYZ 9999',
        summary: 'Showing 0–0 of 0 vehicle tickets' }); } },

  { name: 'Tickets / Vehicle tickets / 06 — Rows per page — Selector open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      vehPage(s, { rows: VEH_SEARCH, query: 'Pickup',
        summary: 'Showing 1–3 of 3 vehicle tickets', sizeOpen: true }); } },

  /* ── Vehicle row actions ───────────────────────────────────────────── */

  { name: 'Tickets / Vehicle actions / 01 — Confirmed — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const i = 0;
      vehPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, vehMenuItems('Confirmed')); } },

  { name: 'Tickets / Vehicle actions / 02 — Under Review — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const i = 1;
      vehPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      // An unapproved booking must be approved before it can be cancelled.
      buildTicketMenu(s.frame, a.x, a.y, vehMenuItems('Submitted')); } },

  { name: 'Tickets / Vehicle actions / 03 — For Refund — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const i = 6;
      vehPage(s, { menuRowIndex: i });
      const a = ticketMenuAnchor(s, i);
      buildTicketMenu(s.frame, a.x, a.y, vehMenuItems('ToRefund')); } },

  /* ── Vehicle detail ────────────────────────────────────────────────── */

  { name: 'Tickets / Vehicle detail / 01 — Confirmed — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildVehicleDetailDialog(s.frame, { status: 'Confirmed' }); } },

  { name: 'Tickets / Vehicle detail / 02 — Update status — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildVehicleDetailDialog(s.frame, { status: 'Confirmed', statusMenuOpen: true }); } },

  /* ── Cancel ticket ─────────────────────────────────────────────────── */

  // Both sub-pages now route Cancel through the shared CancelConfirmDialog with
  // noun="ticket" and TICKET_CANCEL_REASONS. On vehicles the target is the
  // BOOKING ref (one vehicle per booking); on passengers it is the ticket id.

  { name: 'Tickets / Cancel ticket / 01 — Vehicle ticket — Reason required',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0002' }); } },

  { name: 'Tickets / Cancel ticket / 02 — Vehicle ticket — Reason menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0002', menuOpen: true }); } },

  { name: 'Tickets / Cancel ticket / 03 — Vehicle ticket — Reason selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0002',
        reason: 'Invalid/Missing Requirements' }); } },

  // The passenger side, newly wired. Reached from the row menu AND from the
  // detail dialog's status picker, which now hands off here instead of
  // mutating inline.
  { name: 'Tickets / Cancel ticket / 04 — Passenger ticket — Reason required',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0017-A' }); } },

  { name: 'Tickets / Cancel ticket / 05 — Passenger ticket — Reason menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0017-A', menuOpen: true }); } },

  { name: 'Tickets / Cancel ticket / 06 — Passenger ticket — Reason selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildCancelTicketDialog(s.frame, { subject: 'TKT-0017-A',
        reason: 'Duplicate Ticket' }); } },

  { name: 'Tickets / Cancel ticket / 07 — Passenger ticket — Cancelled toast',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      paxPage(s, { rows: PAX_TICKETS.map(function (t, i) {
        return i === 0 ? Object.assign({}, t, { st: 'ToRefund' }) : t; }) });
      buildToast(s.frame, 'Ticket TKT-0017-A cancelled — marked For Refund'); } },

  /* ── Added after the first build. The run is additive, so re-running keeps
        every frame above exactly as it is. ────────────────────────────── */

  /* ── Edit entity ───────────────────────────────────────────────────── */

  { name: 'Tickets / Edit entity / 01 — Edit passenger — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      // Save starts disabled — `dirty && valid && !locked`, and nothing is dirty.
      buildEditEntityDialog(s.frame, { kind: 'passenger' }); } },

  { name: 'Tickets / Edit entity / 02 — Edit passenger — Edited, ready to save',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildEditEntityDialog(s.frame, { kind: 'passenger', dirty: true }); } },

  { name: 'Tickets / Edit entity / 03 — Edit passenger — Validation errors',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildEditEntityDialog(s.frame, { kind: 'passenger', dirty: true, invalid: true,
        errors: { 'Last name': 'Last name is required.',
                  'ID number': 'ID number is required.' } }); } },

  // canEditBooking() gates the row item; a settled booking opens read-only.
  { name: 'Tickets / Edit entity / 04 — Edit passenger — Locked, settled booking',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); paxPage(s);
      buildEditEntityDialog(s.frame, { kind: 'passenger', locked: true }); } },

  { name: 'Tickets / Edit entity / 05 — Edit vehicle — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildEditEntityDialog(s.frame, { kind: 'vehicle' }); } },

  { name: 'Tickets / Edit entity / 06 — Edit vehicle — Edited, ready to save',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildEditEntityDialog(s.frame, { kind: 'vehicle', dirty: true }); } },

  { name: 'Tickets / Edit entity / 07 — Edit vehicle — Locked, settled booking',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); vehPage(s);
      buildEditEntityDialog(s.frame, { kind: 'vehicle', locked: true }); } },

];


/* ── T15. Run — creates its own section below everything on the page ───── */

const SECTION_NAME = 'Tickets — All states (v2)';

async function main() {
  FONT = await loadFonts();

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
