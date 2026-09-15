/* ============================================================================
   RBV VOLLEYBALL — GOOGLE SHEET → CALENDAR PARSER / RENDERER
   ----------------------------------------------------------------------------
   Pure logic, no DOM and no network — just sheet rows in, HTML out. Drives
   both the month calendar and the season game table underneath it.

   Nothing in here needs editing to add a month — drop a new month grid in the
   sheet and it gets picked up automatically.
   ========================================================================== */

/* ---------------------------------------------------------------- CSV ----- */

/**
 * RFC-4180 CSV parser. Handles quoted fields containing commas and — the
 * important one for us — real line breaks inside a single calendar cell.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }

  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ----------------------------------------------------------- utilities ---- */

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clean = (s) => String(s == null ? '' : s).replace(/ /g, ' ').trim();
const lower = (s) => clean(s).toLowerCase();
const isBlankRow = (row) => !row.some((c) => clean(c) !== '');

export function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Typographic tidy-up so sheet text matches the site's existing styling. */
function pretty(s) {
  return escapeHTML(clean(s))
    // 3-5:45 / 10-12 / 8/21-22  →  en dash
    .replace(/(\d)\s*-\s*(\d)/g, '$1&ndash;$2')
    // Flippin Pizza / Flippin' Pizza → curly apostrophe
    .replace(/Flippin(?:&#39;)?\s*Pizza/gi, 'Flippin&rsquo; Pizza')
    .replace(/&#39;/g, '&rsquo;')
    // collapse runs of spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Strip the leading markers Lindsay uses for footnotes ("*", "**"). */
const stripStars = (s) => clean(s).replace(/^[*∗✱]+\s*/, '');

/** Strip a leading bullet character off a detail line ("-Code of Conduct"). */
const stripBullet = (s) => clean(s).replace(/^[-–—•·]\s*/, '');

/* -------------------------------------------------- line classification --- */

/*
   Each rule pulls a bold "headline" off the front of a line and leaves the
   rest as muted detail text — mirroring how the page was already hand-built
   (e.g. "HOME GAME vs Mission Hills" → bold HOME GAME, muted "vs Mission
   Hills"). `day` tints the whole calendar square. Order matters: the first
   match wins, so the more specific patterns come first.
*/
const LINE_RULES = [
  {
    name: 'tournament',
    head: /^\**\s*((?:VARSITY|JV|FROSH(?:MEN)?|ALL(?:\s+TEAMS)?)?\s*(?:TOURNAMENT|CLASSIC|INVITATIONAL|SATURDAY SERIES|PLAYOFFS?|CIF(?:\s+\w+)?)\*?)/i,
    tag: 'tag-tourney',
    day: 'tournament-day'
  },
  {
    name: 'game',
    head: /^\**\s*((?:HOME|AWAY|SENIOR NIGHT)\s+GAME\*?|SCRIMMAGE\*?|HOME\*?(?=\s+vs)|AWAY\*?(?=\s+@))/i,
    tag: 'tag-game',
    day: 'game-day'
  },
  {
    name: 'tryouts',
    head: /^\**\s*(TRYOUTS?\*?)/i,
    tag: 'tag-tryout',
    day: ''
  },
  {
    name: 'fundraiser',
    head: /^\**\s*([^\n]{0,45}?(?:FUNDRAISER|CAR WASH|SPIRIT NIGHT|RESTAURANT NIGHT))/i,
    tag: 'tag-event',
    day: 'event-day'
  },
  {
    name: 'meeting',
    head: /^\**\s*([^\n]{0,45}?(?:PARENT|TEAM|BOOSTER|COACHES?)\s+MEETING(?:\s+@?\s*[\d:]+\s*(?:am|pm)?)?)/i,
    tag: 'tag-event',
    day: 'event-day'
  },
  {
    name: 'pictures',
    head: /^\**\s*(PICTURES?(?:\s+DAY)?(?:\s+THEN\s+PRACTICE)?)/i,
    tag: 'tag-event',
    day: 'event-day'
  },
  {
    name: 'meal',
    head: /^\**\s*(TEAM\s+(?:DINNER|LUNCH|BREAKFAST|MEAL|BONDING)|BANQUET|POTLUCK|SECRET SISTERS?|SENIOR NIGHT|PEP RALLY)/i,
    tag: 'tag-event',
    day: 'event-day'
  },
  {
    // "ALL TEAMS 3-5:30" is a heading only when it leads the square. When it
    // appears further down (under a fundraiser, say) it's supporting detail.
    name: 'allteams',
    head: /^\**\s*((?:ALL\s+TEAMS|ALL)\s*\d[\d:apm.\s–-]*)/i,
    tag: '',
    day: '',
    firstOnly: true
  },
  {
    name: 'milestone',
    head: /^\**\s*(PRACTICE BEGINS|SCHOOL STARTS|FIRST PRACTICE|NO SCHOOL|NO PRACTICE|SEASON (?:BEGINS|ENDS)|FINALS|LAST PRACTICE)/i,
    tag: '',
    day: ''
  }
];

/** Uppercase-looking lines become bold headings even without a keyword match. */
function looksLikeHeading(line) {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  const upper = line.replace(/[^A-Z]/g, '').length;
  return upper / letters.length >= 0.7;
}

/**
 * Turn one raw line into { strong, tag, day, rest }.
 * `strong` is the bold headline (may be ''), `rest` is the leftover detail.
 */
function classifyLine(rawLine, isFirstLine) {
  const line = stripStars(rawLine);
  if (!line) return null;

  for (const rule of LINE_RULES) {
    if (rule.firstOnly && !isFirstLine) continue;
    const m = line.match(rule.head);
    if (m && clean(m[1])) {
      // Never let a trailing separator ride along on the bold headline.
      const head = clean(m[1]).replace(/[\s\-–—:;,]+$/, '');
      if (!head) continue;
      return {
        strong: head,
        tag: rule.tag,
        day: rule.day,
        rest: clean(line.slice(m[0].length))
      };
    }
  }

  if (looksLikeHeading(line)) {
    return { strong: line, tag: '', day: '', rest: '' };
  }

  return { strong: '', tag: '', day: '', rest: line };
}

/**
 * When a whole cell arrived as one long line (because it was typed without
 * line breaks), split it back into sensible detail lines at the natural
 * boundaries: after a time, and before a team name.
 */
function splitRun(text) {
  const SEP = '\u0000';
  return clean(text)
    // after a time, before a new capitalised item
    .replace(/(\d(?::\d{2})?\s*(?:am|pm)?)\s+(?=[A-Z])/gi, '$1' + SEP)
    // before a team name
    .replace(/\s+(?=(?:Frosh\/JV|JV\/Frosh|Frosh|JV|Varsity|All\s+Teams|All\s+Others)\b)/g, SEP)
    // before an inline bullet  ("-Code of Conduct -SWAY Protocol")
    .replace(/\s+(?=[-\u2013\u2014]\s*[A-Za-z])/g, SEP)
    // before an inline footnote marker  ("**Fall Sports Parent Meeting")
    .replace(/\s+(?=\*{1,2}[A-Za-z])/g, SEP)
    .split(SEP)
    .map(clean)
    .filter(Boolean);
}


/* --------------------------------------------------- calendar cell HTML --- */

/**
 * Build the inner HTML of one calendar square, plus the tint class the
 * square itself should carry.
 */
export function buildCellHTML(rawCellText) {
  const raw = String(rawCellText == null ? '' : rawCellText).replace(/ /g, ' ');

  // Pull the day number off the front.
  const dayMatch = raw.match(/^\s*(\d{1,2})\b/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1], 10);
  if (day < 1 || day > 31) return null;

  let body = raw.slice(dayMatch.index + dayMatch[0].length);

  // Split into lines. If she used line breaks, trust them; if the cell is a
  // single mashed line, split it ourselves.
  let lines = body.split('\n').map(clean).filter(Boolean);
  if (lines.length === 1) lines = splitRun(lines[0]);

  const pieces = [];   // { type: 'strong'|'muted', text, tag }
  let dayClass = '';

  lines.forEach((line, i) => {
    const c = classifyLine(line, i === 0);
    if (!c) return;
    if (c.day && !dayClass) dayClass = c.day;

    if (c.strong) pieces.push({ type: 'strong', text: c.strong, tag: c.tag });

    if (c.rest) {
      const rest = c.strong ? splitRun(c.rest) : [c.rest];
      rest.forEach((r) => {
        const t = stripBullet(r);
        if (t) pieces.push({ type: 'muted', text: t });
      });
    }
  });

  // Render: consecutive muted lines collapse into one <span class="muted">
  // joined by <br>, exactly like the original hand-written markup.
  const html = [];
  let mutedRun = [];

  const flushMuted = () => {
    if (!mutedRun.length) return;
    html.push('<span class="muted">' + mutedRun.map(pretty).join('<br>') + '</span>');
    mutedRun = [];
  };

  for (const p of pieces) {
    if (p.type === 'muted') { mutedRun.push(p.text); continue; }
    flushMuted();
    const cls = p.tag ? ' class="' + p.tag + '"' : '';
    // Any heading that isn't the first thing in the square gets a little
    // breathing room, matching the inline style used on the original page.
    const style = html.length ? ' style="margin-top:4px;"' : '';
    html.push('<strong' + cls + style + '>' + pretty(p.text) + '</strong>');
  }
  flushMuted();

  return {
    day,
    dayClass,
    bodyHTML: html.join('\n' + ' '.repeat(18)),
    // kept so the season game table can be derived from these same squares
    parts: {
      strongs: pieces.filter((p) => p.type === 'strong').map((p) => ({ text: p.text, tag: p.tag })),
      muted: pieces.filter((p) => p.type === 'muted').map((p) => p.text)
    }
  };
}

/* ------------------------------------------------------- calendar parse --- */

function isWeekdayHeaderRow(row) {
  let hits = 0;
  for (const cell of row) {
    const t = lower(cell);
    if (DAY_NAMES.some((d) => t === d || t === d.slice(0, 3))) hits++;
  }
  return hits >= 5;
}

function weekdayColumns(row) {
  const cols = [];
  row.forEach((cell, i) => {
    const t = lower(cell);
    const idx = DAY_NAMES.findIndex((d) => t === d || t === d.slice(0, 3));
    if (idx !== -1) cols[idx] = i;
  });
  // Fill any gap with the arithmetic guess so a mislabelled header still works.
  const base = cols.find((c) => c != null);
  const baseIdx = cols.findIndex((c) => c != null);
  for (let i = 0; i < 7; i++) if (cols[i] == null) cols[i] = base + (i - baseIdx);
  return cols;
}

/** Look upward from the weekday header for "August 2026" (or just "August"). */
function findMonthTitle(rows, headerIdx, fallbackYear) {
  for (let r = headerIdx - 1; r >= Math.max(0, headerIdx - 4); r--) {
    for (const cell of rows[r] || []) {
      const t = clean(cell);
      if (!t) continue;
      const m = t.match(/^([A-Za-z]+)\.?\s*,?\s*(\d{4})?$/);
      if (!m) continue;
      const mi = MONTH_NAMES.indexOf(m[1].toLowerCase());
      if (mi === -1) continue;
      return {
        label: MONTH_NAMES[mi][0].toUpperCase() + MONTH_NAMES[mi].slice(1) +
               ' ' + (m[2] || fallbackYear),
        monthIndex: mi,
        year: parseInt(m[2] || fallbackYear, 10)
      };
    }
  }
  return null;
}

/**
 * Parse every month block in the calendar tab.
 * Returns [{ label, monthIndex, year, weeks: [[cellOrNull x7]], notes: [] }]
 */
export function parseCalendar(rows, fallbackYear) {
  const months = [];

  for (let i = 0; i < rows.length; i++) {
    if (!isWeekdayHeaderRow(rows[i])) continue;

    const cols = weekdayColumns(rows[i]);
    const title = findMonthTitle(rows, i, fallbackYear) ||
                  { label: '', monthIndex: -1, year: parseInt(fallbackYear, 10) };

    const weeks = [];
    let lastDay = 0;
    let r = i + 1;

    // ---- consume week rows ----
    for (; r < rows.length; r++) {
      const row = rows[r];
      if (isWeekdayHeaderRow(row)) break;

      const week = cols.map((c) => {
        const cell = buildCellHTML(row[c]);
        return cell && cell.day >= lastDay ? cell : (cell && cell.day < lastDay ? null : cell);
      });

      const dayCount = week.filter(Boolean).length;

      if (dayCount === 0) {
        // Blank spacer row: allow one, but stop if it's the end of the grid or
        // if this row is actually a footnote.
        if (!isBlankRow(row)) break;
        const next = rows[r + 1] || [];
        const nextHasDays = cols.some((c) => buildCellHTML(next[c]));
        if (!nextHasDays) break;
        continue;
      }

      week.forEach((cell) => { if (cell) lastDay = Math.max(lastDay, cell.day); });
      weeks.push(week);
    }

    // ---- consume footnote rows underneath the grid ----
    const notes = [];
    for (; r < rows.length; r++) {
      const row = rows[r];
      if (isWeekdayHeaderRow(row)) break;
      if (findMonthTitle(rows, r + 1, fallbackYear) && isWeekdayHeaderRow(rows[r + 1] || [])) break;

      if (isBlankRow(row)) {
        const nextIsGrid = rows[r + 1] && isWeekdayHeaderRow(rows[r + 1]);
        if (nextIsGrid) break;
        continue;
      }

      const text = clean(row.map(clean).filter(Boolean).join(' '));
      if (!text) continue;

      const startsNew =
        /^[*∗✱]/.test(clean(row.find((c) => clean(c)) || '')) ||
        /^[A-Z][^.!?]{0,60}?\s*[-–—]\s/.test(text) ||
        notes.length === 0;

      if (startsNew) notes.push(text);
      else notes[notes.length - 1] += ' ' + text;
    }

    if (weeks.length) months.push({ ...title, weeks, notes });
    i = r - 1;
  }

  return months;
}

/* ---------------------------------------------------- calendar → HTML ----- */

const IND = ' '.repeat(12);

function renderMonthGrid(month) {
  const out = [];
  out.push(IND + '<div class="cal-grid" role="grid" aria-label="' +
    escapeHTML(month.label) + ' volleyball calendar">');
  DAY_ABBR.forEach((d) => {
    out.push(IND + '  <div class="cal-head" role="columnheader">' + d + '</div>');
  });

  month.weeks.forEach((week) => {
    week.forEach((cell) => {
      if (!cell) {
        out.push(IND + '  <div class="cal-day empty" role="gridcell"><div class="cal-num">&nbsp;</div></div>');
        return;
      }
      if (!cell.bodyHTML) {
        out.push(IND + '  <div class="cal-day empty" role="gridcell"><div class="cal-num">' +
          cell.day + '</div></div>');
        return;
      }
      const cls = 'cal-day' + (cell.dayClass ? ' ' + cell.dayClass : '');
      out.push(
        IND + '  <div class="' + cls + '" role="gridcell">\n' +
        IND + '    <div class="cal-num">' + cell.day + '</div>\n' +
        IND + '    <div class="cal-body">\n' +
        IND + '      ' + cell.bodyHTML + '\n' +
        IND + '    </div>\n' +
        IND + '  </div>'
      );
    });
  });

  out.push(IND + '</div>');
  return out.join('\n');
}

function renderNotes(notes) {
  if (!notes || !notes.length) return '';
  const items = notes.map((raw) => {
    const text = stripStars(raw);
    const sponsor = /fundraiser|sponsor|pizza|car wash|spirit night/i.test(text);
    // "Title - details" is the clean case. Failing that, bold the opening
    // phrase up to the linking verb so the note still reads like the rest of
    // the page ("Fall Sports Parent Meeting is located in the RBV Gym...").
    const dashed = text.match(/^(.{2,60}?)\s*[-–—:]\s+(.*)$/s);
    const verbed = dashed ? null
      : text.match(/^(.{2,50}?)\s+((?:is|are|was|were|will|takes place|begins|starts|happens)\b.*)$/is);

    let inner;
    if (dashed) {
      // "Title - details"  →  Title — details
      inner = '<strong>' + pretty(dashed[1]) + '</strong> &mdash; ' + pretty(dashed[2]);
    } else if (verbed) {
      // "Title is located in..."  →  keep it as a sentence, just bold the subject
      inner = '<strong>' + pretty(verbed[1]) + '</strong> ' + pretty(verbed[2]);
    } else {
      inner = pretty(text);
    }

    return '        <div class="cal-note' + (sponsor ? ' note-sponsor' : '') + '">\n' +
           '          ' + inner + '\n' +
           '        </div>';
  });
  return '      <div class="cal-notes">\n' + items.join('\n') + '\n      </div>';
}

/** Full replacement HTML for the calendar block (all months). */
export function renderCalendar(months) {
  if (!months || !months.length) return '';

  return months.map((month) => {
    const heading = months.length > 1
      ? '      <h3 class="cal-month-title">' + escapeHTML(month.label) + '</h3>\n'
      : '';
    return (
      '    <div class="cal-month" data-month="' + escapeHTML(month.label) + '">\n' +
      heading +
      '      <div class="cal-wrap">\n' +
      '        <div class="cal-scroll">\n' +
      renderMonthGrid(month) + '\n' +
      '        </div>\n' +
      '      </div>\n' +
      (renderNotes(month.notes) ? renderNotes(month.notes) + '\n' : '') +
      '    </div>'
    );
  }).join('\n');
}

/* -------------------------------------------------------- games parsing --- */

function headerIndex(headerRow) {
  const map = {};
  headerRow.forEach((cell, i) => {
    const key = lower(cell).replace(/[^a-z]/g, '');
    if (key) map[key] = i;
  });
  const pick = (...names) => {
    for (const n of names) if (map[n] != null) return map[n];
    return -1;
  };
  return {
    date: pick('date', 'dates', 'gamedate'),
    opponent: pick('opponent', 'opponents', 'versus', 'vs', 'event'),
    location: pick('location', 'venue', 'where', 'site'),
    type: pick('type', 'homeaway', 'hometype', 'homeoraway'),
    time: pick('time', 'times', 'starttime'),
    level: pick('level', 'levels', 'teams', 'team'),
    note: pick('note', 'notes', 'comment', 'comments')
  };
}

/** Parse "8/13", "8/21-22", "8/13/2026" → { label, dayLabel, monthIndex } */
function parseGameDate(raw, seasonYear) {
  const t = clean(raw);
  if (!t) return null;

  const m = t.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?(?:\s*\/\s*(\d{2,4}))?/);
  if (!m) return { label: escapeHTML(t), dayLabel: '', monthIndex: -1, sortKey: 9e9 };

  const month = parseInt(m[1], 10);
  const d1 = parseInt(m[2], 10);
  const d2 = m[3] ? parseInt(m[3], 10) : null;
  let year = m[4] ? parseInt(m[4], 10) : parseInt(seasonYear, 10);
  if (year < 100) year += 2000;

  const label = d2 ? month + '/' + d1 + '&ndash;' + d2 : month + '/' + d1;

  const wd1 = DAY_ABBR[new Date(year, month - 1, d1).getDay()];
  const dayLabel = d2
    ? wd1 + ' &amp; ' + DAY_ABBR[new Date(year, month - 1, d2).getDay()]
    : wd1;

  return {
    label,
    dayLabel,
    monthIndex: month - 1,
    year,
    sortKey: new Date(year, month - 1, d1).getTime()
  };
}

/**
 * Parse the Games tab.
 * Returns [{ dateLabel, dayLabel, opponent, location, type, time, level, note }]
 */
export function parseGames(rows, seasonYear) {
  if (!rows || !rows.length) return [];

  // Find the header row (first row mentioning a date-ish and opponent-ish column)
  let hIdx = rows.findIndex((r) => {
    const keys = r.map((c) => lower(c).replace(/[^a-z]/g, ''));
    return keys.includes('date') && keys.some((k) => ['opponent', 'event', 'vs'].includes(k));
  });
  if (hIdx === -1) hIdx = 0;

  const idx = headerIndex(rows[hIdx]);
  if (idx.date === -1) return [];

  const games = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;

    const date = parseGameDate(row[idx.date], seasonYear);
    if (!date) continue;

    const opponent = clean(row[idx.opponent]);
    if (!opponent) continue;

    games.push({
      date,
      opponent,
      location: clean(row[idx.location]),
      type: lower(row[idx.type]) || 'home',
      time: clean(row[idx.time]) || 'TBD',
      level: clean(row[idx.level]) || 'All',
      note: clean(row[idx.note])
    });
  }

  games.sort((a, b) => a.date.sortKey - b.date.sortKey);
  return games;
}

/* --------------------------------------- games derived from the calendar --- */

/** "6pm" → "6:00", "4:30" → "4:30", "6" → "6:00" */
function normTime(raw) {
  const m = clean(raw).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return '';
  return m[1] + ':' + (m[2] || '00');
}

/**
 * Read one game/tournament square and turn it into a table row.
 * Everything comes from what Lindsay already types in the calendar:
 *
 *   HOME GAME vs Mission Hills   →  Home · Mission Hills · RBV
 *   Frosh/JV 4:30                →  lower time
 *   Varsity 6pm                  →  upper time  ("4:30 / 6:00")
 *
 *   VARSITY TOURNAMENT           →  Tournament · Varsity
 *   Westview                     →  venue
 *   San Diego Classic            →  event name
 */
function gameFromCell(cell) {
  if (!cell || !cell.parts) return null;
  const isTourney = cell.dayClass === 'tournament-day';
  const isGame = cell.dayClass === 'game-day';
  if (!isGame && !isTourney) return null;

  const head = cell.parts.strongs.length ? cell.parts.strongs[0].text : '';
  const muted = cell.parts.muted.slice();

  // ---- level: the calendar usually says so ("VARSITY TOURNAMENT") ----
  let level = 'All';
  if (/\bvarsity\b/i.test(head)) level = 'Varsity';
  else if (/\bjv\b/i.test(head)) level = 'JV';
  else if (/\bfrosh/i.test(head)) level = 'Frosh';

  // ---- times: pull whichever team times were listed ----
  let lower = '', upper = '';
  const detail = [];
  muted.forEach((line) => {
    const t = normTime(line);
    if (t && /frosh|jv/i.test(line)) { lower = lower || t; return; }
    if (t && /varsity/i.test(line)) { upper = upper || t; return; }
    detail.push(line);
  });

  let time = 'TBD';
  if (lower && upper) time = lower + ' / ' + upper;
  else if (lower || upper) time = lower || upper;

  // ---- tournament ----
  if (isTourney) {
    const venue = detail.length > 1 ? detail[0] : '';
    const name = detail.length > 1 ? detail.slice(1).join(' ') : (detail[0] || 'Tournament');
    return { type: 'Tournament', opponent: name, location: venue || 'TBD', time, level, note: '' };
  }

  // ---- home / away ----
  const away = /\baway\b/i.test(head);
  let opponent = '';
  const rest = [];

  detail.forEach((line) => {
    const m = line.match(/^\s*(?:vs\.?|@|at)\s+(.{2,60})$/i);
    if (m && !opponent) opponent = clean(m[1]);
    else rest.push(line);
  });

  // Fall back to the tail of the headline ("HOME GAME vs Vista" on one line).
  if (!opponent) {
    const m = head.match(/(?:vs\.?|@|at)\s+(.{2,60})$/i);
    if (m) opponent = clean(m[1]);
  }
  if (!opponent) opponent = rest.shift() || 'TBD';

  return {
    type: away ? 'Away' : 'Home',
    opponent,
    location: away ? opponent : 'RBV',
    time,
    level,
    // anything left over (e.g. "Secret Sisters") becomes the small grey note
    note: rest.filter((r) => !/^\s*(?:vs\.?|@|at)\b/i.test(r)).join(' ')
  };
}

/** Same shape gameFromCell produces, used to spot a multi-day tournament. */
const gameKey = (g) => [g.type, g.opponent, g.location, g.level].join('|');

/**
 * Walk every month and pull out the games. Consecutive days carrying the same
 * event collapse into one row ("8/21–22"), matching how tournaments read.
 */
export function deriveGamesFromCalendar(months) {
  const found = [];

  (months || []).forEach((month) => {
    month.weeks.forEach((week) => {
      week.forEach((cell) => {
        const g = gameFromCell(cell);
        if (g) found.push({ ...g, day: cell.day, month });
      });
    });
  });

  const games = [];
  found.forEach((g) => {
    const prev = games[games.length - 1];
    if (prev && prev.month === g.month && prev.endDay === g.day - 1 &&
        gameKey(prev) === gameKey(g)) {
      prev.endDay = g.day;               // stretch the existing row
      return;
    }
    games.push({ ...g, endDay: g.day });
  });

  return games.map((g) => {
    const mi = g.month.monthIndex;
    const year = g.month.year;
    const label = (mi + 1) + '/' + g.day + (g.endDay > g.day ? '&ndash;' + g.endDay : '');
    const wd = DAY_ABBR[new Date(year, mi, g.day).getDay()];
    const dayLabel = g.endDay > g.day
      ? wd + ' &amp; ' + DAY_ABBR[new Date(year, mi, g.endDay).getDay()]
      : wd;

    return {
      date: { label, dayLabel, monthIndex: mi, year, sortKey: new Date(year, mi, g.day).getTime() },
      opponent: g.opponent,
      location: g.location,
      type: g.type,
      time: g.time,
      level: g.level,
      note: g.note
    };
  }).sort((a, b) => a.date.sortKey - b.date.sortKey);
}

/* ------------------------------------------------------- games → HTML ----- */

const TYPE_INFO = {
  home: { badge: 'badge-home', text: 'Home', row: '' },
  away: { badge: 'badge-away', text: 'Away', row: '' },
  tournament: { badge: 'badge-tournament', text: 'Tournament', row: 'tournament-row' }
};

function typeInfo(type) {
  const t = lower(type);
  if (/tourn|classic|invit|series|playoff|cif/.test(t)) return TYPE_INFO.tournament;
  if (/away|@/.test(t)) return TYPE_INFO.away;
  return TYPE_INFO.home;
}

function levelBadge(level) {
  const t = lower(level);
  if (!t || t === 'all' || t === 'all teams') return '';
  if (/varsity/.test(t)) return ' <span class="level-badge level-badge-varsity">Varsity</span>';
  if (/\bjv\b/.test(t)) return ' <span class="level-badge level-badge-jv">JV</span>';
  return ' <span class="level-badge level-badge-jv">' + escapeHTML(clean(level)) + '</span>';
}

function levelTag(level) {
  const t = lower(level);
  if (!t || t === 'all' || t === 'all teams') return 'All';
  if (/varsity/.test(t)) return 'Varsity only';
  if (/\bjv\b/.test(t)) return 'JV only';
  return clean(level);
}

/** Full replacement HTML for the <tbody> of the season game table. */
export function renderGames(games) {
  if (!games || !games.length) return '';

  const out = [];
  let currentMonth = -1;
  const I = ' '.repeat(8);

  games.forEach((g) => {
    if (g.date.monthIndex !== currentMonth) {
      currentMonth = g.date.monthIndex;
      const name = MONTH_NAMES[currentMonth];
      const label = name ? name[0].toUpperCase() + name.slice(1) : '';
      out.push('\n' + I + '<tr class="month-header"><td colspan="4">' +
        escapeHTML(label) + '</td></tr>\n');
    }

    const info = typeInfo(g.type);
    const isTourney = info === TYPE_INFO.tournament;
    const trophy = isTourney ? '&#127942; ' : '';
    const note = g.note
      ? ' <span style="font-weight:500;font-size:0.78rem;color:#888;">(' + escapeHTML(g.note) + ')</span>'
      : '';

    out.push(
      I + '<tr' + (info.row ? ' class="' + info.row + '"' : '') + '>\n' +
      I + '  <td data-label="Date" class="date-cell"><div class="date-main">' +
            g.date.label + '</div><div class="date-day">' + g.date.dayLabel + '</div></td>\n' +
      I + '  <td data-label="Opponent" class="opponent-cell">' + trophy +
            escapeHTML(g.opponent) + levelBadge(g.level) + note + '</td>\n' +
      I + '  <td data-label="Location" class="location-cell"><span class="venue">' +
            escapeHTML(g.location || (info === TYPE_INFO.home ? 'RBV' : 'TBD')) +
            '</span><span class="badge ' + info.badge + '">' + info.text + '</span></td>\n' +
      I + '  <td data-label="Time" class="time-cell"><div class="time-main">' +
            escapeHTML(g.time) + '</div><div class="level-tag">' +
            escapeHTML(levelTag(g.level)) + '</div></td>\n' +
      I + '</tr>'
    );
  });

  return out.join('\n').replace(/^\n/, '');
}

/* --------------------------------------------------------- month filter --- */

export function filterMonths(months, config, today) {
  let out = months.slice();

  if (config.ONLY_MONTHS && config.ONLY_MONTHS.length) {
    const want = config.ONLY_MONTHS.map((m) => lower(m));
    out = out
      .filter((m) => want.includes(lower(m.label)))
      .sort((a, b) => want.indexOf(lower(a.label)) - want.indexOf(lower(b.label)));
  }

  if (config.HIDE_PAST_MONTHS) {
    const now = today || new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    out = out.filter((m) => m.monthIndex === -1 ||
      new Date(m.year, m.monthIndex, 1).getTime() >= cutoff);
  }

  return out;
}
