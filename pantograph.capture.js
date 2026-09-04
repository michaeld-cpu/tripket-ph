/* Capture tripket-admin into a Pantograph manifest.
 *
 *   1. in this folder:        npm run dev
 *   2. in the Pantograph folder:
 *        npm run capture -- --config /Users/michaeljohndiopenes/tripket-admin/pantograph.capture.js --verify
 *   3. drop the written manifest on the Pantograph panel in Figma, press Draw.
 */

module.exports = {
  base: 'http://localhost:3000',
  section: 'Tripket Admin',
  mode: 'absolute',
  out: '/Users/michaeljohndiopenes/tripket-admin/tripket.manifest.json',

  // This app is client-rendered and auth-gated: every route redirects to /login
  // about a second in. 600ms captured the blank pre-render on every screen, so
  // the settle time has to clear the redirect AND the data fetch.
  options: { viewport: '1440x1024', wait: 2500 },

  // Signing in once seeds the session; Playwright keeps cookies/storage across
  // screens in the same run, so only the first screen needs the login steps.
  //   Testing build: submitting the form with both fields empty signs in as admin.

  screens: [
    { name: 'Tripket / 01 — Login',    path: '/login' },

    { name: 'Tripket / 02 — Dashboard', path: '/login',
      steps: [['wait', '1500'], ['click', 'button[type=submit]'], ['wait', '2500']] },
    { name: 'Tripket / 03 — Bookings', path: '/bookings' },
    { name: 'Tripket / 04 — Vessels',  path: '/vessels' },
    { name: 'Tripket / 05 — Voyages',  path: '/voyages' },
    { name: 'Tripket / 06 — Tickets',  path: '/tickets' },
    { name: 'Tripket / 07 — Reports',  path: '/reports' },

    // A responsive app is several designs — the mobile one has to be measured
    // at mobile width or the media queries never fire.
    { name: 'Tripket / 08 — Bookings (mobile)', path: '/bookings',
      viewport: '390x844' },
  ],
};
