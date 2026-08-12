/* ============================================================================
 * Tripket — Build "Tickets- Passenger & Vehicles — All states"
 * ----------------------------------------------------------------------------
 * Translates app/tickets/passengers/page.tsx and app/tickets/vehicles/page.tsx
 * (plus the shared chrome: Sidebar, Topbar, PageHeader, Skeleton, EmptyState,
 * RowMenu, Pagination) into native Figma frames inside section 5778:29129.
 *
 * All measurements are real CSS pixels as the app renders them at a 1440x900
 * viewport. Note globals.css sets `html { font-size: 17px }`, so every rem
 * value is 17px-based (p-5 = 21.25px, w-60 = 255px, h-14 = 59.5px ...), and
 * the type-scale layer lifts arbitrary text-[Npx] values by ~1px. Both are
 * baked into the constants below — this is why numbers look fractional and
 * why they line up exactly with the existing Bookings / Vessels frames.
 * ========================================================================== */

const SECTION_ID = '5778:29129';

/* ── 1. Tokens ─────────────────────────────────────────────────────────── */

const C = {
  white:      '#FFFFFF',
  slate900:   '#0F172A',
  slate800:   '#1E293B',
  slate700:   '#334155',
  slate600:   '#475569',
  slate500:   '#64748B',
  slate400:   '#94A3B8',
  slate300:   '#CBD5E1',
  slate200:   '#E2E8F0',
  slate100:   '#F1F5F9',
  slate50:    '#F8FAFC',
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
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
  yellow50:   '#FEFCE8',
  yellow700:  '#A16207',
  amber100:   '#FEF3C7',
  amber700:   '#B45309',
  amber800:   '#92400E',
  sky50:      '#F0F9FF',
  sky700:     '#0369A1',
  rose50:     '#FFF1F2',
  rose500:    '#F43F5E',
  rose600:    '#E11D48',
  red500:     '#EF4444',
  black:      '#000000',
};

// rem * 17 — the app's root font-size.
const SP = {
  px:  1,
  s05: 2.125,  s1: 4.25,   s1_5: 6.375, s2: 8.5,   s2_5: 10.625,
  s3:  12.75,  s3_5: 14.875, s4: 17,    s5: 21.25, s6: 25.5,
  s8:  34,     s9: 38.25,  s10: 42.5,  s12: 51,
};

// Border radii (rounded-md / lg / xl / 2xl at 17px root).
const RAD = { md: 6.375, lg: 8.5, xl: 12.75, xxl: 17, full: 999 };

// Post-lift font sizes. Left column = the class in source, right = rendered px.
const FS = {
  t10:   11,      // text-[10px]
  t10_5: 11.5,    // text-[10.5px]
  t11:   12,      // text-[11px]
  t11_5: 12.5,    // text-[11.5px]
  t12:   13,      // text-[12px]
  t12_5: 13.5,    // text-[12.5px]
  t13:   14,      // text-[13px]
  t13_5: 14.5,    // text-[13.5px]
  t15:   16,      // text-[15px]
  t17:   18,      // text-[17px]
  xs:    12.75,   // text-xs
  sm:    14.875,  // text-sm
  base:  17,      // text-base
  xl:    21.25,   // text-xl
};

const FRAME_W = 1440;
const FRAME_H = 900;
const SIDEBAR_W = 255;      // w-60 @ 17px root
const TOPBAR_H = 59.5;      // h-14
const MAIN_X = SIDEBAR_W;
const MAIN_W = FRAME_W - SIDEBAR_W;          // 1185
const MAIN_H = FRAME_H - TOPBAR_H;           // 840.5
const CONTENT_X = SP.s8;                     // main px-8 = 34
const CONTENT_Y = SP.s6;                     // main py-6 = 25.5
const CONTENT_W = MAIN_W - SP.s8 * 2;        // 1117

let FONT = { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };

/* ── 2. Primitives ─────────────────────────────────────────────────────── */

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function fill(h, opacity) {
  const p = { type: 'SOLID', color: hex(h) };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
}

/**
 * frame(parent, name, x, y, w, h, opts)
 * opts: { bg, opacity, radius, stroke, strokeW, strokeAlign, clip, sides }
 * `sides` draws individual borders as child rects (Figma strokes are all-or-
 * nothing per side unless you use strokeTopWeight etc., which we do use).
 */
function frame(parent, name, x, y, w, h, opts) {
  const o = opts || {};
  const f = figma.createFrame();
  f.name = name;
  f.x = x; f.y = y;
  f.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  f.fills = o.bg ? fill(o.bg, o.opacity) : [];
  f.clipsContent = o.clip !== undefined ? o.clip : false;
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.radii) {
    f.topLeftRadius = o.radii[0]; f.topRightRadius = o.radii[1];
    f.bottomRightRadius = o.radii[2]; f.bottomLeftRadius = o.radii[3];
  }
  if (o.stroke) {
    f.strokes = fill(o.stroke, o.strokeOpacity);
    f.strokeWeight = o.strokeW !== undefined ? o.strokeW : 1;
    f.strokeAlign = o.strokeAlign || 'INSIDE';
    if (o.sides) {
      f.strokeTopWeight = o.sides.t || 0;
      f.strokeRightWeight = o.sides.r || 0;
      f.strokeBottomWeight = o.sides.b || 0;
      f.strokeLeftWeight = o.sides.l || 0;
    }
  }
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

/** Horizontal hairline — how every border-b / divide-y in the app is drawn. */
function hairline(parent, name, x, y, w, color, opacity) {
  return rect(parent, name, x, y, w, 1, { bg: color, opacity: opacity });
}

/**
 * text(parent, name, chars, x, y, opts)
 * opts: { size, weight, color, opacity, tracking, width, align, lh, valign }
 * Returns the TextNode. Default is auto-width so the layer hugs its glyphs,
 * matching how inline spans measure in the browser.
 */
function text(parent, name, chars, x, y, opts) {
  const o = opts || {};
  const t = figma.createText();
  t.name = name || chars;
  t.fontName = { family: FONT.family, style: o.weight || FONT.regular };
  t.characters = String(chars);
  t.fontSize = o.size || FS.sm;
  t.fills = fill(o.color || C.slate900, o.opacity);
  if (o.tracking !== undefined) t.letterSpacing = { unit: 'PIXELS', value: o.tracking };
  if (o.lh) t.lineHeight = { unit: 'PIXELS', value: o.lh };
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

/** Centre a text node horizontally/vertically inside a box already placed. */
function centerIn(node, box) {
  node.x = box.x + (box.w - node.width) / 2;
  node.y = box.y + (box.h - node.height) / 2;
}

/**
 * Icon glyph. Figma plugins can build vectors from SVG via createNodeFromSvg,
 * which keeps stroke geometry identical to the lucide-style inline SVGs in
 * the source. Sized to `s` and tinted to `color`.
 */
const ICON_CACHE = Object.create(null);
function icon(parent, name, svgPath, x, y, s, color, strokeW) {
  const sw = strokeW || 1.75;
  const key = svgPath + '|' + s + '|' + color + '|' + sw;
  let node;
  if (ICON_CACHE[key]) {
    // Cloning is an order of magnitude cheaper than re-parsing SVG, and this
    // builds ~1,500 icons across the twelve frames.
    node = ICON_CACHE[key].clone();
  } else {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' +
      svgPath + '</svg>';
    node = figma.createNodeFromSvg(svg);
    ICON_CACHE[key] = node;
    node = node.clone();
  }
  node.name = name;
  node.x = x; node.y = y;
  parent.appendChild(node);
  return node;
}

/** Remove the off-canvas originals the icon cache kept alive. */
function flushIconCache() {
  Object.keys(ICON_CACHE).forEach((k) => {
    try { ICON_CACHE[k].remove(); } catch (e) { /* already gone */ }
    delete ICON_CACHE[k];
  });
}

const shadow = (y, blur, spread, a) => [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: a },
  offset: { x: 0, y: y }, radius: blur, spread: spread || 0, visible: true, blendMode: 'NORMAL',
}];

/* ── 3. Icon path library (verbatim from the source SVGs) ──────────────── */

const I = {
  search:      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filters:     '<path d="M3 5h18M6 12h12M10 19h4"/>',
  copy:        '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  check:       '<path d="M5 12l5 5 9-11"/>',
  arrowRight:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
  chevronRight:'<path d="M9 6l6 6-6 6"/>',
  sort:        '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>',
  eye:         '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
  pencil:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  refund:      '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  cancel:      '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  close:       '<path d="M6 6l12 12M18 6 6 18"/>',
  bell:        '<path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  export:      '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 9v6"/><path d="m9 12 3 3 3-3"/>',
  inbox:       '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  image:       '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 17 5-5 4 4 3-3 4 4"/>',
  photo:       '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 13 2.5 3L14 12l4 5"/><circle cx="8.5" cy="9" r="1.5"/>',
  dashboard:   '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  voyage:      '<path d="M3 17h18l-2 3H5l-2-3Z"/><rect x="5" y="11" width="14" height="6" rx="1"/><path d="M8 11V7h8v4"/><path d="M12 7V4"/>',
  route:       '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9"/>',
  ferry:       '<path d="M3 18h18l-2 3H5l-2-3Z"/><path d="M5 12h14l-2 6H7l-2-6Z"/><path d="M9 12V7h6v5"/>',
  ticket:      '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M13 6v12"/>',
  passengers:  '<circle cx="9" cy="7" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><circle cx="17" cy="9" r="2"/><path d="M15 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5"/>',
  vehicles:    '<path d="M5 17h14"/><path d="M6 17v-4l2-4h8l2 4v4"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
  reports:     '<path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-7"/>',
  accounts:    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/>',
  audit:       '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  userRemoved: '<circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><path d="M16 11h5"/>',
  comped:      '<path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z"/><path d="M5 14V8a1 1 0 0 1 1-1h7l5 4"/>',
};

/* ── 4. Status palettes (lib/bookings-data.ts) ─────────────────────────── */

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

/* ── 5. Seed rows (shaped by deriveBookings in lib/bookings-data.ts) ───── */

const PAX_ROWS = [
  { tn: 'TKT-0001-A', st: 'Issued',    name: 'Maria Santos',      ref: 'TKT-0001', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 14, 2026', tm: '08:00 AM', cls: 'Economy',  amt: '₱1,240' },
  { tn: 'TKT-0001-B', st: 'Issued',    name: 'Juan dela Cruz',    ref: 'TKT-0001', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 14, 2026', tm: '08:00 AM', cls: 'Economy',  amt: '₱1,240' },
  { tn: null,         st: 'Pending',   name: 'Ana Reyes',         ref: 'TKT-0002', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 15, 2026', tm: '05:00 AM', cls: 'Tourist',  amt: '₱890'   },
  { tn: 'TKT-0003-A', st: 'Issued',    name: 'Carlos Mendoza',    ref: 'TKT-0003', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 15, 2026', tm: '04:00 PM', cls: 'Business', amt: '₱2,150' },
  { tn: 'TKT-0004-A', st: 'To Refund', name: 'Lorna Garcia',      ref: 'TKT-0004', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 16, 2026', tm: '07:00 AM', cls: 'Economy',  amt: '₱1,480', removed: true },
  { tn: 'TKT-0004-B', st: 'Issued',    name: 'Roberto Flores',    ref: 'TKT-0004', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 16, 2026', tm: '07:00 AM', cls: 'Economy',  amt: null, comped: true },
  { tn: 'TKT-0005-A', st: 'Refunded',  name: 'Elena Cruz',        ref: 'TKT-0005', oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 16, 2026', tm: '02:00 PM', cls: 'Tourist',  amt: '₱1,320' },
  { tn: 'TKT-0006-A', st: 'Issued',    name: 'Mark Villanueva',   ref: 'TKT-0006', oc: 'BAC', ocity: 'Bacolod City',   dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 17, 2026', tm: '01:00 PM', cls: 'Economy',  amt: '₱1,480' },
  { tn: null,         st: 'Pending',   name: 'Gloria Tan',        ref: 'TKT-0007', oc: 'CAL', ocity: 'Calapan City',   dc: 'BAT', dcity: 'Batangas City',  dep: 'Aug 17, 2026', tm: '10:00 AM', cls: 'Economy',  amt: '₱890'   },
  { tn: 'TKT-0008-A', st: 'Cancelled', name: 'Dennis Aquino',     ref: 'TKT-0008', oc: 'CEB', ocity: 'Cebu City',      dc: 'ORM', dcity: 'Ormoc City',     dep: 'Aug 18, 2026', tm: '09:00 AM', cls: 'Tourist',  amt: '₱1,650' },
  { tn: 'TKT-0009-A', st: 'Issued',    name: 'Patricia Lim',      ref: 'TKT-0009', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 18, 2026', tm: '02:00 PM', cls: 'Business', amt: '₱2,410' },
  { tn: 'TKT-0010-A', st: 'Issued',    name: 'Jose Bautista',     ref: 'TKT-0010', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 19, 2026', tm: '05:00 AM', cls: 'Economy',  amt: '₱890'   },
  { tn: 'TKT-0011-A', st: 'Issued',    name: 'Andrea Castro',     ref: 'TKT-0011', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 19, 2026', tm: '04:00 PM', cls: 'Economy',  amt: '₱1,650' },
  { tn: null,         st: 'Pending',   name: 'Rafael Ramos',      ref: 'TKT-0012', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 20, 2026', tm: '07:00 AM', cls: 'Tourist',  amt: '₱1,720' },
  { tn: 'TKT-0013-A', st: 'Issued',    name: 'Camille Torres',    ref: 'TKT-0013', oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 20, 2026', tm: '02:00 PM', cls: 'Economy',  amt: '₱1,240' },
];

const VEH_ROWS = [
  { tn: 'TKT-0003-V', st: 'Confirmed', holder: 'Carlos Mendoza',  ref: 'TKT-0003', make: 'Toyota',   model: 'Fortuner', cls: 'Medium Vehicle', oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 15, 2026', tm: '4:00 PM',  amt: '₱4,850' },
  { tn: 'TKT-0006-V', st: 'Confirmed', holder: 'Mark Villanueva', ref: 'TKT-0006', make: 'Mitsubishi', model: 'L300',   cls: 'Large Vehicle',  oc: 'BAC', ocity: 'Bacolod City',   dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 17, 2026', tm: '1:00 PM',  amt: '₱6,300' },
  { tn: null,         st: 'Submitted', holder: 'Gloria Tan',      ref: 'TKT-0007', make: 'Honda',    model: 'Civic',    cls: 'Small Vehicle',  oc: 'CAL', ocity: 'Calapan City',   dc: 'BAT', dcity: 'Batangas City',  dep: 'Aug 17, 2026', tm: '10:00 AM', amt: '₱2,950' },
  { tn: 'TKT-0009-V', st: 'Confirmed', holder: 'Patricia Lim',    ref: 'TKT-0009', make: 'Isuzu',    model: 'D-Max',    cls: 'Medium Vehicle', oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 18, 2026', tm: '2:00 PM',  amt: '₱4,850' },
  { tn: 'TKT-0011-V', st: 'Confirmed', holder: 'Andrea Castro',   ref: 'TKT-0011', make: 'Toyota',   model: 'Hiace',    cls: 'Large Vehicle',  oc: 'ORM', ocity: 'Ormoc City',     dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 19, 2026', tm: '4:00 PM',  amt: '₱6,300' },
  { tn: null,         st: 'Pending',   holder: 'Rafael Ramos',    ref: 'TKT-0012', make: 'Nissan',   model: 'Navara',   cls: 'Medium Vehicle', oc: 'CEB', ocity: 'Cebu City',      dc: 'BAC', dcity: 'Bacolod City',   dep: 'Aug 20, 2026', tm: '7:00 AM',  amt: '₱4,850' },
  { tn: 'TKT-0014-V', st: 'To Refund', holder: 'Miguel Diaz',     ref: 'TKT-0014', make: 'Ford',     model: 'Ranger',   cls: 'Medium Vehicle', oc: 'BAT', ocity: 'Batangas City',  dc: 'CAL', dcity: 'Calapan City',   dep: 'Aug 21, 2026', tm: '5:00 AM',  amt: '₱4,850' },
  { tn: 'TKT-0015-V', st: 'Refunded',  holder: 'Sofia Navarro',   ref: 'TKT-0015', make: 'Suzuki',   model: 'Ertiga',   cls: 'Small Vehicle',  oc: 'DGT', ocity: 'Dumaguete City', dc: 'CEB', dcity: 'Cebu City',      dep: 'Aug 21, 2026', tm: '2:00 PM',  amt: '₱2,950' },
  { tn: 'TKT-0016-V', st: 'Confirmed', holder: 'Diego Pascual',   ref: 'TKT-0016', make: 'Hyundai',  model: 'Starex',   cls: 'Large Vehicle',  oc: 'CEB', ocity: 'Cebu City',      dc: 'ORM', dcity: 'Ormoc City',     dep: 'Aug 22, 2026', tm: '9:00 AM',  amt: '₱6,300' },
  { tn: 'TKT-0017-V', st: 'Confirmed', holder: 'Bianca Santos',   ref: 'TKT-0017', make: 'Toyota',   model: 'Vios',     cls: 'Small Vehicle',  oc: 'CEB', ocity: 'Cebu City',      dc: 'DGT', dcity: 'Dumaguete City', dep: 'Aug 22, 2026', tm: '8:00 AM',  amt: '₱2,950' },
];

/* ── 6. Shared chrome ──────────────────────────────────────────────────── */

const NAV = [
  { label: 'Dashboard',    ic: I.dashboard },
  { divider: true },
  { label: 'Voyages',      ic: I.voyage },
  { label: 'Routes',       ic: I.route },
  { label: 'Vessels',      ic: I.ferry },
  { label: 'Bookings',     ic: I.ticket },
  { label: 'Tickets',      ic: I.passengers, group: true },
  { label: 'Passengers',   ic: I.passengers, child: true },
  { label: 'Vehicles',     ic: I.vehicles,   child: true },
  { label: 'Reports',      ic: I.reports },
  { label: 'Accounts',     ic: I.accounts,   group: true },
  { label: 'Activity logs',ic: I.audit },
  { divider: true },
  { label: 'Settings',     ic: I.settings },
];

const NAV_ITEM_H = 34.75;
const NAV_GAP = 1;         // gap-px
const NAV_DIVIDER_H = 18;

/** Sidebar — aside w-60 px-3 py-5, atmospheric slate-50 → white gradient. */
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
  // border-r border-slate-200/70
  rect(side, 'Border right', SIDEBAR_W - 1, 0, 1, FRAME_H, { bg: C.slate200, opacity: 0.7 });

  // Brand header — px-2 inside px-3, mb-6. Figma reference: x 12.75, y 21.25.
  const brand = frame(side, 'Container', SP.s3, SP.s5, SIDEBAR_W - SP.s3 * 2, 63.75);
  const tile = frame(brand, 'Logo tile', SP.s2, 0, SP.s9, SP.s9, { bg: C.brand600, radius: RAD.xl });
  icon(tile, 'Icon · logo', I.ferry, (SP.s9 - 21.25) / 2, (SP.s9 - 21.25) / 2, 21.25, C.white, 1.75);
  text(brand, 'Brand name', 'Tripket PH', SP.s2 + SP.s9 + SP.s2_5, 8.5,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.2 });

  // Navigation
  const nav = frame(side, 'Navigation', SP.s3, 85, SIDEBAR_W - SP.s3 * 2, 500);
  let y = 0;
  NAV.forEach((entry) => {
    if (entry.divider) {
      const d = frame(nav, 'Container:margin', 0, y, nav.width, NAV_DIVIDER_H);
      hairline(d, 'Divider', SP.s3, NAV_DIVIDER_H / 2, nav.width - SP.s3 * 2, C.slate200, 0.7);
      y += NAV_DIVIDER_H + NAV_GAP;
      return;
    }
    const active = entry.label === activeLabel;
    const item = frame(nav, 'Container', 0, y, nav.width, NAV_ITEM_H, {
      bg: active ? C.slate100 : undefined, opacity: active ? 0.7 : undefined, radius: RAD.md,
    });
    if (active) {
      // Active indicator — absolute left-0, h-5 w-[3px], rounded-r-full.
      rect(item, 'Active indicator', 0, (NAV_ITEM_H - SP.s5) / 2, 3, SP.s5,
        { bg: C.brand500, radius: 1.5 });
    }
    // pl-9 for group children, px-3 otherwise.
    const px = entry.child ? SP.s9 : SP.s3;
    const iconColor = active ? C.brand600 : C.slate400;
    icon(item, 'Icon', entry.ic, px, (NAV_ITEM_H - 18) / 2, 18, iconColor, 1.75);
    text(item, 'Label', entry.label, px + 18 + SP.s3, (NAV_ITEM_H - FS.t13_5 * 1.4) / 2, {
      size: FS.t13_5,
      weight: active ? FONT.medium : FONT.regular,
      color: active ? C.slate900 : C.slate600,
      lh: FS.t13_5 * 1.4,
      tracking: active ? -0.2 : 0,
    });
    if (entry.group) {
      // Expanded group chevron (rotated 180 while open).
      icon(item, 'Icon · chevron', I.chevronDown, nav.width - SP.s3 - 14, (NAV_ITEM_H - 14) / 2,
        14, C.slate400, 2);
    }
    y += NAV_ITEM_H + NAV_GAP;
  });
  nav.resize(nav.width, y);

  // User block — pinned to the bottom (Figma reference: y 792, h 86.75).
  const userWrap = frame(side, 'Container:margin', SP.s3, 792, SIDEBAR_W - SP.s3 * 2, 86.75);
  const user = frame(userWrap, 'Container', 0, 17, userWrap.width, 69.75, {
    bg: C.white, opacity: 0.7, radius: RAD.lg, stroke: C.slate200, strokeOpacity: 0.7,
  });
  const av = frame(user, 'Avatar', SP.s2_5, (69.75 - SP.s9) / 2, SP.s9, SP.s9,
    { bg: C.brand100, radius: RAD.full });
  const initials = text(av, 'Initials', 'MD', 0, 0,
    { size: FS.t12_5, weight: FONT.semibold, color: C.brand700 });
  centerIn(initials, { x: 0, y: 0, w: SP.s9, h: SP.s9 });
  text(user, 'User name', 'Michael Diopenes', SP.s2_5 + SP.s9 + SP.s2_5, 18,
    { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.2 });
  text(user, 'User role', 'Administrator', SP.s2_5 + SP.s9 + SP.s2_5, 36,
    { size: FS.t11, color: C.slate500 });

  // Collapse handle — absolute -right-3 top-1/2, h-6 w-6 + 2px white ring.
  const collapse = frame(side, 'Button - Collapse sidebar', SIDEBAR_W - 13, FRAME_H / 2 - 13, 26, 26,
    { bg: C.brand600, radius: RAD.full, stroke: C.white, strokeW: 2, strokeAlign: 'INSIDE' });
  icon(collapse, 'Icon', I.chevronLeft, (26 - 14.875) / 2, (26 - 14.875) / 2, 14.875, C.white, 2);
  return side;
}

/** Topbar — header h-14 px-6, shipping-line switcher left, notifications right. */
function buildTopbar(parent) {
  const bar = frame(parent, 'Header', 0, 0, MAIN_W, TOPBAR_H, { bg: C.white });
  hairline(bar, 'Border bottom', 0, TOPBAR_H - 1, MAIN_W, C.slate200, 0.7);

  const sw = frame(bar, 'Container', SP.s6, 10.875, 156.125, 36.75,
    { radius: RAD.lg, stroke: C.slate200, strokeOpacity: 0.7 });
  const tile = frame(sw, 'Line logo', SP.s1_5, (36.75 - 25.5) / 2, 25.5, 25.5,
    { bg: C.brand600, radius: RAD.md });
  const lt = text(tile, 'Line initials', 'TP', 0, 0, { size: FS.t10, weight: FONT.bold, color: C.white });
  centerIn(lt, { x: 0, y: 0, w: 25.5, h: 25.5 });
  text(sw, 'Line name', 'Tripket PH', SP.s1_5 + 25.5 + SP.s2, 11.5,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate900 });
  icon(sw, 'Icon · chevron', I.chevronDown, 156.125 - SP.s2 - 14, (36.75 - 14) / 2, 14, C.slate400, 2);

  const notif = frame(bar, 'Button - Notifications', MAIN_W - SP.s6 - SP.s9, 10.625, SP.s9, SP.s9,
    { radius: RAD.full });
  icon(notif, 'Icon', I.bell, (SP.s9 - SP.s5) / 2, (SP.s9 - SP.s5) / 2, SP.s5, C.slate600, 1.75);
  rect(notif, 'Unread dot', SP.s9 - SP.s2 - 6.375, SP.s2, 6.375, 6.375,
    { bg: C.red500, radius: RAD.full });
  return bar;
}

/** PageHeader — h1 text-xl + Export button, mb-6. */
function buildPageHeader(parent, title) {
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, 36.75);
  text(h, 'Page title', title, 0, 3.5,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5, lh: 29.75 });

  const btnW = 100.5;
  const btn = frame(h, 'Button - Export', CONTENT_W - btnW, 0, btnW, 34,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(btn, 'Icon', I.export, SP.s3, (34 - 17) / 2, 17, C.slate500, 1.75);
  text(btn, 'Label', 'Export', SP.s3 + 17 + SP.s1_5, (34 - FS.sm * 1.25) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700, lh: FS.sm * 1.25 });
  return h;
}

/** The 1440x900 shell every state frame starts from. */
let LAST_SHELL = null;
function buildShell(name, x, y, pageTitle, activeNav) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  buildSidebar(f, activeNav);
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  buildTopbar(right);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y, CONTENT_W, 1400);
  const header = buildPageHeader(content, pageTitle);
  return { frame: f, content: content, bodyY: header.height + SP.s6 };
}

/* ── 7. Table card pieces ──────────────────────────────────────────────── */

const CARD_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.08 },
  offset: { x: 0, y: 20 }, radius: 40, spread: -24, visible: true, blendMode: 'NORMAL',
}];

const TOOLBAR_H = 71.5;   // px-5 py-4 around a two-line title + 34px controls
const THEAD_H = 42.5;     // px-6 py-3 around 12px uppercase labels
const ROW_H = 68.5;       // px-6 py-4 around the two-line route cell
const PAGER_H = 55.5;     // px-5 py-3 around 28px chips

function statusPill(parent, name, x, y, tone) {
  const padX = SP.s2, padY = SP.s05;
  const label = tone.label.toUpperCase();
  const w = label.length * (FS.t10 * 0.62) + padX * 2 + label.length * 0.96;
  const pill = frame(parent, name, x, y, w, FS.t10 * 1.35 + padY * 2,
    { bg: tone.bg, radius: RAD.md });
  text(pill, 'Label', label, padX, padY,
    { size: FS.t10, weight: FONT.semibold, color: tone.fg, tracking: 0.96, lh: FS.t10 * 1.35 });
  return pill;
}

/** Toolbar — title + "Showing N of M" + search field (+ Filters on passengers). */
function buildToolbar(card, title, showing, placeholder, withFilters, filterCount) {
  const tb = frame(card, 'Toolbar', 0, 0, card.width, TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', title, SP.s5, SP.s4,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const cap = text(tb, 'Toolbar caption', showing, SP.s5, SP.s4 + 21.25 + SP.s05,
    { size: FS.xs, color: C.slate500 });
  // "Showing <N>" is bolder slate-900 in source — mirror it as a range style.
  const m = /^Showing (\S+)/.exec(showing);
  if (m) {
    cap.setRangeFills(8, 8 + m[1].length, fill(C.slate900));
    cap.setRangeFontName(8, 8 + m[1].length, { family: FONT.family, style: FONT.medium });
  }

  const ctlY = (TOOLBAR_H - 34) / 2;
  let right = card.width - SP.s5;

  if (withFilters) {
    const fw = filterCount > 0 ? 116.5 : 90.5;
    const fb = frame(tb, 'Button - Filters', right - fw, ctlY, fw, SP.s9,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    icon(fb, 'Icon', I.filters, SP.s3, (SP.s9 - 14.875) / 2, 14.875, C.slate500, 2);
    text(fb, 'Label', 'Filters', SP.s3 + 14.875 + SP.s2, (SP.s9 - FS.t13 * 1.3) / 2,
      { size: FS.t13, weight: FONT.medium, color: C.slate700, lh: FS.t13 * 1.3 });
    if (filterCount > 0) {
      const badge = frame(fb, 'Active count', fw - SP.s3 - SP.s5, (SP.s9 - SP.s5) / 2, SP.s5, SP.s5,
        { bg: C.brand500, radius: RAD.full });
      const bt = text(badge, 'Count', String(filterCount), 0, 0,
        { size: FS.t10_5, weight: FONT.semibold, color: C.white });
      centerIn(bt, { x: 0, y: 0, w: SP.s5, h: SP.s5 });
    }
    right -= fw + SP.s2;
  }

  const searchW = 306;  // w-72 @ 17px root
  const sb = frame(tb, 'Search field', right - searchW, ctlY, searchW, 34,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(sb, 'Icon · search', I.search, SP.s3, (34 - 17) / 2, 17, C.slate400, 2);
  text(sb, 'Placeholder', placeholder, SP.s3 + 17 + SP.s2, (34 - FS.sm * 1.35) / 2,
    { size: FS.sm, color: C.slate400, lh: FS.sm * 1.35 });
  return tb;
}

/** Pagination footer. */
function buildPager(card, y, summary, page, totalPages) {
  const p = frame(card, 'Pagination', 0, y, card.width, PAGER_H);
  hairline(p, 'Border top', 0, 0, card.width, C.slate100);
  text(p, 'Summary', summary, SP.s5, (PAGER_H - FS.t12 * 1.4) / 2,
    { size: FS.t12, color: C.slate500, lh: FS.t12 * 1.4 });

  const chipH = 29.75;   // h-7
  const cy = (PAGER_H - chipH) / 2;
  let x = card.width - SP.s5;

  const next = frame(p, 'Button - Next', x - 66, cy, 66, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(next, 'Label', 'Next', SP.s2_5, (chipH - FS.t12 * 1.4) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700, lh: FS.t12 * 1.4 });
  icon(next, 'Icon', I.chevronRight, 66 - SP.s2_5 - 12.75, (chipH - 12.75) / 2, 12.75, C.slate700, 2);
  x -= 66 + SP.s1;

  for (let n = totalPages; n >= 1; n--) {
    const isActive = n === page;
    const cw = 29.75;
    const chip = frame(p, 'Page chip ' + n, x - cw, cy, cw, chipH, {
      bg: isActive ? C.brand500 : C.white, radius: RAD.lg,
      stroke: isActive ? undefined : C.slate200,
    });
    const ct = text(chip, 'Number', String(n), 0, 0, {
      size: FS.t12, color: isActive ? C.white : C.slate700,
      weight: isActive ? FONT.medium : FONT.regular,
    });
    centerIn(ct, { x: 0, y: 0, w: cw, h: chipH });
    x -= cw + SP.s1;
  }
  x -= SP.s1;

  const prev = frame(p, 'Button - Previous', x - 92, cy, 92, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  prev.opacity = page === 1 ? 0.4 : 1;
  icon(prev, 'Icon', I.chevronLeft, SP.s2_5, (chipH - 12.75) / 2, 12.75, C.slate700, 2);
  text(prev, 'Label', 'Previous', SP.s2_5 + 12.75 + SP.s1, (chipH - FS.t12 * 1.4) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700, lh: FS.t12 * 1.4 });
  return p;
}

/** Kebab trigger drawn inside a row's sticky actions cell. */
function kebab(parent, x, y, open) {
  const b = frame(parent, 'Button - Row actions', x, y, 29.75, 29.75,
    { bg: open ? C.slate100 : undefined, radius: RAD.lg });
  const col = open ? C.slate900 : C.slate500;
  for (let i = 0; i < 3; i++) {
    rect(b, 'Dot', 29.75 / 2 - 1.5, 8 + i * 5.5, 3, 3, { bg: col, radius: RAD.full });
  }
  return b;
}

/* ── 8. Passenger tickets table ────────────────────────────────────────── */

// Column x/width inside the 1280px table (min-w-[1280px]); the scroll
// viewport is 1117px wide, so Class/Amount sit off-screen exactly as they do
// in the browser, with the sticky actions cell floating over the right edge.
const PAX_TABLE_W = 1280;
const PAX_COLS = [
  { key: 'tn',    label: 'Ticket number', x: 0,       w: 157 },
  { key: 'st',    label: 'Status',        x: 157,     w: 113 },
  { key: 'name',  label: 'Passenger',     x: 270,     w: 143, sortable: true },
  { key: 'ref',   label: 'Booking ref',   x: 413,     w: 141 },
  { key: 'route', label: 'Route',         x: 554,     w: 232.25 },
  { key: 'dep',   label: 'Departure',     x: 786.25,  w: 201, sortable: true },
  { key: 'cls',   label: 'Class',         x: 987.25,  w: 109 },
  { key: 'amt',   label: 'Amount',        x: 1096.25, w: 103 },
];
const ACTIONS_W = 80.75;   // px-6 + h-7 + px-6

function copyableId(parent, value, x, y, copied) {
  const t = text(parent, 'Value', value, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54, lh: FS.t12_5 * 1.4 });
  const bx = x + t.width + SP.s1_5;
  const b = frame(parent, copied ? 'Copied indicator' : 'Button - Copy', bx, y - 2, SP.s5, SP.s5,
    { radius: RAD.md });
  icon(b, 'Icon', copied ? I.check : I.copy, (SP.s5 - 14.875) / 2, (SP.s5 - 14.875) / 2,
    14.875, copied ? C.emerald600 : C.slate400, copied ? 2.5 : 1.75);
  return t;
}

function routeCell(parent, r, x, y) {
  text(parent, 'Origin code', r.oc, x, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3, lh: FS.t13 * 1.3 });
  text(parent, 'Origin city', '(' + r.ocity + ')', x, y + FS.t13 * 1.3 + SP.s05,
    { size: FS.t11, color: C.slate400, lh: FS.t11 * 1.3 });
  const ax = x + 46;
  icon(parent, 'Icon · arrow', I.arrowRight, ax, y + 9, 14.875, C.slate300, 2);
  const dx = ax + 14.875 + SP.s2_5;
  text(parent, 'Destination code', r.dc, dx, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3, lh: FS.t13 * 1.3 });
  text(parent, 'Destination city', '(' + r.dcity + ')', dx, y + FS.t13 * 1.3 + SP.s05,
    { size: FS.t11, color: C.slate400, lh: FS.t11 * 1.3 });
}

/**
 * buildPaxTable(parent, y, opts)
 * opts: { rows, showing, total, filterCount, menuRowIndex, copiedRowIndex,
 *         emptyMessage, page, totalPages, searchValue }
 */
function buildPaxTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 96.5;
  const cardH = TOOLBAR_H + THEAD_H + bodyH + (o.hidePager ? 0 : PAGER_H);

  const card = frame(parent, 'Card - All passenger tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });

  buildToolbar(card, 'All passenger tickets', o.showing,
    o.searchValue || 'Search ticket, passenger, or booking…', true, o.filterCount || 0);
  if (o.searchValue) {
    // A typed query renders as slate-900 body text, not the slate-400 placeholder.
    const ph = card.findOne((n) => n.name === 'Placeholder');
    if (ph) ph.fills = fill(C.slate900);
  }

  // Scroll viewport — overflow-x-auto at 1117px over a 1280px table.
  const scroll = frame(card, 'Table scroll', 0, TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, PAX_TABLE_W, THEAD_H + bodyH);

  // thead
  const thead = frame(table, 'Table header', 0, 0, PAX_TABLE_W, THEAD_H,
    { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, PAX_TABLE_W, C.slate100);
  PAX_COLS.forEach((c) => {
    const lt = text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + SP.s6, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96, lh: FS.t11 * 1.35 });
    if (c.sortable) {
      icon(thead, 'Icon · sort', I.sort, c.x + SP.s6 + lt.width + SP.s1_5, SP.s3 + 2,
        12.75, C.slate300, 2);
    }
  });

  // tbody
  const tbody = frame(table, 'Table body', 0, THEAD_H, PAX_TABLE_W, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'Empty filter message', o.emptyMessage || 'No tickets match your filters.',
      0, 0, { size: FS.sm, color: C.slate400, width: PAX_TABLE_W, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }
  rows.forEach((r, i) => {
    const row = frame(tbody, 'Row · ' + (r.tn || r.ref), 0, i * ROW_H, PAX_TABLE_W, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, PAX_TABLE_W, C.slate100);
    const isMenu = o.menuRowIndex === i;
    if (isMenu) {
      row.fills = fill(C.slate50, 0.6);
      rect(row, 'Hover accent', 0, 0, 3, ROW_H, { bg: C.brand500 });
    }
    const cy = (ROW_H - 19) / 2;   // vertical middle of a single-line cell

    // Ticket number
    if (r.tn) copyableId(row, r.tn, PAX_COLS[0].x + SP.s6, cy, o.copiedRowIndex === i);
    else text(row, 'No ticket number', '—', PAX_COLS[0].x + SP.s6, cy,
      { size: FS.sm, color: C.slate300 });

    // Status
    const tone = TICKET_TONE[r.st];
    statusPill(row, 'Status pill', PAX_COLS[1].x + SP.s6, (ROW_H - 17) / 2, tone);

    // Passenger (+ removed-by-customer marker)
    if (r.removed) {
      text(row, 'Passenger name', r.name, PAX_COLS[2].x + SP.s6, cy - 8,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
      icon(row, 'Icon · removed', I.userRemoved, PAX_COLS[2].x + SP.s6, cy + 12, 12.75, C.amber700, 2);
      text(row, 'Removed note', 'Removed by customer', PAX_COLS[2].x + SP.s6 + 12.75 + SP.s1, cy + 11,
        { size: FS.t10_5, weight: FONT.medium, color: C.amber700 });
    } else {
      text(row, 'Passenger name', r.name, PAX_COLS[2].x + SP.s6, cy,
        { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    }

    // Booking ref
    copyableId(row, r.ref, PAX_COLS[3].x + SP.s6, cy, false);

    // Route
    routeCell(row, r, PAX_COLS[4].x + SP.s6, (ROW_H - 36) / 2);

    // Departure
    const dt = text(row, 'Departure date', r.dep, PAX_COLS[5].x + SP.s6, cy,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', r.tm, PAX_COLS[5].x + SP.s6 + dt.width + SP.s1_5, cy,
      { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    // Class
    text(row, 'Fare class', r.cls, PAX_COLS[6].x + SP.s6, cy,
      { size: FS.t12_5, weight: FONT.medium, color: C.slate700, tracking: -0.2 });

    // Amount / comped
    if (r.comped) {
      const cp = frame(row, 'Comped pill', PAX_COLS[7].x + SP.s6, (ROW_H - 17) / 2, 84, 17,
        { bg: C.sky50, radius: RAD.md, stroke: C.sky700, strokeOpacity: 0.15 });
      icon(cp, 'Icon', I.comped, SP.s1_5, (17 - 10.625) / 2, 10.625, C.sky700, 2);
      text(cp, 'Label', 'COMPED', SP.s1_5 + 10.625 + SP.s1, 2.125,
        { size: FS.t10, weight: FONT.semibold, color: C.sky700, tracking: 0.96, lh: FS.t10 * 1.35 });
    } else {
      text(row, 'Amount', r.amt, PAX_COLS[7].x + SP.s6, cy,
        { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
    }
  });

  // Sticky actions column — pinned to the viewport's right edge, over the table.
  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - ACTIONS_W, 0,
    ACTIONS_W, THEAD_H + bodyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, THEAD_H + bodyH, { bg: C.slate900, opacity: 0.04 });
  const sh = frame(sticky, 'Header cell', 0, 0, ACTIONS_W, THEAD_H, { bg: C.slate50, opacity: 0.7 });
  hairline(sh, 'Border bottom', 0, THEAD_H - 1, ACTIONS_W, C.slate100);
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, THEAD_H + i * ROW_H, ACTIONS_W, ROW_H,
      { bg: o.menuRowIndex === i ? C.slate50 : C.white, opacity: 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, ACTIONS_W, C.slate100);
    kebab(cell, SP.s6, (ROW_H - 29.75) / 2, o.menuRowIndex === i);
  });

  if (!o.hidePager) {
    buildPager(card, TOOLBAR_H + THEAD_H + bodyH, o.pagerSummary, o.page || 1, o.totalPages || 1);
  }
  return card;
}

/* ── 9. Vehicle tickets table ──────────────────────────────────────────── */

const VEH_TABLE_W = 1240;
const VEH_COLS = [
  { key: 'tn',     label: 'Ticket number',   x: 0,      w: 157 },
  { key: 'st',     label: 'Status',          x: 157,    w: 113 },
  { key: 'holder', label: 'Ticketholder',    x: 270,    w: 161 },
  { key: 'ref',    label: 'Booking ref',     x: 431,    w: 141 },
  { key: 'veh',    label: 'Vehicle & class', x: 572,    w: 156 },
  { key: 'route',  label: 'Route',           x: 728,    w: 205 },
  { key: 'dep',    label: 'Departure',       x: 933,    w: 201 },
  { key: 'amt',    label: 'Amount',          x: 1134,   w: 106 },
];

function buildVehTable(parent, y, opts) {
  const o = opts || {};
  const rows = o.rows || [];
  const bodyH = rows.length ? rows.length * ROW_H : 96.5;
  const cardH = TOOLBAR_H + THEAD_H + bodyH + (o.hidePager ? 0 : PAGER_H);

  const card = frame(parent, 'Card - All vehicle tickets', 0, y, CONTENT_W, cardH, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW, clip: true,
  });

  buildToolbar(card, 'All vehicle tickets', o.showing,
    o.searchValue || 'Search ticket, plate, or booking…', false, 0);
  if (o.searchValue) {
    const ph = card.findOne((n) => n.name === 'Placeholder');
    if (ph) ph.fills = fill(C.slate900);
  }

  const scroll = frame(card, 'Table scroll', 0, TOOLBAR_H, CONTENT_W, THEAD_H + bodyH, { clip: true });
  const table = frame(scroll, 'Table', 0, 0, VEH_TABLE_W, THEAD_H + bodyH);

  const thead = frame(table, 'Table header', 0, 0, VEH_TABLE_W, THEAD_H,
    { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, VEH_TABLE_W, C.slate100);
  VEH_COLS.forEach((c) => {
    text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + SP.s6, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96, lh: FS.t11 * 1.35 });
  });

  const tbody = frame(table, 'Table body', 0, THEAD_H, VEH_TABLE_W, bodyH);
  if (!rows.length) {
    const msg = text(tbody, 'Empty filter message',
      o.emptyMessage || 'No vehicle tickets match your search.', 0, 0,
      { size: FS.sm, color: C.slate400, width: VEH_TABLE_W, align: 'CENTER' });
    msg.y = (bodyH - msg.height) / 2;
  }
  rows.forEach((r, i) => {
    const row = frame(tbody, 'Row · ' + (r.tn || r.ref), 0, i * ROW_H, VEH_TABLE_W, ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, VEH_TABLE_W, C.slate100);
    if (o.menuRowIndex === i) row.fills = fill(C.slate50, 0.6);
    const cy = (ROW_H - 19) / 2;

    if (r.tn) copyableId(row, r.tn, VEH_COLS[0].x + SP.s6, cy, o.copiedRowIndex === i);
    else text(row, 'No ticket number', '—', VEH_COLS[0].x + SP.s6, cy,
      { size: FS.sm, color: C.slate300 });

    statusPill(row, 'Status pill', VEH_COLS[1].x + SP.s6, (ROW_H - 17) / 2, BOOKING_TONE[r.st]);

    text(row, 'Ticketholder', r.holder, VEH_COLS[2].x + SP.s6, cy,
      { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

    copyableId(row, r.ref, VEH_COLS[3].x + SP.s6, cy, false);

    text(row, 'Vehicle', r.make + ' ' + r.model, VEH_COLS[4].x + SP.s6, (ROW_H - 36) / 2,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3, lh: FS.t13 * 1.3 });
    text(row, 'Vehicle class', r.cls, VEH_COLS[4].x + SP.s6, (ROW_H - 36) / 2 + FS.t13 * 1.3 + SP.s05,
      { size: FS.t11, color: C.slate400, lh: FS.t11 * 1.3 });

    routeCell(row, r, VEH_COLS[5].x + SP.s6, (ROW_H - 36) / 2);

    const dt = text(row, 'Departure date', r.dep, VEH_COLS[6].x + SP.s6, cy,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
    text(row, 'Departure time', r.tm, VEH_COLS[6].x + SP.s6 + dt.width + SP.s1_5, cy,
      { size: FS.t13, weight: FONT.medium, color: C.slate600 });

    text(row, 'Amount', r.amt, VEH_COLS[7].x + SP.s6, cy,
      { size: FS.t12_5, weight: FONT.semibold, color: C.slate900 });
  });

  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - ACTIONS_W, 0,
    ACTIONS_W, THEAD_H + bodyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, THEAD_H + bodyH, { bg: C.slate900, opacity: 0.04 });
  const sh = frame(sticky, 'Header cell', 0, 0, ACTIONS_W, THEAD_H, { bg: C.slate50, opacity: 0.7 });
  hairline(sh, 'Border bottom', 0, THEAD_H - 1, ACTIONS_W, C.slate100);
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, THEAD_H + i * ROW_H, ACTIONS_W, ROW_H,
      { bg: o.menuRowIndex === i ? C.slate50 : C.white, opacity: 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, ACTIONS_W, C.slate100);
    kebab(cell, SP.s6, (ROW_H - 29.75) / 2, o.menuRowIndex === i);
  });

  if (!o.hidePager) {
    buildPager(card, TOOLBAR_H + THEAD_H + bodyH, o.pagerSummary, o.page || 1, o.totalPages || 1);
  }
  return card;
}

/* ── 10. Shared state surfaces ─────────────────────────────────────────── */

/** TableSkeleton — note it uses the legacy `card` class (gray-200 bars). */
function buildSkeleton(parent, y, rowCount) {
  const headerH = 66.25, colsH = 46.75, rowH = 63.75;
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

/** EmptyState — dashed rounded-2xl panel, min-h-[400px]. */
function buildEmptyState(parent, y, title, body) {
  const h = 400;
  const panel = frame(parent, 'Empty state', 0, y, CONTENT_W, h, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, clip: true,
  });
  panel.dashPattern = [6, 4];

  const badgeS = 51;   // h-12 w-12
  const badge = frame(panel, 'Icon badge', (CONTENT_W - badgeS) / 2, 0, badgeS, badgeS,
    { bg: C.slate100, radius: RAD.full, stroke: C.slate200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', I.inbox, (badgeS - 25.5) / 2, (badgeS - 25.5) / 2, 25.5, C.slate400, 1.5);

  const t = text(panel, 'Title', title, 0, 0,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3,
      width: CONTENT_W, align: 'CENTER' });
  const b = text(panel, 'Body', body, (CONTENT_W - 448) / 2, 0,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * 1.6, width: 448, align: 'CENTER' });

  const block = badgeS + SP.s4 + t.height + SP.s1_5 + b.height;
  const top = (h - block) / 2;
  badge.y = top;
  t.y = top + badgeS + SP.s4;
  b.y = t.y + t.height + SP.s1_5;
  return panel;
}

/** RowMenu popover — portaled w-52 surface, opens 6px below the trigger. */
function buildRowMenu(parent, triggerX, triggerY, items) {
  const W = 221;  // w-52 @ 17px root
  const ITEM_H = 32;
  const h = items.length * ITEM_H + 8;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, triggerY + 29.75 + 6, W, h, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true,
    shadow: [{
      type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.25 },
      offset: { x: 0, y: 18 }, radius: 44, spread: -16, visible: true, blendMode: 'NORMAL',
    }],
  });
  items.forEach((it, i) => {
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H - 2,
      { radius: RAD.md });
    const col = it.disabled ? C.slate300 : it.danger ? C.rose600 : C.slate700;
    icon(tile, 'Icon', it.ic, SP.s2, (ITEM_H - 2 - 17) / 2, 17, col, 1.75);
    text(tile, 'Label', it.label, SP.s2 + 17 + SP.s2, (ITEM_H - 2 - FS.t12_5 * 1.4) / 2,
      { size: FS.t12_5, weight: FONT.medium, color: col, lh: FS.t12_5 * 1.4 });
  });
  return menu;
}

/** Dim scrim behind a dialog — bg-black/55 over the whole 1440x900 frame. */
function buildScrim(parent, opacity) {
  return rect(parent, 'Scrim', 0, 0, FRAME_W, FRAME_H,
    { bg: C.black, opacity: opacity === undefined ? 0.55 : opacity });
}

/** Route summary card used by both detail dialogs. */
function buildRouteSummary(parent, x, y, w, r, etd) {
  const topH = etd ? 96 : 74;
  const card = frame(parent, 'Route summary', x, y, w, topH + 62.5,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true });

  const mid = w / 2;
  text(card, 'Origin code', r.oc, 0, SP.s4,
    { size: 21.25, weight: FONT.bold, color: C.slate900, tracking: 1.28,
      width: mid - 110, align: 'CENTER' });
  text(card, 'Origin city', r.ocity, 0, SP.s4 + 27 + SP.s05,
    { size: FS.t11, color: C.slate500, width: mid - 110, align: 'CENTER' });

  icon(card, 'Icon · leg', I.arrowRight, mid - 96, SP.s4 + 12, 17, C.slate300, 1.5);

  const tile = frame(card, 'Line logo', mid - 17, SP.s4 + 2, SP.s8, SP.s8,
    { bg: C.brand600, radius: RAD.md });
  const ti = text(tile, 'Initials', 'TP', 0, 0, { size: FS.t11, weight: FONT.bold, color: C.white });
  centerIn(ti, { x: 0, y: 0, w: SP.s8, h: SP.s8 });
  text(card, 'Line name', 'Tripket PH', mid - 60, SP.s4 + 2 + SP.s8 + SP.s1,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, width: 120, align: 'CENTER' });

  icon(card, 'Icon · leg', I.arrowRight, mid + 79, SP.s4 + 12, 17, C.slate300, 1.5);

  text(card, 'Destination code', r.dc, mid + 110, SP.s4,
    { size: 21.25, weight: FONT.bold, color: C.slate900, tracking: 1.28,
      width: mid - 110, align: 'CENTER' });
  text(card, 'Destination city', r.dcity, mid + 110, SP.s4 + 27 + SP.s05,
    { size: FS.t11, color: C.slate500, width: mid - 110, align: 'CENTER' });

  if (etd) {
    text(card, 'ETD caption', '( ' + etd + ' )', 0, topH - 22,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: -0.2,
        width: w, align: 'CENTER' });
  }

  hairline(card, 'Border top', 0, topH, w, C.slate100);
  rect(card, 'Divider', w / 2, topH, 1, 62.5, { bg: C.slate100 });
  text(card, 'Departure label', 'DEPARTURE', SP.s4, topH + SP.s3,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(card, 'Departure date', r.dep, SP.s4, topH + SP.s3 + 15 + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(card, 'Departure time', r.tm, SP.s4, topH + SP.s3 + 15 + SP.s1 + 19,
    { size: FS.t11_5, weight: FONT.medium, color: C.slate600 });
  text(card, 'Vessel label', 'VESSEL', w / 2 + SP.s4, topH + SP.s3,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(card, 'Vessel name', r.vessel, w / 2 + SP.s4, topH + SP.s3 + 15 + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  return card;
}

function fieldPair(parent, label, value, x, y, opts) {
  const o = opts || {};
  text(parent, 'Label', label, x, y, { size: FS.t10_5, color: C.slate500 });
  text(parent, 'Value', value, x, y + 15 + SP.s05, {
    size: o.size || FS.t12_5,
    weight: o.weight || FONT.medium,
    color: C.slate900,
    tracking: o.tracking,
  });
}

/** Requirement / document row with thumbnail + status pill. */
function docRow(parent, x, y, w, label, uploaded, sublabel) {
  const row = frame(parent, 'Doc row · ' + label, x, y, w, 42.5);
  const thumbS = 42.5;
  const thumb = frame(row, 'Thumbnail', 0, 0, thumbS, thumbS, {
    bg: uploaded ? C.slate100 : C.slate50, radius: RAD.md,
    stroke: C.slate200, strokeOpacity: uploaded ? 1 : 0.9,
  });
  if (!uploaded) thumb.dashPattern = [3, 3];
  icon(thumb, 'Icon', uploaded ? I.photo : I.image, (thumbS - 17) / 2, (thumbS - 17) / 2, 17,
    uploaded ? C.slate400 : C.slate300, 1.75);

  text(row, 'Label', label, thumbS + SP.s2_5, 6,
    { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(row, 'Required', sublabel || 'REQUIRED', thumbS + SP.s2_5, 24,
    { size: FS.t10, weight: FONT.medium, color: C.slate400, tracking: 0.88 });

  const pw = uploaded ? 84 : 72;
  const pill = frame(row, 'Status pill', w - pw, (42.5 - 17) / 2, pw, 17, {
    bg: uploaded ? C.emerald50 : C.slate100, radius: RAD.md,
  });
  if (uploaded) icon(pill, 'Icon', I.check, SP.s2, (17 - 12.75) / 2, 12.75, C.emerald700, 2.5);
  text(pill, 'Label', uploaded ? 'UPLOADED' : 'MISSING', uploaded ? SP.s2 + 12.75 + SP.s1 : SP.s2, 2.125,
    { size: FS.t10, weight: FONT.semibold, color: uploaded ? C.emerald700 : C.slate500,
      tracking: 0.88, lh: FS.t10 * 1.35 });
  return row;
}

/* ── 11. Detail dialogs ────────────────────────────────────────────────── */

/** TicketDetailDialog — max-w-3xl body + 280px activity rail. */
function buildTicketDialog(parent) {
  buildScrim(parent);
  const W = 816;               // max-w-3xl
  const H = 810;               // max-h-[90vh]
  const dlg = frame(parent, 'Dialog - Ticket detail', (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true,
    shadow: [{
      type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.35 },
      offset: { x: 0, y: 30 }, radius: 80, spread: -20, visible: true, blendMode: 'NORMAL',
    }],
  });

  const railW = 280;
  const bodyW = W - railW;
  const left = frame(dlg, 'Ticket content', 0, 0, bodyW, H, { clip: true });

  /* Header */
  const headH = 96;
  const head = frame(left, 'Header', 0, 0, bodyW, headH);
  hairline(head, 'Border bottom', 0, headH - 1, bodyW, C.slate100);
  const tn = text(head, 'Ticket number', 'TKT-0001-A', SP.s6, SP.s5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  const cb = frame(head, 'Button - Copy', SP.s6 + tn.width + SP.s2, SP.s5 - 2, SP.s5, SP.s5,
    { radius: RAD.md });
  icon(cb, 'Icon', I.copy, (SP.s5 - 14.875) / 2, (SP.s5 - 14.875) / 2, 14.875, C.slate400, 1.75);
  statusPill(head, 'Status pill', SP.s6 + tn.width + SP.s2 + SP.s5 + SP.s2, SP.s5 - 1, TICKET_TONE.Issued);
  text(head, 'Passenger name', 'Maria Santos', SP.s6, SP.s5 + 19 + SP.s1_5,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  const sub = text(head, 'Booking caption', 'Under booking TKT-0001', SP.s6, SP.s5 + 19 + SP.s1_5 + 25,
    { size: FS.t12, color: C.slate500 });
  sub.setRangeFills(14, 22, fill(C.slate700));
  sub.setRangeFontName(14, 22, { family: FONT.family, style: FONT.medium });
  const close = frame(head, 'Button - Close', bodyW - SP.s6 - SP.s8, SP.s5, SP.s8, SP.s8,
    { radius: RAD.full });
  icon(close, 'Icon', I.close, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.slate400, 1.75);

  /* Scroll body */
  const footH = 62;
  const bodyH = H - headH - footH;
  const body = frame(left, 'Body', 0, headH, bodyW, bodyH, { clip: true });
  const inner = frame(body, 'Container', SP.s6, SP.s5, bodyW - SP.s6 * 2, 900);
  const iw = inner.width;
  let by = 0;

  const rs = buildRouteSummary(inner, 0, by, iw,
    { oc: 'CEB', ocity: 'Cebu City', dc: 'DGT', dcity: 'Dumaguete City',
      dep: 'Aug 14, 2026', tm: '08:00 AM', vessel: 'MV Filipinas Cebu' },
    'ETD 3h 20m');
  by += rs.height + SP.s5;

  /* Passenger card */
  const pc = frame(inner, 'Passenger details', 0, by, iw, 152,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(pc, 'Section label', 'PASSENGER', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const colW = (iw - SP.s4 * 2 - SP.s4) / 2;
  const fy = SP.s4 + 18 + SP.s2;
  fieldPair(pc, 'Gender', 'Female', SP.s4, fy);
  fieldPair(pc, 'Age', '34', SP.s4 + colW + SP.s4, fy);
  fieldPair(pc, 'Nationality', 'Filipino', SP.s4, fy + 42);
  text(pc, 'Label', 'ID', SP.s4 + colW + SP.s4, fy + 42, { size: FS.t10_5, color: C.slate500 });
  text(pc, 'ID type', "Driver's License", SP.s4 + colW + SP.s4, fy + 42 + 17,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(pc, 'ID ref', 'N01-23-456789', SP.s4 + colW + SP.s4, fy + 42 + 34,
    { size: FS.t11_5, weight: FONT.medium, color: C.slate500 });
  fieldPair(pc, 'Phone (Optional)', '+63 917 555 0142', SP.s4, fy + 88);
  fieldPair(pc, 'Email (Optional)', 'maria.santos@email.com', SP.s4 + colW + SP.s4, fy + 88);
  by += pc.height + SP.s5;

  /* Valid ID photos */
  const idc = frame(inner, 'Valid ID photos', 0, by, iw, 136,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(idc, 'Section label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  docRow(idc, SP.s4, SP.s4 + 18 + SP.s2, iw - SP.s4 * 2, "Driver's License — Front", true);
  docRow(idc, SP.s4, SP.s4 + 18 + SP.s2 + 42.5 + SP.s1_5, iw - SP.s4 * 2, "Driver's License — Back", false);
  by += idc.height + SP.s5;

  /* Payment information */
  const pay = frame(inner, 'Payment information', 0, by, iw, 268, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true,
  });
  const payHead = frame(pay, 'Header', 0, 0, iw, 38, { bg: C.slate50, opacity: 0.6 });
  hairline(payHead, 'Border bottom', 0, 37, iw, C.slate100);
  text(payHead, 'Title', 'PAYMENT INFORMATION', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  statusPill(payHead, 'Pay status', iw - SP.s4 - 58, (38 - 17) / 2,
    { bg: C.emerald100, fg: C.emerald800, label: 'Issued' });

  const bookedH = 60;
  const booked = frame(pay, 'Booked on', 0, 38, iw, bookedH);
  hairline(booked, 'Border bottom', 0, bookedH - 1, iw, C.slate100);
  text(booked, 'Label', 'BOOKED ON', SP.s4, SP.s3,
    { size: FS.t10, weight: FONT.medium, color: C.slate500, tracking: 0.88 });
  text(booked, 'Value', 'Aug 9, 2026', SP.s4, SP.s3 + 15 + SP.s1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  text(pay, 'Breakdown caption', 'Regular · Economy', SP.s4, 38 + bookedH + SP.s2,
    { size: FS.t11, color: C.slate500 });

  const lines = [
    ['Base Fare', '₱1,240', false, C.slate900],
    ['Discount', '₱0', false, C.slate900],
    ['Service Fee', '₱0', false, C.slate900],
    ['Sub total', '₱1,240', true, C.slate900],
  ];
  let ly = 38 + bookedH + SP.s2 + 20;
  lines.forEach((l, i) => {
    const lh = 38;
    const lrow = frame(pay, 'Pay line · ' + l[0], SP.s4, ly, iw - SP.s4 * 2, lh);
    if (i > 0) hairline(lrow, 'Divider', 0, 0, iw - SP.s4 * 2, C.slate100);
    text(lrow, 'Label', l[0], 0, (lh - 19) / 2,
      { size: FS.t12_5, weight: l[2] ? FONT.semibold : FONT.regular, color: l[2] ? C.slate900 : C.slate600 });
    const v = text(lrow, 'Value', l[1], 0, (lh - 19) / 2,
      { size: l[2] ? FS.t13 : FS.t12_5, weight: l[2] ? FONT.semibold : FONT.regular, color: l[3] });
    v.x = iw - SP.s4 * 2 - v.width;
    ly += lh;
  });

  const totalH = 74;
  const total = frame(pay, 'Total strip', 0, ly, iw, totalH, { bg: C.slate50, opacity: 0.6 });
  hairline(total, 'Border top', 0, 0, iw, C.slate100);
  text(total, 'Label', 'TOTAL AMOUNT', SP.s4, SP.s3,
    { size: FS.t10_5, weight: FONT.medium, color: C.slate500, tracking: 0.92 });
  const tv = text(total, 'Value', '₱1,240', 0, SP.s3 - 4,
    { size: FS.t17 - 2, weight: FONT.bold, color: C.slate900, tracking: -0.4 });
  tv.x = iw - SP.s4 - tv.width;
  text(total, 'Remarks label', 'REMARKS', SP.s4, SP.s3 + 24,
    { size: FS.t10_5, weight: FONT.medium, color: C.slate500, tracking: 0.92 });
  text(total, 'Remarks value', 'Issued at Cebu terminal counter 3.', SP.s4, SP.s3 + 24 + 16,
    { size: FS.t12, color: C.slate700, lh: FS.t12 * 1.6 });
  pay.resize(iw, ly + totalH);
  by += pay.height + SP.s5;
  inner.resize(iw, by);

  /* Footer */
  const foot = frame(left, 'Footer', 0, H - footH, bodyW, footH, { bg: C.slate50, opacity: 0.6 });
  hairline(foot, 'Border top', 0, 0, bodyW, C.slate100);
  const closeBtn = frame(foot, 'Button - Close', SP.s6, (footH - 32) / 2, 62, 32, { radius: RAD.lg });
  text(closeBtn, 'Label', 'Close', SP.s3, (32 - 19) / 2,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });
  const goW = 116;
  const upW = 138;
  const go = frame(foot, 'Button - Go to booking', bodyW - SP.s6 - upW - SP.s2 - goW,
    (footH - 32) / 2, goW, 32, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  const gt = text(go, 'Label', 'Go to booking', 0, 0,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });
  centerIn(gt, { x: 0, y: 0, w: goW, h: 32 });
  const up = frame(foot, 'Button - Update status', bodyW - SP.s6 - upW, (footH - 32) / 2, upW, 32,
    { bg: C.brand500, radius: RAD.lg });
  text(up, 'Label', 'UPDATE STATUS', SP.s3, (32 - 19) / 2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white, tracking: 0.54 });
  icon(up, 'Icon', I.chevronDown, upW - SP.s3 - 14.875, (32 - 14.875) / 2, 14.875, C.white, 2);

  /* Activity rail */
  const rail = frame(dlg, 'Activity log', bodyW, 0, railW, H, { clip: true });
  rect(rail, 'Border left', 0, 0, 1, H, { bg: C.slate100 });
  text(rail, 'Rail title', 'ACTIVITY', SP.s4 + 1, SP.s5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const entries = [
    ['Ticket marked paid', 'Ticket no. TKT-0001-A · Maria Santos', 'Aug 10, 2026 · 09:14'],
    ['Passenger details updated', 'Contact email changed', 'Aug 9, 2026 · 16:02'],
    ['Booking created', 'Web · 2 passengers', 'Aug 9, 2026 · 15:48'],
  ];
  let ey = SP.s5 + 18 + SP.s5;
  entries.forEach((e) => {
    rect(rail, 'Timeline dot', SP.s4 + 1, ey + 5, 7, 7, { bg: C.brand500, radius: RAD.full });
    rect(rail, 'Timeline line', SP.s4 + 4, ey + 12, 1, 54, { bg: C.slate200 });
    text(rail, 'Entry title', e[0], SP.s4 + 1 + 17, ey,
      { size: FS.t12, weight: FONT.medium, color: C.slate900, width: railW - SP.s4 * 2 - 17 });
    text(rail, 'Entry detail', e[1], SP.s4 + 1 + 17, ey + 18,
      { size: FS.t11, color: C.slate500, width: railW - SP.s4 * 2 - 17, lh: FS.t11 * 1.5 });
    text(rail, 'Entry time', e[2], SP.s4 + 1 + 17, ey + 38,
      { size: FS.t10, color: C.slate400 });
    ey += 66;
  });
  return dlg;
}

/** VehicleDetailDialog — Modal maxWidth="max-w-xl". */
function buildVehicleDialog(parent) {
  buildScrim(parent);
  const W = 640;               // max-w-xl
  const H = 792;               // max-h-[88vh]
  const dlg = frame(parent, 'Dialog - Vehicle detail', (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true,
    shadow: [{
      type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.35 },
      offset: { x: 0, y: 30 }, radius: 80, spread: -20, visible: true, blendMode: 'NORMAL',
    }],
  });

  const headH = 96;
  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  const tn = text(head, 'Ticket number', 'TKT-0003-V', SP.s6, SP.s5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  statusPill(head, 'Status pill', SP.s6 + tn.width + SP.s2, SP.s5 - 1, BOOKING_TONE.Confirmed);
  text(head, 'Contact email', 'carlos.mendoza@email.com', SP.s6, SP.s5 + 19 + SP.s1_5,
    { size: FS.t17, weight: FONT.semibold, color: C.slate900, tracking: -0.4 });
  const sub = text(head, 'Booking caption', 'Under booking TKT-0003', SP.s6, SP.s5 + 19 + SP.s1_5 + 25,
    { size: FS.t12, color: C.slate500 });
  sub.setRangeFills(14, 22, fill(C.slate700));
  sub.setRangeFontName(14, 22, { family: FONT.family, style: FONT.medium });
  const close = frame(head, 'Button - Close', W - SP.s6 - SP.s8, SP.s5, SP.s8, SP.s8, { radius: RAD.full });
  icon(close, 'Icon', I.close, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.slate400, 1.75);

  const footH = 62;
  const body = frame(dlg, 'Body', 0, headH, W, H - headH - footH, { clip: true });
  const inner = frame(body, 'Container', SP.s6, SP.s5, W - SP.s6 * 2, 700);
  const iw = inner.width;
  let by = 0;

  const rs = buildRouteSummary(inner, 0, by, iw,
    { oc: 'ORM', ocity: 'Ormoc City', dc: 'CEB', dcity: 'Cebu City',
      dep: 'Aug 15, 2026', tm: '4:00 PM', vessel: 'MV Reina del Cielo' }, null);
  by += rs.height + SP.s5;

  /* Vehicle card */
  const vc = frame(inner, 'Vehicle', 0, by, iw, 152, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true,
  });
  const vh = frame(vc, 'Header', 0, 0, iw, 38, { bg: C.slate50, opacity: 0.6 });
  hairline(vh, 'Border bottom', 0, 37, iw, C.slate100);
  text(vh, 'Title', 'VEHICLE', SP.s4, SP.s2_5,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const vcolW = (iw - SP.s4 * 2 - SP.s6) / 2;
  fieldPair(vc, 'Make & Model', 'Toyota Fortuner', SP.s4, 38 + SP.s4,
    { size: FS.t13, weight: FONT.semibold, tracking: -0.3 });
  fieldPair(vc, 'Type', 'Medium Vehicle', SP.s4 + vcolW + SP.s6, 38 + SP.s4, { size: FS.t13 });
  fieldPair(vc, 'Plate No.', 'ABC 1234', SP.s4, 38 + SP.s4 + 47,
    { size: FS.t13, weight: FONT.semibold });
  fieldPair(vc, 'Year', '2022', SP.s4 + vcolW + SP.s6, 38 + SP.s4 + 47,
    { size: FS.t13, weight: FONT.semibold });
  by += vc.height + SP.s5;

  /* Valid ID photos */
  const idc = frame(inner, 'Valid ID photos', 0, by, iw, 190,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7 });
  text(idc, 'Section label', 'VALID ID PHOTOS', SP.s4, SP.s4,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  const dy = SP.s4 + 18 + SP.s2;
  docRow(idc, SP.s4, dy, iw - SP.s4 * 2, 'Official Receipt (OR)', true);
  docRow(idc, SP.s4, dy + 48, iw - SP.s4 * 2, 'Certificate of Registration (CR)', true);
  docRow(idc, SP.s4, dy + 96, iw - SP.s4 * 2, 'Vehicle Photo', false);
  by += idc.height + SP.s5;
  inner.resize(iw, by);

  const foot = frame(dlg, 'Footer', 0, H - footH, W, footH, { bg: C.slate50, opacity: 0.6 });
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const closeBtn = frame(foot, 'Button - Close', SP.s6, (footH - 32) / 2, 62, 32, { radius: RAD.lg });
  text(closeBtn, 'Label', 'Close', SP.s3, (32 - 19) / 2,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });
  const goW = 116, upW = 138;
  const go = frame(foot, 'Button - Go to booking', W - SP.s6 - upW - SP.s2 - goW,
    (footH - 32) / 2, goW, 32, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  const gt = text(go, 'Label', 'Go to booking', 0, 0,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });
  centerIn(gt, { x: 0, y: 0, w: goW, h: 32 });
  const up = frame(foot, 'Button - Update status', W - SP.s6 - upW, (footH - 32) / 2, upW, 32,
    { bg: C.brand600, radius: RAD.lg });
  text(up, 'Label', 'UPDATE STATUS', SP.s3, (32 - 19) / 2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white, tracking: 0.54 });
  icon(up, 'Icon', I.chevronDown, upW - SP.s3 - 14.875, (32 - 14.875) / 2, 14.875, C.white, 2);
  return dlg;
}

/* ── 12. The twelve state frames ───────────────────────────────────────── */

const PAX_TITLE = 'Passenger Tickets';
const VEH_TITLE = 'Vehicle Tickets';
const PAX_NAV = 'Passengers';
const VEH_NAV = 'Vehicles';

const PAX_MENU_ITEMS = [
  { label: 'View booking',   ic: I.eye },
  { label: 'Edit passenger', ic: I.pencil },
  { label: 'Mark Issued',    ic: I.check, disabled: true },   // row is already Issued
  { label: 'Refund',         ic: I.refund, disabled: true },  // only from For Refund
  { label: 'Cancel ticket',  ic: I.cancel, danger: true },
];
const VEH_MENU_ITEMS = [
  { label: 'View booking', ic: I.eye },
  { label: 'Edit vehicle', ic: I.pencil },
];

function paxShowing(n, total) { return 'Showing ' + n + ' of ' + total + ' tickets'; }

const BUILDERS = [
  // ── Passenger tickets ────────────────────────────────────────────────
  {
    name: 'Tickets / Passenger tickets / 01 — View passenger tickets — Loading',
    build: (x, y) => {
      const s = buildShell(BUILDERS[0].name, x, y, PAX_TITLE, PAX_NAV);
      buildSkeleton(s.content, s.bodyY, 8);
    },
  },
  {
    name: 'Tickets / Passenger tickets / 02 — View passenger tickets — Empty',
    build: (x, y) => {
      const s = buildShell(BUILDERS[1].name, x, y, PAX_TITLE, PAX_NAV);
      buildEmptyState(s.content, s.bodyY, 'No tickets yet',
        'Tickets appear here once bookings are created. Each passenger gets their own ticket under a booking.');
    },
  },
  {
    name: 'Tickets / Passenger tickets / 03 — View passenger tickets — Default list',
    build: (x, y) => {
      const s = buildShell(BUILDERS[2].name, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, {
        rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3,
      });
    },
  },
  {
    name: 'Tickets / Passenger tickets / 04 — Search ticket TKT-0004 — Results shown',
    build: (x, y) => {
      const s = buildShell(BUILDERS[3].name, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, {
        rows: PAX_ROWS.filter((r) => r.ref === 'TKT-0004'),
        showing: paxShowing(2, 42), filterCount: 0, searchValue: 'TKT-0004',
        hidePager: true,
      });
    },
  },
  {
    name: 'Tickets / Passenger tickets / 05 — Open ticket actions — Menu open',
    build: (x, y) => {
      const s = buildShell(BUILDERS[4].name, x, y, PAX_TITLE, PAX_NAV);
      const card = buildPaxTable(s.content, s.bodyY, {
        rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0, menuRowIndex: 3,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3,
      });
      // Portaled to <body> in the app — parented to the frame here so it
      // floats above the table's overflow container, same as in the browser.
      const triggerX = MAIN_X + CONTENT_X + CONTENT_W - ACTIONS_W + SP.s6;
      const triggerY = TOPBAR_H + CONTENT_Y + s.bodyY + TOOLBAR_H + THEAD_H
        + 3 * ROW_H + (ROW_H - 29.75) / 2;
      buildRowMenu(s.frame, triggerX, triggerY, PAX_MENU_ITEMS);
    },
  },
  {
    name: 'Tickets / Passenger tickets / 06 — Open ticket detail — Dialog open',
    build: (x, y) => {
      const s = buildShell(BUILDERS[5].name, x, y, PAX_TITLE, PAX_NAV);
      buildPaxTable(s.content, s.bodyY, {
        rows: PAX_ROWS, showing: paxShowing(42, 42), filterCount: 0,
        pagerSummary: 'Showing 1–15 of 42 tickets', page: 1, totalPages: 3,
      });
      buildTicketDialog(s.frame);
    },
  },

  // ── Vehicle tickets ──────────────────────────────────────────────────
  {
    name: 'Tickets / Vehicle tickets / 01 — View vehicle tickets — Loading',
    build: (x, y) => {
      const s = buildShell(BUILDERS[6].name, x, y, VEH_TITLE, VEH_NAV);
      buildSkeleton(s.content, s.bodyY, 8);
    },
  },
  {
    name: 'Tickets / Vehicle tickets / 02 — View vehicle tickets — Empty',
    build: (x, y) => {
      const s = buildShell(BUILDERS[7].name, x, y, VEH_TITLE, VEH_NAV);
      buildEmptyState(s.content, s.bodyY, 'No vehicle tickets yet',
        'Vehicle tickets appear here once a booking includes a vehicle.');
    },
  },
  {
    name: 'Tickets / Vehicle tickets / 03 — View vehicle tickets — Default list',
    build: (x, y) => {
      const s = buildShell(BUILDERS[8].name, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, {
        rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2,
      });
    },
  },
  {
    name: 'Tickets / Vehicle tickets / 04 — Search plate ABC 1234 — Results shown',
    build: (x, y) => {
      const s = buildShell(BUILDERS[9].name, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, {
        rows: VEH_ROWS.slice(0, 1), showing: 'Showing 1 of 18 tickets',
        searchValue: 'ABC 1234', hidePager: true,
      });
    },
  },
  {
    name: 'Tickets / Vehicle tickets / 05 — Open vehicle actions — Menu open',
    build: (x, y) => {
      const s = buildShell(BUILDERS[10].name, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, {
        rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets', menuRowIndex: 2,
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2,
      });
      const triggerX = MAIN_X + CONTENT_X + CONTENT_W - ACTIONS_W + SP.s6;
      const triggerY = TOPBAR_H + CONTENT_Y + s.bodyY + TOOLBAR_H + THEAD_H
        + 2 * ROW_H + (ROW_H - 29.75) / 2;
      buildRowMenu(s.frame, triggerX, triggerY, VEH_MENU_ITEMS);
    },
  },
  {
    name: 'Tickets / Vehicle tickets / 06 — Open vehicle detail — Dialog open',
    build: (x, y) => {
      const s = buildShell(BUILDERS[11].name, x, y, VEH_TITLE, VEH_NAV);
      buildVehTable(s.content, s.bodyY, {
        rows: VEH_ROWS, showing: 'Showing 18 of 18 tickets',
        pagerSummary: 'Showing 1–10 of 18 vehicle tickets', page: 1, totalPages: 2,
      });
      buildVehicleDialog(s.frame);
    },
  },
];

/* ── 13. Run ───────────────────────────────────────────────────────────── */

const GRID_COLS = 3;
const GRID_GAP = 40;
const GRID_MARGIN_X = 64;
const GRID_MARGIN_Y = 96;

async function loadFonts() {
  const candidates = [
    { family: 'Inter',      regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' },
    { family: 'Roboto',     regular: 'Regular', medium: 'Medium', semibold: 'Medium',    bold: 'Bold' },
    { family: 'Helvetica',  regular: 'Regular', medium: 'Bold',   semibold: 'Bold',      bold: 'Bold' },
  ];
  for (const c of candidates) {
    try {
      const styles = [c.regular, c.medium, c.semibold, c.bold]
        .filter((s, i, a) => a.indexOf(s) === i);
      for (const s of styles) await figma.loadFontAsync({ family: c.family, style: s });
      return c;
    } catch (e) { /* try the next family */ }
  }
  throw new Error('Could not load Inter, Roboto or Helvetica.');
}

async function main() {
  FONT = await loadFonts();

  // Resolve the target section.
  let section = null;
  try {
    section = await figma.getNodeByIdAsync(SECTION_ID);
  } catch (e) {
    section = figma.getNodeById ? figma.getNodeById(SECTION_ID) : null;
  }
  if (!section) {
    // Fallback: locate it by name on the current page.
    await figma.loadAllPagesAsync();
    section = figma.root.findOne((n) =>
      n.type === 'SECTION' && n.name.indexOf('Tickets- Passenger') === 0);
  }
  if (!section || section.type !== 'SECTION') {
    figma.closePlugin('Could not find the "Tickets- Passenger & Vehicles — All states" section.');
    return;
  }

  // Frames must be created on a page, then re-parented into the section.
  const page = section.parent;
  if (typeof figma.setCurrentPageAsync === 'function') {
    await figma.setCurrentPageAsync(page);
  } else {
    figma.currentPage = page;
  }

  const sectionBox = section.absoluteBoundingBox;
  const made = [];
  for (let i = 0; i < BUILDERS.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = GRID_MARGIN_X + col * (FRAME_W + GRID_GAP);
    const y = GRID_MARGIN_Y + row * (FRAME_H + GRID_GAP);

    LAST_SHELL = null;
    BUILDERS[i].build(x, y);
    const node = LAST_SHELL;
    if (!node) continue;

    section.appendChild(node);
    // Whether a SectionNode reports child coordinates as section-relative or
    // page-absolute varies; correct against the measured box either way so the
    // frame always lands at (x, y) *inside* the section.
    node.x = x;
    node.y = y;
    const box = node.absoluteBoundingBox;
    if (box && sectionBox) {
      node.x += (sectionBox.x + x) - box.x;
      node.y += (sectionBox.y + y) - box.y;
    }
    made.push(node);
  }
  flushIconCache();

  // Grow the section if the grid outruns it.
  const needW = GRID_MARGIN_X * 2 + GRID_COLS * FRAME_W + (GRID_COLS - 1) * GRID_GAP;
  const rows = Math.ceil(BUILDERS.length / GRID_COLS);
  const needH = GRID_MARGIN_Y + rows * FRAME_H + (rows - 1) * GRID_GAP + GRID_MARGIN_Y;
  if (section.resizeWithoutConstraints) {
    section.resizeWithoutConstraints(Math.max(section.width, needW), Math.max(section.height, needH));
  }

  figma.currentPage.selection = made;
  figma.viewport.scrollAndZoomIntoView(made);
  figma.closePlugin('Built ' + made.length + ' frames in "Tickets- Passenger & Vehicles — All states".');
}

main().catch((e) => {
  figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e)));
});
