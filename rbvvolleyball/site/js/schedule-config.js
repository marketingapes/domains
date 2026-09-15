/* ============================================================================
   RBV VOLLEYBALL — SCHEDULE DATA SOURCE
   ----------------------------------------------------------------------------
   The schedule page is built from one Google Sheet tab.

   The sheet is read at DEPLOY time by tools/bake-schedule.mjs, which writes
   real HTML into schedule.html. Visitors get plain static HTML - no JavaScript,
   no live calls to Google, nothing to go wrong in their browser.

   The only requirement on the Google side: the sheet stays shared as
   "Anyone with the link - Viewer". No "Publish to web" needed.
   ========================================================================== */

export const CONFIG = {

  // ---- Which sheet to read ------------------------------------------------
  // From the sheet's URL:
  //   docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<GID>
  SHEET_ID: '1WD6Tv02zzO1vCasWmwTz-pK1F3WtYBztnJpr8UkNv8s',
  GID: 0,

  // ---- Season year --------------------------------------------------------
  // Used to work out the day of week for each date. Bump this each season.
  SEASON_YEAR: 2026,

  // ---- Month calendar source ----------------------------------------------
  // false = the page shows the live Google Calendar embed (current setup).
  //         The bake leaves the calendar block alone.
  // true  = rebuild the month grid from the sheet between the RBV:CALENDAR
  //         markers (the old setup — those markers no longer exist in
  //         schedule.html, so turning this back on means restoring them too).
  CALENDAR_FROM_SHEET: false,

  // ---- Season game table --------------------------------------------------
  // true  = build the game table from the HOME GAME / AWAY GAME / TOURNAMENT
  //         squares in the calendar, so there's only one place to update
  // false = leave the hand-written game table in schedule.html alone
  //
  // Safety: the table is never replaced with FEWER games than the page already
  // shows, so a sheet that's missing months can't quietly delete games.
  GAMES_FROM_CALENDAR: false,

  // ---- Only show these months, in this order ------------------------------
  // Leave empty to show every month found in the sheet.
  // Example: ['August 2026', 'September 2026']
  ONLY_MONTHS: [],

  // ---- Hide months that have already finished -----------------------------
  // true  = a month disappears from the page once it ends
  // false = every month in the sheet stays on the page all season
  HIDE_PAST_MONTHS: false
};

/** Server-side CSV export URL. Works for any link-shared sheet. */
export function csvURL(cfg = CONFIG) {
  return `https://docs.google.com/spreadsheets/d/${cfg.SHEET_ID}/export?format=csv&gid=${cfg.GID}`;
}
