/* ============================================================================
 * Tripket — Build "Tickets- Passenger & Vehicles — All states"   (v2)
 * ----------------------------------------------------------------------------
 * Translates app/tickets/passengers/page.tsx and app/tickets/vehicles/page.tsx
 * into native Figma frames inside section 5778:29129.
 *
 * v2 fixes, all traced back to the source components:
 *   · Sidebar icons are now the EXACT path data from components/Sidebar.tsx
 *     (DashboardIcon, VoyageIcon, RouteIcon, FerryIcon, TicketIcon, TicketsIcon,
 *     PassengersIcon, VehiclesIcon, ReportsIcon, AccountsIcon, AuditIcon,
 *     SettingsIcon) — including per-icon stroke weights and the dashed
 *     perforation on the Tickets stub.
 *   · The Tripket mark is the real public/imgs/logo.png, embedded and rendered
 *     white to match `brightness-0 invert` on the brand-600 tile.
 *   · LogoTile is the real component: white rounded-md tile, gray-200 ring,
 *     line logo object-contain. The active line is lines[0] = 2GO Travel
 *     (lib/shipping-lines.ts + ShippingLineContext seeds activeId to it).
 *   · Table columns are measured from their content the way a browser lays out
 *     an auto table — this is what fixes the Route/city overlap and the
 *     column bleed under the sticky actions cell.
 *   · ActivityLog rebuilt to the real component (tinted event nodes on a
 *     spine, white entry cards, actor avatars).
 *   · Line-heights now use the browser's leading-normal (1.5), so row and
 *     card heights match the running app.
 *
 * Measurements are real CSS pixels at a 1440x900 viewport. globals.css sets
 * `html { font-size: 17px }`, so every rem utility is 17px-based (w-60 = 255,
 * h-14 = 59.5, p-5 = 21.25), and the type-scale layer lifts arbitrary
 * text-[Npx] values ~1px. Both are baked into SP and FS below.
 * ========================================================================== */

const SECTION_ID = '5778:29129';

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

/* ── 5. Status palettes (lib/bookings-data.ts) ─────────────────────────── */

const TICKET_TONE = {
  'Pending':   { bg: C.yellow50,   fg: C.yellow700,  label: 'Pending'    },
  'Issued':    { bg: C.emerald100, fg: C.emerald800, label: 'Issued'     },
  'Cancelled': { bg: C.slate100,   fg: C.slate500,   label: 'Cancelled'  },
  'To Refund': { bg: C.amber100,   fg: C.amber800,   label: 'For Refund' },
  'Refunded':  { bg: C.sky50,      fg: C.sky700,     label: 'Refunded'   },
};
const BOOKING_TONE = {
  'Pending':   { bg: C.yellow50,   fg: C.yellow700,  label: 'Pending'      },
  'Confirmed': { bg: C.emerald100, fg: C.emerald800, label: 'Confirmed'    },
  'Submitted': { bg: C.brand50,    fg: C.brand700,   label: 'Under Review' },
  'Cancelled': { bg: C.slate100,   fg: C.slate500,   label: 'Cancelled'    },
  'To Refund': { bg: C.amber100,   fg: C.amber800,   label: 'For Refund'   },
  'Refunded':  { bg: C.sky50,      fg: C.sky700,     label: 'Refunded'     },
};

// lib/shipping-lines.ts lines[0] — the seeded active line.
const LINE = { name: '2GO Travel', initial: '2G' };

/* ── 6. Seed rows ──────────────────────────────────────────────────────── */

const PAX_ROWS = [
  { tn: 'TKT-0001-A', st: 'Issued',    name: 'Maria Santos',    ref: 'TKT-0001', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 14, 2026', tm: '08:00 AM', cls: 'Economy',  amt: '₱1,240' },
  { tn: 'TKT-0001-B', st: 'Issued',    name: 'Juan dela Cruz',  ref: 'TKT-0001', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 14, 2026', tm: '08:00 AM', cls: 'Economy',  amt: '₱1,240' },
  { tn: null,         st: 'Pending',   name: 'Ana Reyes',       ref: 'TKT-0002', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 15, 2026', tm: '05:00 AM', cls: 'Tourist',  amt: '₱890'   },
  { tn: 'TKT-0003-A', st: 'Issued',    name: 'Carlos Mendoza',  ref: 'TKT-0003', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 15, 2026', tm: '04:00 PM', cls: 'Business', amt: '₱2,150' },
  { tn: 'TKT-0004-A', st: 'To Refund', name: 'Lorna Garcia',    ref: 'TKT-0004', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 16, 2026', tm: '07:00 AM', cls: 'Economy',  amt: '₱1,480', removed: true },
  { tn: 'TKT-0004-B', st: 'Issued',    name: 'Roberto Flores',  ref: 'TKT-0004', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 16, 2026', tm: '07:00 AM', cls: 'Economy',  amt: null, comped: true },
  { tn: 'TKT-0005-A', st: 'Refunded',  name: 'Elena Cruz',      ref: 'TKT-0005', oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 16, 2026', tm: '02:00 PM', cls: 'Tourist',  amt: '₱1,320' },
  { tn: 'TKT-0006-A', st: 'Issued',    name: 'Mark Villanueva', ref: 'TKT-0006', oc: 'BAC', ocity: 'Bacolod City',   dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 17, 2026', tm: '01:00 PM', cls: 'Economy',  amt: '₱1,480' },
  { tn: null,         st: 'Pending',   name: 'Gloria Tan',      ref: 'TKT-0007', oc: 'CAL', ocity: 'Calapan City',   dc: 'BAT', dcity: 'Batangas City',  dep: 'Aug 17, 2026', tm: '10:00 AM', cls: 'Economy',  amt: '₱890'   },
  { tn: 'TKT-0008-A', st: 'Cancelled', name: 'Dennis Aquino',   ref: 'TKT-0008', oc: 'CEB', ocity: 'Cebu City',      dc: 'ORM', dcity: 'Ormoc City',     dep: 'Aug 18, 2026', tm: '09:00 AM', cls: 'Tourist',  amt: '₱1,650' },
  { tn: 'TKT-0009-A', st: 'Issued',    name: 'Patricia Lim',    ref: 'TKT-0009', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 18, 2026', tm: '02:00 PM', cls: 'Business', amt: '₱2,410' },
  { tn: 'TKT-0010-A', st: 'Issued',    name: 'Jose Bautista',   ref: 'TKT-0010', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 19, 2026', tm: '05:00 AM', cls: 'Economy',  amt: '₱890'   },
  { tn: 'TKT-0011-A', st: 'Issued',    name: 'Andrea Castro',   ref: 'TKT-0011', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 19, 2026', tm: '04:00 PM', cls: 'Economy',  amt: '₱1,650' },
  { tn: null,         st: 'Pending',   name: 'Rafael Ramos',    ref: 'TKT-0012', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 20, 2026', tm: '07:00 AM', cls: 'Tourist',  amt: '₱1,720' },
  { tn: 'TKT-0013-A', st: 'Issued',    name: 'Camille Torres',  ref: 'TKT-0013', oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 20, 2026', tm: '02:00 PM', cls: 'Economy',  amt: '₱1,240' },
];

const VEH_ROWS = [
  { tn: 'TKT-0003-V', st: 'Confirmed', holder: 'Carlos Mendoza',  ref: 'TKT-0003', make: 'Toyota',     model: 'Fortuner', cls: 'Medium Vehicle', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 15, 2026', tm: '4:00 PM',  amt: '₱4,850' },
  { tn: 'TKT-0006-V', st: 'Confirmed', holder: 'Mark Villanueva', ref: 'TKT-0006', make: 'Mitsubishi', model: 'L300',     cls: 'Large Vehicle',  oc: 'BAC', ocity: 'Bacolod City',   dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 17, 2026', tm: '1:00 PM',  amt: '₱6,300' },
  { tn: null,         st: 'Submitted', holder: 'Gloria Tan',      ref: 'TKT-0007', make: 'Honda',      model: 'Civic',    cls: 'Small Vehicle',  oc: 'CAL', ocity: 'Calapan City',   dc: 'BAT', dcity: 'Batangas City',  dep: 'Aug 17, 2026', tm: '10:00 AM', amt: '₱2,950' },
  { tn: 'TKT-0009-V', st: 'Confirmed', holder: 'Patricia Lim',    ref: 'TKT-0009', make: 'Isuzu',      model: 'D-Max',    cls: 'Medium Vehicle', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 18, 2026', tm: '2:00 PM',  amt: '₱4,850' },
  { tn: 'TKT-0011-V', st: 'Confirmed', holder: 'Andrea Castro',   ref: 'TKT-0011', make: 'Toyota',     model: 'Hiace',    cls: 'Large Vehicle',  oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 19, 2026', tm: '4:00 PM',  amt: '₱6,300' },
  { tn: null,         st: 'Pending',   holder: 'Rafael Ramos',    ref: 'TKT-0012', make: 'Nissan',     model: 'Navara',   cls: 'Medium Vehicle', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 20, 2026', tm: '7:00 AM',  amt: '₱4,850' },
  { tn: 'TKT-0014-V', st: 'To Refund', holder: 'Miguel Diaz',     ref: 'TKT-0014', make: 'Ford',       model: 'Ranger',   cls: 'Medium Vehicle', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 21, 2026', tm: '5:00 AM',  amt: '₱4,850' },
  { tn: 'TKT-0015-V', st: 'Refunded',  holder: 'Sofia Navarro',   ref: 'TKT-0015', make: 'Suzuki',     model: 'Ertiga',   cls: 'Small Vehicle',  oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 21, 2026', tm: '2:00 PM',  amt: '₱2,950' },
  { tn: 'TKT-0016-V', st: 'Confirmed', holder: 'Diego Pascual',   ref: 'TKT-0016', make: 'Hyundai',    model: 'Starex',   cls: 'Large Vehicle',  oc: 'CEB', ocity: 'Cebu City',      dc: 'ORM', dcity: 'Ormoc City',     dep: 'Aug 22, 2026', tm: '9:00 AM',  amt: '₱6,300' },
  { tn: 'TKT-0017-V', st: 'Confirmed', holder: 'Bianca Santos',   ref: 'TKT-0017', make: 'Toyota',     model: 'Vios',     cls: 'Small Vehicle',  oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 22, 2026', tm: '8:00 AM',  amt: '₱2,950' },
];

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

/* ── 9. Passenger tickets table ────────────────────────────────────────── */

const PAX_COL_DEFS = [
  { key: 'tn',    label: 'Ticket number', width: (r) => r.tn ? copyIdWidth(r.tn) : measure('—', FS.sm) },
  { key: 'st',    label: 'Status',        width: (r) => pillWidth(TICKET_TONE[r.st]) },
  { key: 'name',  label: 'Passenger', sortable: true,
    width: (r) => Math.max(measure(r.name, FS.t13_5, FONT.semibold, -0.3),
                           r.removed ? 12.75 + SP.s1 + measure('Removed by customer', FS.t9_5, FONT.medium) : 0) },
  { key: 'ref',   label: 'Booking ref',   width: (r) => copyIdWidth(r.ref) },
  { key: 'route', label: 'Route',         width: (r) => routeCellW(r) },
  { key: 'dep',   label: 'Departure', sortable: true, width: (r) => departureW(r) },
  { key: 'cls',   label: 'Class',         width: (r) => measure(r.cls, FS.t12_5, FONT.medium, -0.2) },
  { key: 'amt',   label: 'Amount',
    width: (r) => r.comped ? SP.s1_5 * 2 + 10.625 + SP.s1 + measure('COMPED', FS.t10, FONT.semibold, 0.96)
                           : measure(r.amt || '', FS.t12_5, FONT.semibold) },
];

function buildPaxTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 96.5;
  const cardH = TOOLBAR_H + THEAD_H + bodyH + (o.hidePager ? 0 : PAGER_H);
  const L = layoutColumns(PAX_COL_DEFS, rows.length ? rows : PAX_ROWS, 1280);
  const cols = L.cols;

  const card = frame(parent, 'Card - All passenger tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  buildToolbar(card, 'All passenger tickets', o.showing,
    o.searchValue || 'Search ticket, passenger, or booking…', !!o.searchValue, true, o.filterCount || 0);

  const scroll = frame(card, 'Table scroll', 0, TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, L.width, THEAD_H + bodyH);
  buildThead(table, cols, L.width);

  const tbody = frame(table, 'Table body', 0, THEAD_H, L.width, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'Empty filter message', o.emptyMessage || 'No tickets match your filters.',
      0, 0, { size: FS.sm, color: C.slate400, width: L.width, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }
  rows.forEach((r, i) => {
    const row = frame(tbody, 'Row · ' + (r.tn || r.ref), 0, i * ROW_H, L.width, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    if (o.menuRowIndex === i) {
      row.fills = fill(C.slate50, 0.6);
      rect(row, 'Hover accent', 0, 0, 3, ROW_H, { bg: C.brand500 });
    }
    const cy1 = (ROW_H - lh(FS.t12_5)) / 2;

    if (r.tn) copyableId(row, r.tn, cols[0].x + CELL_PAD_X, cy1, o.copiedRowIndex === i);
    else text(row, 'No ticket number', '—', cols[0].x + CELL_PAD_X, (ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, color: C.slate300 });

    const tone = TICKET_TONE[r.st];
    statusPill(row, 'Status pill', cols[1].x + CELL_PAD_X,
      (ROW_H - (lh(FS.t10) + SP.s05 * 2)) / 2, tone);

    if (r.removed) {
      const blockH = lh(FS.t13_5) + SP.s05 + lh(FS.t9_5);
      const ny = (ROW_H - blockH) / 2;
      text(row, 'Passenger name', r.name, cols[2].x + CELL_PAD_X, ny,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
      const my = ny + lh(FS.t13_5) + SP.s05;
      icon(row, 'Icon · removed', I.userRemoved, cols[2].x + CELL_PAD_X,
        my + (lh(FS.t9_5) - 12.75) / 2, 12.75, C.amber700);
      text(row, 'Removed note', 'Removed by customer', cols[2].x + CELL_PAD_X + 12.75 + SP.s1, my,
        { size: FS.t9_5, weight: FONT.medium, color: C.amber700 });
    } else {
      text(row, 'Passenger name', r.name, cols[2].x + CELL_PAD_X, (ROW_H - lh(FS.t13_5)) / 2,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    }

    copyableId(row, r.ref, cols[3].x + CELL_PAD_X, cy1, false);
    routeCell(row, r, cols[4].x + CELL_PAD_X, CELL_PAD_Y);

    const dy = (ROW_H - lh(FS.t13)) / 2;
    const dt = text(row, 'Departure date', r.dep, cols[5].x + CELL_PAD_X, dy,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', r.tm, cols[5].x + CELL_PAD_X + dt.width + SP.s1_5, dy,
      { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    text(row, 'Fare class', r.cls, cols[6].x + CELL_PAD_X, (ROW_H - lh(FS.t12_5)) / 2,
      { size: FS.t12_5, weight: FONT.medium, color: C.slate700, tracking: -0.2 });

    if (r.comped) {
      const cw = SP.s1_5 * 2 + 10.625 + SP.s1 + measure('COMPED', FS.t10, FONT.semibold, 0.96);
      const ch = lh(FS.t10) + SP.s05 * 2;
      const cp = frame(row, 'Comped pill', cols[7].x + CELL_PAD_X, (ROW_H - ch) / 2, cw, ch,
        { bg: C.sky50, radius: RAD.md, stroke: C.sky700, strokeOpacity: 0.15 });
      icon(cp, 'Icon', I.comped, SP.s1_5, (ch - 10.625) / 2, 10.625, C.sky700);
      text(cp, 'Label', 'COMPED', SP.s1_5 + 10.625 + SP.s1, SP.s05,
        { size: FS.t10, weight: FONT.semibold, color: C.sky700, tracking: 0.96 });
    } else {
      text(row, 'Amount', r.amt, cols[7].x + CELL_PAD_X, cy1,
        { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
    }
  });

  buildStickyActions(scroll, rows, bodyH, o.menuRowIndex);
  if (!o.hidePager) buildPager(card, TOOLBAR_H + THEAD_H + bodyH, o.pagerSummary, o.page || 1, o.totalPages || 1);
  return card;
}

/* ── 10. Vehicle tickets table ─────────────────────────────────────────── */

const VEH_COL_DEFS = [
  { key: 'tn',     label: 'Ticket number', width: (r) => r.tn ? copyIdWidth(r.tn) : measure('—', FS.sm) },
  { key: 'st',     label: 'Status',        width: (r) => pillWidth(BOOKING_TONE[r.st]) },
  { key: 'holder', label: 'Ticketholder',  width: (r) => measure(r.holder, FS.t13_5, FONT.semibold, -0.3) },
  { key: 'ref',    label: 'Booking ref',   width: (r) => copyIdWidth(r.ref) },
  { key: 'veh',    label: 'Vehicle & class',
    width: (r) => Math.max(measure(r.make + ' ' + r.model, FS.t13, FONT.semibold, -0.3),
                           measure(r.cls, FS.t11)) },
  { key: 'route',  label: 'Route',         width: (r) => routeCellW(r) },
  { key: 'dep',    label: 'Departure',     width: (r) => departureW(r) },
  { key: 'amt',    label: 'Amount',        width: (r) => measure(r.amt, FS.t12_5, FONT.semibold) },
];

function buildVehTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 96.5;
  const cardH = TOOLBAR_H + THEAD_H + bodyH + (o.hidePager ? 0 : PAGER_H);
  const L = layoutColumns(VEH_COL_DEFS, rows.length ? rows : VEH_ROWS, 1120);
  const cols = L.cols;

  const card = frame(parent, 'Card - All vehicle tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });
  buildToolbar(card, 'All vehicle tickets', o.showing,
    o.searchValue || 'Search ticket, plate, or booking…', !!o.searchValue, false, 0);

  const scroll = frame(card, 'Table scroll', 0, TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, L.width, THEAD_H + bodyH);
  buildThead(table, cols, L.width);

  const tbody = frame(table, 'Table body', 0, THEAD_H, L.width, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'Empty filter message',
      o.emptyMessage || 'No vehicle tickets match your search.', 0, 0,
      { size: FS.sm, color: C.slate400, width: L.width, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }
  rows.forEach((r, i) => {
    const row = frame(tbody, 'Row · ' + (r.tn || r.ref), 0, i * ROW_H, L.width, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, L.width, C.slate100);
    if (o.menuRowIndex === i) row.fills = fill(C.slate50, 0.6);
    const cy1 = (ROW_H - lh(FS.t12_5)) / 2;

    if (r.tn) copyableId(row, r.tn, cols[0].x + CELL_PAD_X, cy1, o.copiedRowIndex === i);
    else text(row, 'No ticket number', '—', cols[0].x + CELL_PAD_X, (ROW_H - lh(FS.sm)) / 2,
      { size: FS.sm, color: C.slate300 });

    statusPill(row, 'Status pill', cols[1].x + CELL_PAD_X,
      (ROW_H - (lh(FS.t10) + SP.s05 * 2)) / 2, BOOKING_TONE[r.st]);

    text(row, 'Ticketholder', r.holder, cols[2].x + CELL_PAD_X, (ROW_H - lh(FS.t13_5)) / 2,
      { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

    copyableId(row, r.ref, cols[3].x + CELL_PAD_X, cy1, false);

    text(row, 'Vehicle', r.make + ' ' + r.model, cols[4].x + CELL_PAD_X, CELL_PAD_Y,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Vehicle class', r.cls, cols[4].x + CELL_PAD_X, CELL_PAD_Y + lh(FS.t13) + SP.s05,
      { size: FS.t11, color: C.slate400 });

    routeCell(row, r, cols[5].x + CELL_PAD_X, CELL_PAD_Y);

    const dy = (ROW_H - lh(FS.t13)) / 2;
    const dt = text(row, 'Departure date', r.dep, cols[6].x + CELL_PAD_X, dy,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', r.tm, cols[6].x + CELL_PAD_X + dt.width + SP.s1_5, dy,
      { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    text(row, 'Amount', r.amt, cols[7].x + CELL_PAD_X, cy1,
      { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
  });

  buildStickyActions(scroll, rows, bodyH, o.menuRowIndex);
  if (!o.hidePager) buildPager(card, TOOLBAR_H + THEAD_H + bodyH, o.pagerSummary, o.page || 1, o.totalPages || 1);
  return card;
}

/* ── 11. Loading / empty / menu ────────────────────────────────────────── */

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

/* ── 12b. FiltersDialog ────────────────────────────────────────────────── */

const PAX_FILTER_FIELDS = [
  { label: 'Route',          value: 'All routes' },
  { label: 'Vessel',         value: 'All vessels' },
  { label: 'Status',         value: 'All status' },
  { label: 'Fare class',     value: 'All classes' },
  { label: 'Passenger type', value: 'All passenger types' },
  { label: 'Booking date',   kind: 'dateRange', value: 'Jul 13 – Aug 12, 2026' },
];

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

/* ── 12c. MarkPaidDialog ───────────────────────────────────────────────── */

function buildMarkPaidDialog(parent) {
  const W = 384;                                       // max-w-sm
  const PADX = SP.s6, badgeS = SP.s9;
  const textW = W - PADX * 2 - badgeS - SP.s3_5;
  const bodyStr = 'Enter the ticket number assigned when the ticket is issued. This is recorded on the ticket.';
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS.t13) / textW));
  const inputH = SP.s2 * 2 + lh(FS.t13);
  const areaH = SP.s2 * 2 + lh(FS.t13) * 2;
  const block = lh(FS.t15_5) + SP.s1 + bodyLines * (FS.t13 * 1.6)
    + SP.s4 + lh(FS.t11) + SP.s1_5 + inputH
    + SP.s3 + lh(FS.t11) + SP.s1_5 + areaH;
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.sm);
  const H = SP.s6 + Math.max(badgeS, block) + SP.s5 + footH;

  const dlg = buildModal(parent, 'Dialog - Mark as issued', W, H, false);
  const badge = frame(dlg, 'Icon badge', PADX, SP.s6, badgeS, badgeS,
    { bg: C.emerald50, radius: RAD.full, stroke: C.emerald200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', I.markPaid, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C.emerald600);

  const tx = PADX + badgeS + SP.s3_5;
  text(dlg, 'Title', 'Mark as issued', tx, SP.s6,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(dlg, 'Body', bodyStr, tx, SP.s6 + lh(FS.t15_5) + SP.s1,
    { size: FS.t13, color: C.slate600, lh: FS.t13 * 1.6, width: textW });

  let fy = SP.s6 + lh(FS.t15_5) + SP.s1 + bodyLines * (FS.t13 * 1.6) + SP.s4;
  text(dlg, 'Field label', 'TICKET NUMBER', tx, fy,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const inp = frame(dlg, 'Input - Ticket number', tx, fy + lh(FS.t11) + SP.s1_5, textW, inputH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(inp, 'Placeholder', 'e.g. T1234567', SP.s3, SP.s2, { size: FS.t13, color: C.slate400 });

  fy = fy + lh(FS.t11) + SP.s1_5 + inputH + SP.s3;
  const nl = text(dlg, 'Field label', 'NOTE (optional)', tx, fy,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  nl.setRangeFills(5, 15, fill(C.slate400));
  const area = frame(dlg, 'Textarea - Note', tx, fy + lh(FS.t11) + SP.s1_5, textW, areaH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(area, 'Placeholder', 'Add a note for this ticket…', SP.s3, SP.s2,
    { size: FS.t13, color: C.slate400 });

  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const by = (footH - btnH) / 2;
  const okW = SP.s3 * 2 + measure('Confirm issuance', FS.sm, FONT.medium);
  const caW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium);
  const ca = frame(foot, 'Button - Cancel', W - SP.s6 - okW - SP.s2 - caW, by, caW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const ok = frame(foot, 'Button - Confirm issuance (disabled)', W - SP.s6 - okW, by, okW, btnH,
    { bg: C.emerald600, radius: RAD.lg });
  ok.opacity = 0.6;                                    // disabled: no number typed yet
  text(ok, 'Label', 'Confirm issuance', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });
  return dlg;
}

/* ── 12d. EditEntityDialog ─────────────────────────────────────────────── */

const PAX_EDIT_FIELDS = [
  { label: 'First name',  value: 'Maria' },
  { label: 'Last name',   value: 'Santos' },
  { label: 'Age',         value: '34' },
  { label: 'Sex',         value: 'Female' },
  { label: 'Nationality', value: 'Filipino', span: 2 },
  { divider: 'Valid ID' },
  { label: 'ID type',     value: "Driver's License" },
  { label: 'ID number',   value: 'N01-23-456789' },
  { photo: 'ID photo — front', uploaded: true },
  { photo: 'ID photo — back',  uploaded: false },
  { label: 'Phone',       value: '+63 917 555 0142' },
  { label: 'Email',       value: 'maria.santos@email.com' },
];

const VEH_EDIT_FIELDS = [
  { label: 'Plate number',  value: 'ABC 1234' },
  { label: 'Vehicle class', value: 'Medium Vehicle' },
  { label: 'Make',          value: 'Toyota' },
  { label: 'Model',         value: 'Fortuner' },
  { label: 'Year',          value: '2022' },
  { label: 'Free seat/s',   value: '2' },
  { label: 'Label',         value: 'Family SUV', span: 2 },
  { divider: 'Documents & photo' },
  { photo: 'Official Receipt (OR)',   uploaded: true },
  { photo: 'Certificate of Reg. (CR)', uploaded: true },
  { photo: 'Vehicle photo',            uploaded: false, span: 2 },
];

const PHOTO_H = 102;                                   // h-24

function buildEditEntityDialog(parent, kind) {
  const isPax = kind === 'passenger';
  const W = 544;                                       // max-w-lg
  const fields = isPax ? PAX_EDIT_FIELDS : VEH_EDIT_FIELDS;
  const colGap = SP.s3_5;                              // gap-3.5
  const colW = (W - SP.s6 * 2 - colGap) / 2;
  const fieldH = lh(FS.t11_5) + SP.s1 + SP.s2 * 2 + lh(FS.t13);
  const photoH = lh(FS.t11_5) + SP.s1 + PHOTO_H;
  const divH = SP.s1 + 1 + SP.s3_5 + lh(FS.t10);

  // Two-column flow — full-width items and dividers break the row.
  const placed = [];
  let col = 0, cy = 0, rowMax = 0;
  fields.forEach((f) => {
    const full = f.divider || f.span === 2;
    const h = f.divider ? divH : f.photo ? photoH : fieldH;
    if (full && col === 1) { cy += rowMax + colGap; col = 0; rowMax = 0; }
    placed.push({ f: f, x: full ? 0 : col * (colW + colGap), y: cy, w: full ? colW * 2 + colGap : colW, h: h });
    if (full) { cy += h + colGap; col = 0; rowMax = 0; }
    else {
      rowMax = Math.max(rowMax, h);
      col += 1;
      if (col === 2) { cy += rowMax + colGap; col = 0; rowMax = 0; }
    }
  });
  if (col === 1) cy += rowMax + colGap;
  const gridH = Math.max(0, cy - colGap);

  const headH = SP.s5 + SP.s4 + Math.max(42.5, lh(FS.t15) + SP.s05 + lh(FS.t12));
  const bodyH = SP.s4 * 2 + gridH;
  const footH = SP.s4 * 2 + SP.s2 * 2 + lh(FS.t12_5);
  const H = headH + bodyH + footH;

  const dlg = buildModal(parent, 'Dialog - Edit ' + kind, W, H, true);

  // Header — kind-distinct accent: brand for passenger, indigo for vehicle.
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  const badgeS = 42.5;
  const badge = frame(head, 'Icon badge', SP.s6, (headH - badgeS) / 2, badgeS, badgeS, {
    bg: isPax ? C.brand50 : C.indigo50, radius: RAD.full,
    stroke: isPax ? C.brand200 : C.indigo200, strokeOpacity: 0.7,
  });
  icon(badge, 'Icon', isPax ? I.personRound : I.carRound, (badgeS - 18) / 2, (badgeS - 18) / 2, 18,
    isPax ? C.brand600 : C.indigo600);
  const tx = SP.s6 + badgeS + SP.s3;
  const blockH = lh(FS.t15) + SP.s05 + lh(FS.t12);
  const ty = (headH - blockH) / 2;
  const title = text(head, 'Title', isPax ? 'Edit passenger' : 'Edit vehicle', tx, ty,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const tag = isPax ? 'PASSENGER' : 'VEHICLE';
  const tagW = SP.s1_5 * 2 + measure(tag, FS.t9_5, FONT.bold, 0.88);
  const tagH = lh(FS.t9_5) + SP.s05 * 2;
  const tagBox = frame(head, 'Kind tag', tx + title.width + SP.s2, ty + (lh(FS.t15) - tagH) / 2,
    tagW, tagH, { bg: isPax ? C.brand50 : C.indigo50, radius: RAD.full });
  text(tagBox, 'Label', tag, SP.s1_5, SP.s05,
    { size: FS.t9_5, weight: FONT.bold, color: isPax ? C.brand700 : C.indigo700, tracking: 0.88 });
  text(head, 'Subtitle', isPax ? 'Ticket TKT-0001-A' : 'Vehicle TKT-0009-V', tx, ty + lh(FS.t15) + SP.s05,
    { size: FS.t12, color: C.slate500 });

  // Body grid
  const body = frame(dlg, 'Form', 0, headH, W, bodyH, { clip: true });
  placed.forEach((p) => {
    const f = p.f;
    const gx = SP.s6 + p.x, gy = SP.s4 + p.y;
    if (f.divider) {
      const d = frame(body, 'Divider · ' + f.divider, gx, gy, p.w, p.h);
      const dl = rect(d, 'Rule', 0, SP.s1, p.w, 1, { bg: C.slate200 });
      dl.dashPattern = [4, 4];
      text(d, 'Label', f.divider.toUpperCase(), 0, SP.s1 + 1 + SP.s3_5,
        { size: FS.t10, weight: FONT.semibold, color: C.slate400, tracking: 0.88 });
      return;
    }
    if (f.photo) {
      const pf = frame(body, 'Photo field · ' + f.photo, gx, gy, p.w, p.h);
      const lt = text(pf, 'Label', f.photo, 0, 0,
        { size: FS.t11_5, weight: FONT.semibold, color: C.slate600 });
      if (!f.uploaded) {
        const mw = SP.s1 * 2 + measure('MISSING', FS.t9, FONT.bold, 0.88);
        const mh = lh(FS.t9) + SP.s05 * 2;
        const chip = frame(pf, 'Missing chip', lt.width + SP.s1_5, (lh(FS.t11_5) - mh) / 2, mw, mh,
          { bg: C.rose50, radius: 4 });
        text(chip, 'Label', 'MISSING', SP.s1, SP.s05,
          { size: FS.t9, weight: FONT.bold, color: C.rose500, tracking: 0.88 });
      }
      const boxY = lh(FS.t11_5) + SP.s1;
      if (f.uploaded) {
        const box = frame(pf, 'Preview', 0, boxY, p.w, PHOTO_H,
          { bg: C.slate100, radius: RAD.lg, stroke: C.slate200, clip: true });
        icon(box, 'Icon', I.photo, (p.w - 25.5) / 2, (PHOTO_H - 25.5) / 2, 25.5, C.slate400);
      } else {
        const box = frame(pf, 'Upload dropzone', 0, boxY, p.w, PHOTO_H,
          { radius: RAD.lg, stroke: C.rose200, strokeW: 2, dash: [5, 4] });
        const glyphH = 17 + SP.s1 + lh(FS.t11_5);
        icon(box, 'Icon', I.plus, (p.w - 17) / 2, (PHOTO_H - glyphH) / 2, 17, C.rose300);
        text(box, 'Label', 'Upload', 0, (PHOTO_H - glyphH) / 2 + 17 + SP.s1,
          { size: FS.t11_5, weight: FONT.medium, color: C.rose300, width: p.w, align: 'CENTER' });
      }
      return;
    }
    const fl = frame(body, 'Field · ' + f.label, gx, gy, p.w, p.h);
    text(fl, 'Label', f.label, 0, 0, { size: FS.t11_5, weight: FONT.semibold, color: C.slate600 });
    const inH = SP.s2 * 2 + lh(FS.t13);
    const inp = frame(fl, 'Input', 0, lh(FS.t11_5) + SP.s1, p.w, inH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    text(inp, 'Value', f.value, SP.s3, SP.s2, { size: FS.t13, color: '#1E293B' });
  });

  // Footer — Save is disabled until the form is dirty (bg-brand-300).
  const foot = frame(dlg, 'Footer', 0, headH + bodyH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const btnH = SP.s2 * 2 + lh(FS.t12_5);
  const by = (footH - btnH) / 2;
  const saveW = SP.s4 * 2 + measure('Save changes', FS.t12_5, FONT.semibold);
  const caW = SP.s3_5 * 2 + measure('Cancel', FS.t12_5, FONT.semibold);
  const ca = frame(foot, 'Button - Cancel', W - SP.s6 - saveW - SP.s2_5 - caW, by, caW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(ca, 'Label', 'Cancel', SP.s3_5, SP.s2, { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const save = frame(foot, 'Button - Save changes (disabled)', W - SP.s6 - saveW, by, saveW, btnH,
    { bg: C.brand300, radius: RAD.lg });
  text(save, 'Label', 'Save changes', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── 12e. Lightbox + StatusPicker ──────────────────────────────────────── */

function buildLightbox(parent) {
  buildScrim(parent, 0.75);
  const W = 560, H = 380;                              // max-w-[60vw] / max-h-[60vh]
  const box = frame(parent, 'Dialog - Document preview', (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.slate100, radius: RAD.lg, clip: true,
    shadow: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.6 },
               offset: { x: 0, y: 30 }, radius: 80, spread: -20, visible: true, blendMode: 'NORMAL' }],
  });
  icon(box, 'Icon · placeholder', I.photo, (W - 51) / 2, (H - 51) / 2, 51, C.slate400);
  text(box, 'Caption', "Driver's License · Front", 0, H / 2 + 34,
    { size: FS.t12, color: C.slate500, width: W, align: 'CENTER' });
  const close = frame(parent, 'Button - Close preview',
    (FRAME_W - W) / 2 + W - 12.75, (FRAME_H - H) / 2 - 12.75, SP.s9, SP.s9, {
      bg: C.white, radius: RAD.full,
      shadow: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.4 },
                 offset: { x: 0, y: 8 }, radius: 20, spread: -6, visible: true, blendMode: 'NORMAL' }],
    });
  icon(close, 'Icon', I.close, (SP.s9 - 17) / 2, (SP.s9 - 17) / 2, 17, C.slate700);
  return box;
}

/**
 * StatusPicker popover — opens upward from the dialog footer's Update status
 * button. From an Issued ticket: Refund is locked (only reachable from For
 * Refund) and Cancel ticket is live.
 */
function buildStatusPicker(parent, rightX, bottomY) {
  const W = 238;                                       // w-56
  const rowH = SP.s1_5 * 2 + lh(FS.t12_5);
  const capH = SP.s1_5 * 2 + lh(FS.t10);
  const opts = [
    { label: 'Refund',        tone: TICKET_TONE.Refunded,  disabled: true },
    { label: 'Cancel ticket', tone: TICKET_TONE.Cancelled, danger: true },
  ];
  const H = SP.s1 * 2 + capH + rowH * opts.length;
  const menu = frame(parent, 'Status picker menu', rightX - W, bottomY - SP.s2 - H, W, H, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: MENU_SHADOW,
  });
  text(menu, 'Caption', 'UPDATE STATUS', SP.s1 + SP.s2, SP.s1 + SP.s1_5,
    { size: FS.t10, weight: FONT.medium, color: C.slate400, tracking: 0.88 });
  opts.forEach((o, i) => {
    const row = frame(menu, 'Option · ' + o.label, SP.s1, SP.s1 + capH + i * rowH, W - SP.s2, rowH,
      { radius: RAD.md });
    const col = o.disabled ? C.slate300 : o.danger ? C.rose600 : C.slate700;
    text(row, 'Label', o.label, SP.s2, SP.s1_5,
      { size: FS.t12_5, weight: FONT.medium, color: col });
    const pw = measure(o.tone.label.toUpperCase(), FS.t9_5, FONT.semibold, 0.88) + SP.s1_5 * 2;
    const ph = lh(FS.t9_5) + SP.s05 * 2;
    const pill = frame(row, 'Status pill', W - SP.s2 - SP.s2 - pw, (rowH - ph) / 2, pw, ph,
      { bg: o.tone.bg, radius: 4 });
    pill.opacity = o.disabled ? 0.5 : 1;
    text(pill, 'Label', o.tone.label.toUpperCase(), SP.s1_5, SP.s05,
      { size: FS.t9_5, weight: FONT.semibold, color: o.tone.fg, tracking: 0.88 });
  });
  return menu;
}

/* ── 12. Dialog building blocks ────────────────────────────────────────── */

/** Route summary card — code / dashed leg / LogoTile / dashed leg / code. */
function buildRouteSummary(parent, x, y, w, r, etd) {
  const codeH = lh(FS.xl), cityH = lh(FS.t11);
  const tileBlockH = SP.s8 + SP.s1 + lh(FS.t10);
  const topBlock = Math.max(codeH + SP.s05 + cityH, tileBlockH);
  const topH = SP.s4 + topBlock + (etd ? SP.s3 + lh(FS.t11) : 0) + SP.s3;
  const gridH = SP.s3 * 2 + lh(FS.t10) + SP.s1 + lh(FS.t12_5) + SP.s05 + lh(FS.t11_5);

  const card = frame(parent, 'Route summary', x, y, w, topH + gridH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });

  // Centre cluster: leg · tile · leg, with the two code columns flexing either side.
  const legW = 42.5, tileW = SP.s8;
  const clusterW = legW * 2 + tileW + SP.s3 * 2;
  const colW = (w - SP.s5 * 2 - clusterW - SP.s3 * 2) / 2;
  const leftX = SP.s5;
  const cx = leftX + colW + SP.s3;

  text(card, 'Origin code', r.oc, leftX, SP.s4,
    { size: FS.xl, weight: FONT.bold, color: C.slate900, tracking: 1.28, width: colW, align: 'CENTER' });
  text(card, 'Origin city', r.ocity, leftX, SP.s4 + codeH + SP.s05,
    { size: FS.t11, color: C.slate500, width: colW, align: 'CENTER' });

  legArrow(card, 'Leg', cx, SP.s4 + (topBlock - 12.75) / 2);
  const tile = logoTile(card, cx + legW + SP.s3, SP.s4, tileW);
  text(card, 'Line name', LINE.name, cx + legW + SP.s3 + tileW / 2 - 60, SP.s4 + tileW + SP.s1,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, width: 120, align: 'CENTER' });
  legArrow(card, 'Leg', cx + legW + SP.s3 + tileW + SP.s3, SP.s4 + (topBlock - 12.75) / 2);

  const rightX = cx + clusterW + SP.s3;
  text(card, 'Destination code', r.dc, rightX, SP.s4,
    { size: FS.xl, weight: FONT.bold, color: C.slate900, tracking: 1.28, width: colW, align: 'CENTER' });
  text(card, 'Destination city', r.dcity, rightX, SP.s4 + codeH + SP.s05,
    { size: FS.t11, color: C.slate500, width: colW, align: 'CENTER' });

  if (etd) {
    text(card, 'ETD caption', '( ' + etd + ' )', 0, SP.s4 + topBlock + SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: -0.2, width: w, align: 'CENTER' });
  }

  hairline(card, 'Border top', 0, topH, w, C.slate100);
  rect(card, 'Divider', w / 2, topH, 1, gridH, { bg: C.slate100 });
  const gy = topH + SP.s3;
  text(card, 'Departure label', 'DEPARTURE', SP.s4, gy,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(card, 'Departure date', r.dep, SP.s4, gy + lh(FS.t10) + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(card, 'Departure time', r.tm, SP.s4, gy + lh(FS.t10) + SP.s1 + lh(FS.t12_5) + SP.s05,
    { size: FS.t11_5, weight: FONT.medium, color: C.slate600 });
  text(card, 'Vessel label', 'VESSEL', w / 2 + SP.s4, gy,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(card, 'Vessel name', r.vessel, w / 2 + SP.s4, gy + lh(FS.t10) + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  return card;
}

function fieldPair(parent, label, value, x, y, opts) {
  const o = opts || {};
  text(parent, 'Label', label, x, y, { size: FS.t9_5, color: C.slate500 });
  text(parent, 'Value', value, x, y + lh(FS.t9_5) + SP.s05, {
    size: o.size || FS.t12_5, weight: o.weight || FONT.medium, color: C.slate900, tracking: o.tracking,
  });
  return lh(FS.t9_5) + SP.s05 + lh(o.size || FS.t12_5);
}

function docRow(parent, x, y, w, label, uploaded) {
  const thumbS = 42.5;
  const row = frame(parent, 'Doc row · ' + label, x, y, w, thumbS);
  const thumb = frame(row, 'Thumbnail', 0, 0, thumbS, thumbS, {
    bg: uploaded ? C.slate100 : C.slate50, radius: RAD.md,
    stroke: C.slate200, dash: uploaded ? undefined : [3, 3],
  });
  icon(thumb, 'Icon', uploaded ? I.photo : I.imageDash, (thumbS - 17) / 2, (thumbS - 17) / 2, 17,
    uploaded ? C.slate400 : C.slate300);

  const tx = thumbS + SP.s2_5;
  const blockH = lh(FS.t13) + lh(FS.t10);
  text(row, 'Label', label, tx, (thumbS - blockH) / 2,
    { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(row, 'Required', 'REQUIRED', tx, (thumbS - blockH) / 2 + lh(FS.t13),
    { size: FS.t10, weight: FONT.medium, color: C.slate400, tracking: 0.88 });

  const lbl = uploaded ? 'UPLOADED' : 'MISSING';
  const pw = SP.s2 * 2 + measure(lbl, FS.t10, FONT.semibold, 0.88) + (uploaded ? 12.75 + SP.s1 : 0);
  const ph = lh(FS.t10) + SP.s05 * 2;
  const pill = frame(row, 'Status pill', w - pw, (thumbS - ph) / 2, pw, ph,
    { bg: uploaded ? C.emerald50 : C.slate100, radius: RAD.md });
  if (uploaded) icon(pill, 'Icon', I.check, SP.s2, (ph - 12.75) / 2, 12.75, C.emerald700);
  text(pill, 'Label', lbl, uploaded ? SP.s2 + 12.75 + SP.s1 : SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: uploaded ? C.emerald700 : C.slate500, tracking: 0.88 });
  return row;
}

/** ActivityLog — gradient rail, pinned header, tinted nodes on a spine. */
const ACTIVITY = [
  { kind: 'paid',    node: C.emerald500, ic: I.actPaid,    title: 'Ticket marked paid',       detail: 'Ticket no. TKT-0001-A · Maria Santos', actor: 'Rina Lopez',   av: 'RL', when: '2d ago' },
  { kind: 'edited',  node: C.brand500,   ic: I.actEdited,  title: 'Passenger details updated', detail: 'Contact email changed',                actor: 'Rina Lopez',   av: 'RL', when: '3d ago' },
  { kind: 'created', node: C.brand500,   ic: I.actCreated, title: 'Booking created',           detail: 'Web · 2 passengers',                   actor: 'System',       av: 'SY', when: '3d ago' },
];

function buildActivityLog(parent, x, y, w, h) {
  const rail = frame(parent, 'ActivityLog', x, y, w, h, { clip: true });
  rail.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: Object.assign({ a: 1 }, hex('#FCFDFE')) },
      { position: 1, color: Object.assign({ a: 1 }, hex('#F9FAFB')) },
    ],
  }];
  rect(rail, 'Border left', 0, 0, 1, h, { bg: C.slate100 });

  const headH = SP.s4 * 2 + lh(FS.t12_5);
  const head = frame(rail, 'Header', 0, 0, w, headH);
  hairline(head, 'Border bottom', 0, headH - 1, w, C.slate100);
  const ht = text(head, 'Title', 'Activity', SP.s5, SP.s4,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(head, 'Count', ACTIVITY.length + ' events', SP.s5 + ht.width + SP.s2,
    SP.s4 + lh(FS.t12_5) - lh(FS.t9_5), { size: FS.t9_5, color: C.slate400 });

  // Entries are bottom-anchored (mt-auto in the source).
  const NODE = 23, GAP = SP.s3, PB = SP.s4;
  const cardW = w - SP.s4 * 2 - NODE - GAP;
  const entryH = [];
  ACTIVITY.forEach((e) => {
    entryH.push(SP.s2 * 2 + lh(FS.t12) + SP.s05 + lh(FS.t10) + SP.s1_5 + SP.s4);
  });
  const totalH = entryH.reduce((a, b) => a + b, 0) + PB * (ACTIVITY.length - 1);
  let ey = Math.max(headH + SP.s4, h - SP.s4 - totalH);

  // Spine
  rect(rail, 'Spine', SP.s4 + 11, ey + SP.s2, 1, totalH - SP.s5, { bg: C.slate200 });

  ACTIVITY.forEach((e, i) => {
    const node = frame(rail, 'Event node', SP.s4, ey + SP.s05, NODE, NODE,
      { bg: e.node, radius: RAD.full, stroke: C.slate50, strokeW: 4, strokeAlign: 'OUTSIDE' });
    icon(node, 'Icon', e.ic, (NODE - 11) / 2, (NODE - 11) / 2, 11, C.white);

    const cardH = entryH[i] - SP.s4;
    const card = frame(rail, 'Entry · ' + e.title, SP.s4 + NODE + GAP, ey, cardW, cardH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200, strokeOpacity: 0.7 });
    const tt = text(card, 'Title', e.title, SP.s3, SP.s2,
      { size: FS.t12, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    const wt = text(card, 'Time', e.when, 0, SP.s2 + lh(FS.t12) - lh(FS.t10),
      { size: FS.t10, color: C.slate400 });
    wt.x = cardW - SP.s3 - wt.width;
    void tt;
    text(card, 'Detail', e.detail, SP.s3, SP.s2 + lh(FS.t12) + SP.s05,
      { size: FS.t10, color: C.slate500, width: cardW - SP.s3 * 2 });
    const ay = SP.s2 + lh(FS.t12) + SP.s05 + lh(FS.t10) + SP.s1_5;
    const av = frame(card, 'Actor avatar', SP.s3, ay, 17, 17, {
      bg: e.av === 'SY' ? C.slate200 : C.brand100, radius: RAD.md,
    });
    const ai = text(av, 'Initials', e.av, 0, 0,
      { size: FS.t8, weight: FONT.bold, color: e.av === 'SY' ? C.slate600 : C.brand600 });
    centerIn(ai, { x: 0, y: 0, w: 17, h: 17 });
    text(card, 'Actor', e.actor, SP.s3 + 17 + SP.s1_5, ay,
      { size: FS.t9_5, weight: FONT.medium, color: C.slate500 });
    ey += entryH[i] + PB - SP.s4;
  });
  return rail;
}

/* ── 13. Detail dialogs ────────────────────────────────────────────────── */

function dialogFooter(parent, w, h, primaryBg) {
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.t12_5);
  const foot = frame(parent, 'Footer', 0, h - footH, w, footH, { bg: C.slate50, opacity: 0.6 });
  hairline(foot, 'Border top', 0, 0, w, C.slate100);
  const btnH = SP.s1_5 * 2 + lh(FS.t12_5);
  const by = (footH - btnH) / 2;

  const closeW = SP.s3 * 2 + measure('Close', FS.t12_5, FONT.medium);
  const closeBtn = frame(foot, 'Button - Close', SP.s6, by, closeW, btnH, { radius: RAD.lg });
  text(closeBtn, 'Label', 'Close', SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });

  const upLabel = 'UPDATE STATUS';
  const upW = SP.s3 * 2 + measure(upLabel, FS.t12_5, FONT.semibold, 0.54) + SP.s2 + 14.875;
  const goW = SP.s3 * 2 + measure('Go to booking', FS.t12_5, FONT.medium);

  const go = frame(foot, 'Button - Go to booking', w - SP.s6 - upW - SP.s2 - goW, by, goW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(go, 'Label', 'Go to booking', SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });

  const up = frame(foot, 'Button - Update status', w - SP.s6 - upW, by, upW, btnH,
    { bg: primaryBg, radius: RAD.lg });
  text(up, 'Label', upLabel, SP.s3, SP.s1_5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white, tracking: 0.54 });
  icon(up, 'Icon', I.chevronDown, upW - SP.s3 - 14.875, (btnH - 14.875) / 2, 14.875, C.white);
  return footH;
}

function dialogHeader(parent, w, idLabel, copyable, tone, title, bookingRef) {
  const headH = SP.s5 * 2 + lh(FS.t12_5) + SP.s1_5 + lh(FS.t17) + SP.s05 + lh(FS.t12);
  const head = frame(parent, 'Header', 0, 0, w, headH);
  hairline(head, 'Border bottom', 0, headH - 1, w, C.slate100);
  const tn = text(head, 'Ticket number', idLabel, SP.s6, SP.s5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  let cx = SP.s6 + tn.width + SP.s2;
  if (copyable) {
    const cb = frame(head, 'Button - Copy', cx, SP.s5 + (tn.height - COPY_BTN) / 2, COPY_BTN, COPY_BTN,
      { radius: RAD.md });
    icon(cb, 'Icon', I.copy, (COPY_BTN - 14.875) / 2, (COPY_BTN - 14.875) / 2, 14.875, C.slate400);
    cx += COPY_BTN + SP.s2;
  }
  statusPill(head, 'Status pill', cx, SP.s5 + (lh(FS.t12_5) - (lh(FS.t10) + SP.s05 * 2)) / 2, tone);
  text(head, 'Title', title, SP.s6, SP.s5 + lh(FS.t12_5) + SP.s1_5,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  const sub = text(head, 'Booking caption', 'Under booking ' + bookingRef, SP.s6,
    SP.s5 + lh(FS.t12_5) + SP.s1_5 + lh(FS.t17) + SP.s05, { size: FS.t12, color: C.slate500 });
  sub.setRangeFills(14, 14 + bookingRef.length, fill(C.slate700));
  sub.setRangeFontName(14, 14 + bookingRef.length, { family: FONT.family, style: FONT.medium });
  const close = frame(head, 'Button - Close', w - SP.s6 - SP.s8, SP.s5, SP.s8, SP.s8, { radius: RAD.full });
  icon(close, 'Icon', I.close, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.slate400);
  return headH;
}

function buildTicketDialog(parent) {
  buildScrim(parent);
  const W = 816, H = 810;                     // max-w-3xl, max-h-[90vh]
  const dlg = frame(parent, 'Dialog - Ticket detail', (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: DIALOG_SHADOW,
  });

  const railW = 280;
  const bodyW = W - railW;
  const left = frame(dlg, 'Ticket content', 0, 0, bodyW, H, { clip: true });

  const headH = dialogHeader(left, bodyW, 'TKT-0001-A', true, TICKET_TONE.Issued,
    'Maria Santos', 'TKT-0001');
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.t12_5);
  const body = frame(left, 'Body', 0, headH, bodyW, H - headH - footH, { clip: true });
  const inner = frame(body, 'Container', SP.s6, SP.s5, bodyW - SP.s6 * 2, 1200);
  const iw = inner.width;
  let by = 0;

  const rs = buildRouteSummary(inner, 0, by, iw,
    { oc: 'CEB', ocity: 'Cebu City', dc: 'DGT', dcity: 'Dumaguete City',
      dep: 'Aug 14, 2026', tm: '08:00 AM', vessel: 'MV Filipinas Cebu' }, 'ETD 3h 20m');
  by += rs.height + SP.s5;

  // Passenger card — 2-col dl, gap-x-4 gap-y-3.
  const colW = (iw - SP.s4 * 2 - SP.s4) / 2;
  const pcTop = SP.s4 + lh(FS.t11) + SP.s2;
  const rowH1 = lh(FS.t9_5) + SP.s05 + lh(FS.t12_5);
  const idRowH = lh(FS.t9_5) + SP.s05 + lh(FS.t12_5) + SP.s05 + lh(FS.t11_5);
  const pcH = pcTop + rowH1 + SP.s3 + idRowH + SP.s3 + rowH1 + SP.s4;
  const pc = frame(inner, 'Passenger details', 0, by, iw, pcH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(pc, 'Section label', 'PASSENGER', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  fieldPair(pc, 'Gender', 'Female', SP.s4, pcTop);
  fieldPair(pc, 'Age', '34', SP.s4 + colW + SP.s4, pcTop);
  const r2 = pcTop + rowH1 + SP.s3;
  fieldPair(pc, 'Nationality', 'Filipino', SP.s4, r2);
  text(pc, 'Label', 'ID', SP.s4 + colW + SP.s4, r2, { size: FS.t9_5, color: C.slate500 });
  text(pc, 'ID type', "Driver's License", SP.s4 + colW + SP.s4, r2 + lh(FS.t9_5) + SP.s05,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(pc, 'ID ref', 'N01-23-456789', SP.s4 + colW + SP.s4,
    r2 + lh(FS.t9_5) + SP.s05 + lh(FS.t12_5) + SP.s05,
    { size: FS.t11_5, weight: FONT.medium, color: C.slate500 });
  const r3 = r2 + idRowH + SP.s3;
  fieldPair(pc, 'Phone (Optional)', '+63 917 555 0142', SP.s4, r3);
  fieldPair(pc, 'Email (Optional)', 'maria.santos@email.com', SP.s4 + colW + SP.s4, r3);
  by += pcH + SP.s5;

  // Valid ID photos
  const idTop = SP.s4 + lh(FS.t11) + SP.s2;
  const idH = idTop + 42.5 + SP.s1_5 + 42.5 + SP.s4;
  const idc = frame(inner, 'Valid ID photos', 0, by, iw, idH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(idc, 'Section label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  docRow(idc, SP.s4, idTop, iw - SP.s4 * 2, "Driver's License — Front", true);
  docRow(idc, SP.s4, idTop + 42.5 + SP.s1_5, iw - SP.s4 * 2, "Driver's License — Back", false);
  by += idH + SP.s5;

  // Payment information
  const payHeadH = SP.s2_5 * 2 + lh(FS.t11);
  const bookedH = SP.s3 * 2 + lh(FS.t10) + SP.s1 + lh(FS.t12_5);
  const lineH = SP.s2_5 * 2 + lh(FS.t12_5);
  const capH = SP.s2 + lh(FS.t11);
  const totalH = SP.s3 * 2 + lh(FS.t9_5) + SP.s2 + lh(FS.t9_5) + SP.s05 + lh(FS.t12);
  const payH = payHeadH + bookedH + capH + lineH * 4 + totalH;
  const pay = frame(inner, 'Payment information', 0, by, iw, payH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  const ph = frame(pay, 'Header', 0, 0, iw, payHeadH, { bg: C.slate50, opacity: 0.6 });
  hairline(ph, 'Border bottom', 0, payHeadH - 1, iw, C.slate100);
  text(ph, 'Title', 'PAYMENT INFORMATION', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const payTone = { bg: C.emerald100, fg: C.emerald800, label: 'Issued' };
  statusPill(ph, 'Pay status', iw - SP.s4 - pillWidth(payTone),
    (payHeadH - (lh(FS.t10) + SP.s05 * 2)) / 2, payTone);

  const booked = frame(pay, 'Booked on', 0, payHeadH, iw, bookedH);
  hairline(booked, 'Border bottom', 0, bookedH - 1, iw, C.slate100);
  text(booked, 'Label', 'BOOKED ON', SP.s4, SP.s3,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(booked, 'Value', 'Aug 9, 2026', SP.s4, SP.s3 + lh(FS.t10) + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  text(pay, 'Breakdown caption', 'Regular · Economy', SP.s4, payHeadH + bookedH + SP.s2,
    { size: FS.t11, color: C.slate500 });

  const lines = [['Base Fare', '₱1,240', false], ['Discount', '₱0', false],
                 ['Service Fee', '₱0', false], ['Sub total', '₱1,240', true]];
  let ly = payHeadH + bookedH + capH;
  lines.forEach((l, i) => {
    const lrow = frame(pay, 'Pay line · ' + l[0], SP.s4, ly, iw - SP.s4 * 2, lineH);
    if (i > 0) hairline(lrow, 'Divider', 0, 0, iw - SP.s4 * 2, C.slate100);
    text(lrow, 'Label', l[0], 0, SP.s2_5, {
      size: FS.t12_5, weight: l[2] ? FONT.semibold : FONT.regular,
      color: l[2] ? C.slate900 : C.slate600,
    });
    const v = text(lrow, 'Value', l[1], 0, SP.s2_5, {
      size: l[2] ? FS.t12 : FS.t12_5, weight: l[2] ? FONT.semibold : FONT.regular, color: C.slate900,
    });
    v.x = iw - SP.s4 * 2 - v.width;
    ly += lineH;
  });

  const total = frame(pay, 'Total strip', 0, ly, iw, totalH, { bg: C.slate50, opacity: 0.6 });
  hairline(total, 'Border top', 0, 0, iw, C.slate100);
  text(total, 'Label', 'TOTAL AMOUNT', SP.s4, SP.s3,
    { size: FS.t9_5, weight: FONT.medium, color: C.slate500, tracking: 0.92 });
  const tv = text(total, 'Value', '₱1,240', 0, SP.s3 - 3,
    { size: FS.t17 - 1, weight: FONT.bold, color: C.slate900, tracking: -0.4 });
  tv.x = iw - SP.s4 - tv.width;
  text(total, 'Remarks label', 'REMARKS', SP.s4, SP.s3 + lh(FS.t9_5) + SP.s2,
    { size: FS.t9_5, weight: FONT.medium, color: C.slate500, tracking: 0.92 });
  text(total, 'Remarks value', 'Issued at Cebu terminal counter 3.', SP.s4,
    SP.s3 + lh(FS.t9_5) + SP.s2 + lh(FS.t9_5) + SP.s05,
    { size: FS.t12, color: C.slate700, lh: FS.t12 * 1.6 });
  by += payH + SP.s5;
  inner.resize(iw, by);

  dialogFooter(left, bodyW, H, C.brand500);
  buildActivityLog(dlg, bodyW, 0, railW, H);
  return dlg;
}

function buildVehicleDialog(parent) {
  // Wrapped in Modal, so the backdrop is black/30 and the chrome is
  // border-gray-200 — unlike TicketDetailDialog, which rolls its own black/55.
  const W = 640, H = 792;                     // max-w-xl, max-h-[88vh]
  const dlg = buildModal(parent, 'Dialog - Vehicle detail', W, H, false);

  const headH = dialogHeader(dlg, W, 'TKT-0003-V', false, BOOKING_TONE.Confirmed,
    'carlos.mendoza@email.com', 'TKT-0003');
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.t12_5);
  const body = frame(dlg, 'Body', 0, headH, W, H - headH - footH, { clip: true });
  const inner = frame(body, 'Container', SP.s6, SP.s5, W - SP.s6 * 2, 900);
  const iw = inner.width;
  let by = 0;

  const rs = buildRouteSummary(inner, 0, by, iw,
    { oc: 'ORM', ocity: 'Ormoc City', dc: 'CEB', dcity: 'Cebu City',
      dep: 'Aug 15, 2026', tm: '4:00 PM', vessel: 'MV Reina del Cielo' }, null);
  by += rs.height + SP.s5;

  const vHeadH = SP.s2_5 * 2 + lh(FS.t11);
  const pairH = lh(FS.t9_5) + SP.s05 + lh(FS.t13);
  const vH = vHeadH + SP.s4 * 2 + pairH * 2 + SP.s4;
  const vc = frame(inner, 'Vehicle', 0, by, iw, vH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });
  const vh = frame(vc, 'Header', 0, 0, iw, vHeadH, { bg: C.slate50, opacity: 0.6 });
  hairline(vh, 'Border bottom', 0, vHeadH - 1, iw, C.slate100);
  text(vh, 'Title', 'VEHICLE', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const vcolW = (iw - SP.s4 * 2 - SP.s6) / 2;
  const vy = vHeadH + SP.s4;
  fieldPair(vc, 'Make & Model', 'Toyota Fortuner', SP.s4, vy, { size: FS.t13, weight: FONT.semibold, tracking: -0.3 });
  fieldPair(vc, 'Type', 'Medium Vehicle', SP.s4 + vcolW + SP.s6, vy, { size: FS.t13 });
  fieldPair(vc, 'Plate No.', 'ABC 1234', SP.s4, vy + pairH + SP.s4, { size: FS.t13, weight: FONT.semibold });
  fieldPair(vc, 'Year', '2022', SP.s4 + vcolW + SP.s6, vy + pairH + SP.s4, { size: FS.t13, weight: FONT.semibold });
  by += vH + SP.s5;

  const idTop = SP.s4 + lh(FS.t11) + SP.s2;
  const idH = idTop + 42.5 * 3 + SP.s1_5 * 2 + SP.s4;
  const idc = frame(inner, 'Valid ID photos', 0, by, iw, idH,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(idc, 'Section label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  docRow(idc, SP.s4, idTop, iw - SP.s4 * 2, 'Official Receipt (OR)', true);
  docRow(idc, SP.s4, idTop + 42.5 + SP.s1_5, iw - SP.s4 * 2, 'Certificate of Registration (CR)', true);
  docRow(idc, SP.s4, idTop + (42.5 + SP.s1_5) * 2, iw - SP.s4 * 2, 'Vehicle Photo', false);
  by += idH + SP.s5;
  inner.resize(iw, by);

  dialogFooter(dlg, W, H, C.brand600);
  return dlg;
}

/**
 * CancelConfirmDialog (components/CancelConfirmDialog.tsx) — reached from the
 * vehicle row menu's "Cancel ticket". Modal maxWidth="max-w-md", p-6.
 * Rendered in its on-open state: no reason picked yet, so the destructive
 * button sits disabled at bg-rose-300 and the dismiss reads "Keep ticket".
 */
function buildCancelConfirmDialog(parent, targetRef, variant) {
  const v = variant || {};                         // { reason, other, error }
  const W = 448;                                   // max-w-md
  const PAD = SP.s6;                               // p-6
  const badgeS = SP.s9;                            // h-9 w-9
  const textW = W - PAD * 2 - badgeS - SP.s3;      // gap-3 beside the badge

  // Measure the body copy so the dialog height follows the real wrap.
  const bodyStr = 'This marks the ticket For Refund. The payout is processed separately.';
  const bodyLines = Math.max(1, Math.ceil(measure(bodyStr, FS.t12_5) / textW));
  const titleH = lh(FS.t15);
  const bodyH = bodyLines * (FS.t12_5 * 1.6);
  const headBlock = Math.max(badgeS, titleH + SP.s1 + bodyH);

  const labelH = lh(FS.t12);
  const selectH = SP.s2 * 2 + lh(FS.sm);
  const btnH = SP.s2 * 2 + lh(FS.t12_5);
  const areaH = SP.s2 * 2 + lh(FS.t13) * 3;        // rows={3}, shown for "Others"
  const errH = SP.s1 + lh(FS.t11_5);
  const extraH = (v.other !== undefined ? SP.s2 + areaH : 0) + (v.error ? errH : 0);
  const H = PAD * 2 + headBlock + SP.s4 + labelH + SP.s1_5 + selectH + extraH + SP.s5 + btnH;

  const dlg = buildModal(parent, 'Dialog - Cancel ticket confirm', W, H, false);

  const badge = frame(dlg, 'Icon badge', PAD, PAD, badgeS, badgeS,
    { bg: C.rose50, radius: RAD.full, stroke: C.rose200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', I.cancel, (badgeS - 18) / 2, (badgeS - 18) / 2, 18, C.rose600);

  const tx = PAD + badgeS + SP.s3;
  text(dlg, 'Title', 'Cancel ticket ‘' + targetRef + '’?', tx, PAD,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3, width: textW });
  text(dlg, 'Body', bodyStr, tx, PAD + titleH + SP.s1,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * 1.6, width: textW });

  // Reason field — required, so the label carries a rose asterisk.
  const fy = PAD + headBlock + SP.s4;
  const lbl = text(dlg, 'Field label', 'Cancellation reason *', PAD, fy,
    { size: FS.t12, weight: FONT.semibold, color: C.slate700 });
  lbl.setRangeFills(lbl.characters.length - 1, lbl.characters.length, fill(C.rose500));

  selectTrigger(dlg, 'Select - Cancellation reason', PAD, fy + labelH + SP.s1_5,
    W - PAD * 2, v.reason || 'Select a reason…', !v.reason);

  let ey = fy + labelH + SP.s1_5 + selectH;
  if (v.other !== undefined) {
    // "Others" unlocks the free-text field; a blank one after blur turns rose.
    const bad = v.error && v.other === '';
    const area = frame(dlg, 'Textarea - Other reason', PAD, ey + SP.s2, W - PAD * 2, areaH,
      { bg: C.white, radius: RAD.lg, stroke: bad ? C.rose300 : C.slate200 });
    text(area, v.other ? 'Value' : 'Placeholder', v.other || 'Describe the reason…', SP.s3, SP.s2,
      { size: FS.t13, color: v.other ? '#1E293B' : C.slate400 });
    ey += SP.s2 + areaH;
  }
  if (v.error) {
    text(dlg, 'Validation error',
      v.other !== undefined ? 'Enter the reason before confirming.'
                            : 'Select a cancellation reason before confirming.',
      PAD, ey + SP.s1, { size: FS.t11_5, weight: FONT.medium, color: C.rose500 });
    ey += errH;
  }

  // Footer — justify-end gap-2.5. Confirm stays disabled until the reason is valid.
  const valid = !!v.reason && (v.reason !== 'Others' || (v.other || '').length > 0);
  const by = ey + SP.s5;
  const cancelW = SP.s4 * 2 + measure('Cancel ticket', FS.t12_5, FONT.semibold);
  const keepW = SP.s3_5 * 2 + measure('Keep ticket', FS.t12_5, FONT.semibold);
  const cancelX = W - PAD - cancelW;
  const keepX = cancelX - SP.s2_5 - keepW;

  const keep = frame(dlg, 'Button - Keep ticket', keepX, by, keepW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(keep, 'Label', 'Keep ticket', SP.s3_5, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });

  const conf = frame(dlg, valid ? 'Button - Cancel ticket' : 'Button - Cancel ticket (disabled)',
    cancelX, by, cancelW, btnH, { bg: valid ? C.rose600 : C.rose300, radius: RAD.lg });
  text(conf, 'Label', 'Cancel ticket', SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });
  return dlg;
}

/* ── 14. The state frames ──────────────────────────────────────────────── */

const PAX_TITLE = 'Passenger Tickets', VEH_TITLE = 'Vehicle Tickets';
const PAX_NAV = 'Passengers', VEH_NAV = 'Vehicles';

/**
 * Passenger row actions — five items with their source guards:
 *   Edit passenger → canEditBooking(bookingStatus)
 *   Mark Issued    → locked on Cancelled | Refunded | Issued
 *   Refund         → only from To Refund
 *   Cancel ticket  → locked once To Refund | Refunded
 * bookingStatus tracks the parent booking; the seeded rows are all editable.
 */
function paxMenuItems(status) {
  return [
    { label: 'View booking',   ic: I.eye },
    { label: 'Edit passenger', ic: I.pencil },
    { label: 'Mark Issued',    ic: I.markPaid,
      disabled: status === 'Cancelled' || status === 'Refunded' || status === 'Issued' },
    { label: 'Refund',         ic: I.refund, disabled: status !== 'To Refund' },
    { label: 'Cancel ticket',  ic: I.cancel, danger: true,
      disabled: status === 'To Refund' || status === 'Refunded' },
  ];
}
const PAX_MENU_ITEMS = paxMenuItems('Issued');
/**
 * Vehicle row actions — four items, in source order, with the real guards:
 *   Edit vehicle  → canEditBooking(status)  (Pending | Submitted | Confirmed)
 *   Cancel ticket → locked on To Refund | Refunded | Submitted
 *                   (an unapproved booking must be approved before cancelling)
 *   Refund        → only from To Refund
 * Passenger rows keep their own five-item menu — untouched.
 */
function vehMenuItems(status) {
  const canEdit = status === 'Pending' || status === 'Submitted' || status === 'Confirmed';
  return [
    { label: 'View booking', ic: I.eye },
    { label: 'Edit vehicle', ic: I.pencil, disabled: !canEdit },
    { label: 'Cancel ticket', ic: I.cancel, danger: true,
      disabled: status === 'To Refund' || status === 'Refunded' || status === 'Submitted' },
    { label: 'Refund', ic: I.refund, disabled: status !== 'To Refund' },
  ];
}

const paxShowing = (n, total) => 'Showing ' + n + ' of ' + total + ' tickets';

function menuAnchor(shell, rowIndex) {
  return {
    x: MAIN_X + CONTENT_X + CONTENT_W - ACTIONS_W + CELL_PAD_X,
    y: TOPBAR_H + CONTENT_Y + shell.bodyY + TOOLBAR_H + THEAD_H + rowIndex * ROW_H + (ROW_H - 29.75) / 2,
  };
}

const BUILDERS = [
  { name: 'Tickets / Passenger tickets / 01 — View passenger tickets — Loading',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV); buildSkeleton(s.content, s.bodyY, 8); } },

  { name: 'Tickets / Passenger tickets / 02 — View passenger tickets — Empty',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildEmptyState(s.content, s.bodyY, 'No tickets yet',
        'Tickets appear here once bookings are created. Each passenger gets their own ticket under a booking.'); } },

  { name: 'Tickets / Passenger tickets / 03 — View passenger tickets — Default list',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 }); } },

  { name: 'Tickets / Passenger tickets / 04 — Search ticket TKT-0004 — Results shown',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS.filter((r) => r.ref === 'TKT-0004'),
        showing: paxShowing(2, 42), filterCount: 0, searchValue: 'TKT-0004', hidePager: true }); } },

  { name: 'Tickets / Passenger tickets / 05 — Open ticket actions — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        menuRowIndex: 3, pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      const a = menuAnchor(s, 3);
      buildRowMenu(s.frame, a.x, a.y, PAX_MENU_ITEMS); } },

  { name: 'Tickets / Passenger tickets / 06 — Open ticket detail — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildTicketDialog(s.frame); } },

  { name: 'Tickets / Vehicle tickets / 01 — View vehicle tickets — Loading',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV); buildSkeleton(s.content, s.bodyY, 8); } },

  { name: 'Tickets / Vehicle tickets / 02 — View vehicle tickets — Empty',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildEmptyState(s.content, s.bodyY, 'No vehicle tickets yet',
        'Vehicle tickets appear here once a booking includes a vehicle.'); } },

  { name: 'Tickets / Vehicle tickets / 03 — View vehicle tickets — Default list',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 }); } },

  { name: 'Tickets / Vehicle tickets / 04 — Search plate ABC 1234 — Results shown',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS.slice(0, 1), showing: 'Showing 1 of 18 tickets',
        searchValue: 'ABC 1234', hidePager: true }); } },

  // Anchored on a Confirmed row (Patricia Lim) — the representative state:
  // View + Edit + Cancel live, Refund locked until the ticket is For Refund.
  { name: 'Tickets / Vehicle tickets / 05 — Open vehicle actions — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const idx = 3;
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        menuRowIndex: idx, pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      const a = menuAnchor(s, idx);
      buildRowMenu(s.frame, a.x, a.y, vehMenuItems(VEH_ROWS[idx].st)); } },

  { name: 'Tickets / Vehicle tickets / 06 — Open vehicle detail — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildVehicleDialog(s.frame); } },

  { name: 'Tickets / Vehicle tickets / 07 — Cancel ticket — Confirm dialog',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildCancelConfirmDialog(s.frame, VEH_ROWS[3].ref); } },

  /* ── v4: passenger states ────────────────────────────────────────────── */

  { name: 'Tickets / Passenger tickets / 08 — Open ticket filters — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildFiltersDialog(s.frame, PAX_FILTER_FIELDS, 0); } },

  { name: 'Tickets / Passenger tickets / 09 — Apply filters — Filtered list',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, {
        rows: PAX_ROWS.filter((r) => r.st === 'Issued' && r.cls === 'Economy'),
        showing: paxShowing(6, 42), filterCount: 2,
        pagerSummary: 'Showing 1–6 of 6 tickets', page: 1, totalPages: 1, hidePager: true }); } },

  { name: 'Tickets / Passenger tickets / 10 — Search unmatched ticket — No results',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: [], showing: paxShowing(0, 42), filterCount: 0,
        searchValue: 'TKT-9999', hidePager: true,
        emptyMessage: 'No tickets match your filters.' }); } },

  { name: 'Tickets / Passenger tickets / 11 — Go to next page — Page 2',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 16–30 of 42 tickets', page: 2, totalPages: 3 }); } },

  { name: 'Tickets / Passenger tickets / 12 — Copy ticket number — Copied feedback',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        copiedRowIndex: 0, pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildToast(s.frame, 'Ticket TKT-0001-A copied', 'success'); } },

  { name: 'Tickets / Passenger tickets / 13 — Mark Issued — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildMarkPaidDialog(s.frame); } },

  { name: 'Tickets / Passenger tickets / 14 — Edit passenger — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildEditEntityDialog(s.frame, 'passenger'); } },

  { name: 'Tickets / Passenger tickets / 15 — Preview valid ID — Lightbox open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildLightbox(s.frame); } },

  { name: 'Tickets / Passenger tickets / 16 — Update status — Picker menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      buildTicketDialog(s.frame);
      // Anchored to the footer's Update status button: dialog is 816x810,
      // centred, footer button sits flush to the content column's right edge.
      const dlgX = (FRAME_W - 816) / 2, dlgY = (FRAME_H - 810) / 2;
      const footBtnRight = dlgX + (816 - 280) - SP.s6;
      const footBtnTop = dlgY + 810 - (SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.t12_5))
        + ((SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.t12_5)) - (SP.s1_5 * 2 + lh(FS.t12_5))) / 2;
      buildStatusPicker(s.frame, footBtnRight, footBtnTop); } },

  { name: 'Tickets / Passenger tickets / 17 — Open ticket actions — Pending row — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const idx = 2;                                   // Ana Reyes — Pending
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        menuRowIndex: idx, pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      const a = menuAnchor(s, idx);
      buildRowMenu(s.frame, a.x, a.y, paxMenuItems(PAX_ROWS[idx].st)); } },

  { name: 'Tickets / Passenger tickets / 18 — Open ticket actions — For Refund row — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, PAX_TITLE, PAX_NAV);
      const idx = 4;                                   // Lorna Garcia — For Refund
      buildPaxTable(s.content, s.bodyY, { rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        menuRowIndex: idx, pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3 });
      const a = menuAnchor(s, idx);
      buildRowMenu(s.frame, a.x, a.y, paxMenuItems(PAX_ROWS[idx].st)); } },

  /* ── v4: vehicle states ──────────────────────────────────────────────── */

  { name: 'Tickets / Vehicle tickets / 08 — Search unmatched plate — No results',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: [], showing: 'Showing 0 of 18 tickets',
        searchValue: 'XYZ 9999', hidePager: true,
        emptyMessage: 'No vehicle tickets match your search.' }); } },

  { name: 'Tickets / Vehicle tickets / 09 — Go to next page — Page 2',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS.slice(0, 8),
        showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 11–18 of 18 vehicle tickets', page: 2, totalPages: 2 }); } },

  { name: 'Tickets / Vehicle tickets / 10 — Copy ticket number — Copied feedback',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        copiedRowIndex: 0, pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildToast(s.frame, 'TKT-0003-V copied', 'success'); } },

  { name: 'Tickets / Vehicle tickets / 11 — Edit vehicle — Dialog open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildEditEntityDialog(s.frame, 'vehicle'); } },

  { name: 'Tickets / Vehicle tickets / 12 — Cancel ticket — Reason selected',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildCancelConfirmDialog(s.frame, VEH_ROWS[3].ref, { reason: 'Bad weather / port closure' }); } },

  { name: 'Tickets / Vehicle tickets / 13 — Cancel ticket — Others — Free text',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildCancelConfirmDialog(s.frame, VEH_ROWS[3].ref,
        { reason: 'Others', other: 'Vessel reassigned to a relief voyage.' }); } },

  { name: 'Tickets / Vehicle tickets / 14 — Cancel ticket — Validation error',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      buildCancelConfirmDialog(s.frame, VEH_ROWS[3].ref,
        { reason: 'Others', other: '', error: true }); } },

  { name: 'Tickets / Vehicle tickets / 15 — Open vehicle actions — For Refund row — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const idx = 6;                                   // Miguel Diaz — For Refund
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        menuRowIndex: idx, pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      const a = menuAnchor(s, idx);
      buildRowMenu(s.frame, a.x, a.y, vehMenuItems(VEH_ROWS[idx].st)); } },

  { name: 'Tickets / Vehicle tickets / 16 — Open vehicle actions — Under Review row — Menu open',
    build: (x, y, n) => { const s = buildShell(n, x, y, VEH_TITLE, VEH_NAV);
      const idx = 2;                                   // Gloria Tan — Submitted
      buildVehTable(s.content, s.bodyY, { rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        menuRowIndex: idx, pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2 });
      const a = menuAnchor(s, idx);
      buildRowMenu(s.frame, a.x, a.y, vehMenuItems(VEH_ROWS[idx].st)); } },
];

/* ── 15. Run ───────────────────────────────────────────────────────────── */

const GRID_COLS = 3, GRID_GAP = 40, GRID_MARGIN_X = 64, GRID_MARGIN_Y = 96;

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

async function main() {
  FONT = await loadFonts();

  let section = null;
  try { section = await figma.getNodeByIdAsync(SECTION_ID); } catch (e) { section = null; }
  if (!section) {
    try {
      await figma.loadAllPagesAsync();
      section = figma.root.findOne((n) => n.type === 'SECTION' && n.name.indexOf('Tickets- Passenger') === 0);
    } catch (e) { section = null; }
  }
  if (!section || section.type !== 'SECTION') {
    figma.closePlugin('Could not find the "Tickets- Passenger & Vehicles — All states" section.');
    return;
  }

  const page = section.parent;
  if (typeof figma.setCurrentPageAsync === 'function') await figma.setCurrentPageAsync(page);
  else figma.currentPage = page;

  loadImages();

  // Additive by default: frames already in the section are left exactly as
  // they are, and only names that aren't there yet get built. Grid slots come
  // from each builder's fixed index, so existing frames keep their positions
  // and new states fill in after them. Delete a frame and re-run to rebuild
  // just that one.
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

  const needW = GRID_MARGIN_X * 2 + GRID_COLS * FRAME_W + (GRID_COLS - 1) * GRID_GAP;
  const rows = Math.ceil(BUILDERS.length / GRID_COLS);
  const needH = GRID_MARGIN_Y * 2 + rows * FRAME_H + (rows - 1) * GRID_GAP;
  if (section.resizeWithoutConstraints) {
    section.resizeWithoutConstraints(Math.max(section.width, needW), Math.max(section.height, needH));
  }

  if (made.length) {
    figma.currentPage.selection = made;
    figma.viewport.scrollAndZoomIntoView(made);
  }
  figma.closePlugin(
    made.length
      ? 'Added ' + made.length + ' frame' + (made.length === 1 ? '' : 's') +
        (skipped ? ' · kept ' + skipped + ' existing' : '')
      : 'Nothing to add — all ' + skipped + ' frames already exist. Delete one and re-run to rebuild it.');
}

main().catch((e) => figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e))));
