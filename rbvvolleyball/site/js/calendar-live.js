/* ============================================================================
   RBV VOLLEYBALL — LIVE CALENDAR READER
   ----------------------------------------------------------------------------
   Reads Coach Lindsay's three Google Calendars in the visitor's browser and
   rebuilds the season game table (schedule.html) and the Next Game card
   (index.html) from them. Nothing to deploy, nothing to bake — she edits the
   calendar, the site is right within seconds.

   WHY THIS WORKS WHEN THE OLD SHEET VERSION DIDN'T:
   googleapis.com sends CORS headers on purpose (it is built for browser JS).
   The Google Sheets export endpoints do not, which is what killed the earlier
   client-side attempt. Different host, different rules. Do not "fix" this by
   pointing it at docs.google.com or the .ics feed — neither allows CORS.

   FAIL-SAFE: if anything goes wrong — no API key, network down, calendar not
   public, zero events, nothing that parses as a game — this script leaves the
   HTML already on the page untouched. The site degrades to the last baked
   schedule rather than to a blank space. It never empties the table.

   SETUP (once):
     1. console.cloud.google.com → create/choose a project
     2. APIs & Services → Library → enable "Google Calendar API"
     3. Credentials → Create credentials → API key
     4. Restrict it: Application restrictions → Websites →
        add  https://rbvvolleyball.tonedntasty.com/*
        API restrictions → Restrict key → Google Calendar API
     5. Paste it into API_KEY below.
   The key is read-only, restricted to this domain, and only ever sees public
   calendars — it is safe in page source, which is how browser API keys work.

   REQUIRED on each of the three calendars:
     Settings and sharing → Access permissions for events →
     [x] Make available to public  +  "See all event details"
   At "See only free/busy" Google returns events with no titles and this script
   correctly treats them as unreadable and leaves the baked table in place.

   HOW EVENTS ARE READ (this is the part Lindsay controls):
     "vs Vista"            → HOME game against Vista
     "@ Carlsbad"          → AWAY game at Carlsbad   ("at Carlsbad" also works)
     "San Diego Classic"   → tournament, if the title contains tournament /
                             classic / invitational / series / showcase
     anything else         → not a game; ignored here (it still shows in the
                             month calendar above the table)
   The team comes from WHICH calendar the event is on, and the time comes from
   the event's start time — she never types either one.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    apiKey: 'REPLACE_WITH_YOUR_GOOGLE_API_KEY',

    /* Order matters: this is the order teams are listed in a combined row. */
    calendars: [
      { team: 'Varsity', id: '2ff3b121ca7e7eb913a0cd42259e24a2b857eeafb3110033e1b54ebb6376814c@group.calendar.google.com' },
      { team: 'JV',      id: 'b0ff9fd02b1a009c367b418c3fe6858ff6b47ca81d4dcc2a26cc14dda091ff6d@group.calendar.google.com' },
      { team: 'Frosh',   id: 'db439e7e18e3d3ba95266d5870eae7e1d2b88ba982f58765c894a49ee2faee4e@group.calendar.google.com' }
    ],

    seasonStart: '2026-08-01',
    seasonEnd:   '2026-12-01',
    homeVenue:   'RBV',
    cacheMinutes: 15
  };

  var TOURNEY_RE = /(tournament|classic|invitational|showcase|saturday series|\bseries\b)/i;
  var SKIP_RE = /(practice|tryout|try-out|conditioning|meeting|dinner|picture|photo|fundraiser|film|banquet|no school|weights|open gym)/i;

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /* ---------------------------------------------------------------- utils */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* --------------------------------------------------------------------
     TIME ZONE
     Everything on this page is in the team's time zone, NOT the visitor's.
     A parent reading this from Arizona or on a trip must still see
     "Thursday 4:30", not a date shifted by the offset. Google hands back
     real instants; we re-read each one through America/Los_Angeles and then
     build a plain Date carrying those wall-clock numbers, so every
     getDate()/getHours() downstream is already team time.
     -------------------------------------------------------------------- */
  var TZ = 'America/Los_Angeles';
  var zoneFmt = null;
  try {
    zoneFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    zoneFmt.formatToParts(new Date());
  } catch (e) { zoneFmt = null; }      /* ancient browser — fall back to local */

  function inTeamZone(d) {
    if (!zoneFmt) return new Date(d.getTime());
    var p = {};
    zoneFmt.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return new Date(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute);
  }

  /* "2026-09-22" -> Date at LOCAL midnight (never UTC — that shifts the day) */
  function localDate(iso) {
    var b = iso.split('-');
    return new Date(+b[0], +b[1] - 1, +b[2]);
  }

  function dayKey(d) {
    return d.getFullYear() + '-' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
           ('0' + d.getDate()).slice(-2);
  }

  function startOfToday() {
    var n = inTeamZone(new Date());
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  /* Google gives either {dateTime} (timed) or {date} (all-day) */
  function eventStart(ev) {
    if (ev.start && ev.start.dateTime) return inTeamZone(new Date(ev.start.dateTime));
    if (ev.start && ev.start.date) return localDate(ev.start.date);
    return null;
  }

  function eventEndDay(ev) {
    if (ev.end && ev.end.date) {                  /* all-day end is exclusive */
      var d = localDate(ev.end.date);
      d.setDate(d.getDate() - 1);
      return d;
    }
    if (ev.end && ev.end.dateTime) return inTeamZone(new Date(ev.end.dateTime));
    return null;
  }

  function isAllDay(ev) { return !!(ev.start && ev.start.date); }

  function timeLabel(d) {
    var h = d.getHours(), m = d.getMinutes();
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + ('0' + m).slice(-2);
  }

  /* ------------------------------------------------------------- parsing */

  /* Returns null when the event is not a game. */
  function parseEvent(ev, team) {
    var title = (ev.summary || '').trim();
    if (!title) return null;                 /* free/busy sharing — unreadable */
    if (SKIP_RE.test(title)) return null;

    var start = eventStart(ev);
    if (!start) return null;

    var tourney = TOURNEY_RE.test(title);
    var home = null, opponent = null;

    var m = title.match(/^\s*(?:vs\.?|versus)\s+(.+)$/i);
    if (m) { home = true; opponent = m[1]; }

    if (opponent === null) {
      m = title.match(/^\s*(?:@|at)\s+(.+)$/i);
      if (m) { home = false; opponent = m[1]; }
    }

    if (opponent === null) {
      if (!tourney) return null;             /* not vs/@ and not a tournament */
      opponent = title.replace(/^\s*[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '');
    }

    opponent = opponent.replace(/\s*[–—-]\s*(home|away)\s*$/i, '').trim();
    if (!opponent) return null;

    return {
      team: team,
      tourney: tourney,
      home: home,
      opponent: opponent,
      location: (ev.location || '').trim(),
      start: start,
      end: eventEndDay(ev),
      allDay: isAllDay(ev)
    };
  }

  /* One game may exist on all three calendars — fold them into one row. */
  function mergeGames(parsed) {
    var byKey = {};

    parsed.forEach(function (g) {
      var key = dayKey(g.start) + '|' + g.opponent.toLowerCase();
      if (!byKey[key]) {
        byKey[key] = {
          date: new Date(g.start.getFullYear(), g.start.getMonth(), g.start.getDate()),
          endDate: g.end ? new Date(g.end.getFullYear(), g.end.getMonth(), g.end.getDate()) : null,
          opponent: g.opponent,
          tourney: g.tourney,
          home: g.home,
          location: g.location,
          allDay: g.allDay,
          teams: [],
          times: []
        };
      }
      var row = byKey[key];
      if (row.teams.indexOf(g.team) === -1) row.teams.push(g.team);
      if (!g.allDay) {
        var mins = g.start.getHours() * 60 + g.start.getMinutes();
        var seen = false;
        for (var x = 0; x < row.times.length; x++) if (row.times[x].mins === mins) seen = true;
        if (!seen) row.times.push({ mins: mins, label: timeLabel(g.start) });
      }
      if (!row.location && g.location) row.location = g.location;
      if (row.home === null && g.home !== null) row.home = g.home;
      if (g.tourney) row.tourney = true;
    });

    var out = [];
    Object.keys(byKey).forEach(function (k) { out.push(byKey[k]); });

    out.sort(function (a, b) { return a.date - b.date; });

    out.forEach(function (r) {
      /* order teams Varsity → JV → Frosh, times earliest first */
      var order = CONFIG.calendars.map(function (c) { return c.team; });
      r.teams.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
      r.times.sort(function (a, b) { return a.mins - b.mins; });
      r.venue = r.location || (r.home ? CONFIG.homeVenue : r.opponent);
      r.timeText = r.times.length
        ? r.times.map(function (t) { return t.label; }).join(' / ')
        : 'TBD';
      r.levelText = r.teams.length === CONFIG.calendars.length ? 'All' : r.teams.join(' / ');
    });

    return out;
  }

  /* ------------------------------------------------------------- fetching */

  function fetchCalendar(cal) {
    var url = 'https://www.googleapis.com/calendar/v3/calendars/'
            + encodeURIComponent(cal.id) + '/events'
            + '?key=' + encodeURIComponent(CONFIG.apiKey)
            + '&singleEvents=true&orderBy=startTime&maxResults=250'
            + '&timeMin=' + encodeURIComponent(localDate(CONFIG.seasonStart).toISOString())
            + '&timeMax=' + encodeURIComponent(localDate(CONFIG.seasonEnd).toISOString())
            + '&fields=' + encodeURIComponent('items(summary,location,start,end)');

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      return (data.items || []).map(function (ev) {
        return parseEvent(ev, cal.team);
      }).filter(Boolean);
    });
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem('rbv-games');
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (Date.now() - o.t > CONFIG.cacheMinutes * 60000) return null;
      o.games.forEach(function (g) {
        g.date = new Date(g.date);
        g.endDate = g.endDate ? new Date(g.endDate) : null;
      });
      return o.games;
    } catch (e) { return null; }
  }

  function writeCache(games) {
    try {
      sessionStorage.setItem('rbv-games', JSON.stringify({ t: Date.now(), games: games }));
    } catch (e) { /* private mode — just skip caching */ }
  }

  /* ------------------------------------------------------------ rendering */

  function renderTable(games) {
    var tbody = document.getElementById('rbv-games');
    if (!tbody || !games.length) return;

    var html = [];
    var month = null;

    games.forEach(function (g) {
      var label = MONTHS[g.date.getMonth()];
      if (label !== month) {
        month = label;
        html.push('<tr class="month-header"><td colspan="4">' + esc(month) + '</td></tr>');
      }

      var multi = g.endDate && dayKey(g.endDate) !== dayKey(g.date);
      var dateMain = (g.date.getMonth() + 1) + '/' + g.date.getDate();
      var dayText = DAYS_SHORT[g.date.getDay()];
      if (multi) {
        dateMain += '&ndash;' + g.endDate.getDate();
        dayText = DAYS_SHORT[g.date.getDay()] + ' &amp; ' + DAYS_SHORT[g.endDate.getDay()];
      }

      var badge, rowClass = '';
      if (g.tourney) {
        badge = '<span class="badge badge-tournament">Tournament</span>';
        rowClass = ' class="tournament-row"';
      } else if (g.home) {
        badge = '<span class="badge badge-home">Home</span>';
      } else {
        badge = '<span class="badge badge-away">Away</span>';
      }

      var opp = esc(g.opponent);
      if (g.tourney) opp = '&#127942; ' + opp;
      if (g.teams.length && g.teams.length < CONFIG.calendars.length) {
        var cls = g.teams.indexOf('Varsity') !== -1 ? 'level-badge-varsity' : 'level-badge-jv';
        opp += ' <span class="level-badge ' + cls + '">' + esc(g.teams.join(' / ')) + '</span>';
      }

      html.push(
        '<tr' + rowClass + '>' +
          '<td data-label="Date" class="date-cell"><div class="date-main">' + dateMain +
            '</div><div class="date-day">' + dayText + '</div></td>' +
          '<td data-label="Opponent" class="opponent-cell">' + opp + '</td>' +
          '<td data-label="Location" class="location-cell"><span class="venue">' +
            esc(g.venue) + '</span>' + badge + '</td>' +
          '<td data-label="Time" class="time-cell"><div class="time-main">' + esc(g.timeText) +
            '</div><div class="level-tag">' + esc(g.levelText) + '</div></td>' +
        '</tr>'
      );
    });

    tbody.innerHTML = html.join('\n');
  }

  function renderNextGame(games) {
    var elDate = document.getElementById('ng-date');
    var elTitle = document.getElementById('ng-title');
    var elMeta = document.getElementById('ng-meta');
    if (!elDate || !elTitle || !elMeta || !games.length) return;

    var today = startOfToday();
    var next = null;
    for (var i = 0; i < games.length; i++) {
      var last = games[i].endDate || games[i].date;
      if (last >= today) { next = games[i]; break; }
    }

    if (!next) {
      elDate.textContent = 'SEASON COMPLETE';
      elTitle.textContent = 'Thanks for a great season, Longhorns!';
      elMeta.textContent = 'Check back for next season’s schedule.';
      return;
    }

    var days = Math.round((next.date - today) / 86400000);
    var when;
    if (days <= 0) when = 'TODAY';
    else if (days === 1) when = 'TOMORROW';
    else when = DAYS_LONG[next.date.getDay()].toUpperCase() + ', ' +
                MONTHS[next.date.getMonth()].toUpperCase() + ' ' + next.date.getDate();

    var lead = 'NEXT GAME';
    var multi = next.endDate && dayKey(next.endDate) !== dayKey(next.date);
    if (multi) {
      when = MONTHS[next.date.getMonth()].toUpperCase() + ' ' +
             next.date.getDate() + '–' + next.endDate.getDate();
      if (days <= 0) lead = 'HAPPENING NOW';
    }
    elDate.textContent = lead + ' • ' + when;

    elTitle.textContent = next.tourney
      ? '🏆 ' + next.opponent
      : (next.home ? 'vs ' : 'at ') + next.opponent;

    var badge = next.tourney
      ? '<span class="badge badge-tournament">Tournament</span>'
      : (next.home ? '<span class="badge badge-home">Home</span>'
                   : '<span class="badge badge-away">Away</span>');

    var times = next.times.length ? next.timeText : 'Times TBD';

    var html = badge + esc(next.venue) + ' • ' + esc(times);
    if (next.teams.length && next.teams.length < CONFIG.calendars.length) {
      html += '<span class="ng-note">' + esc(next.teams.join(' / ')) + ' only</span>';
    }
    elMeta.innerHTML = html;
  }

  /* ----------------------------------------------------------------- run */

  function apply(games) {
    if (!games || !games.length) return;      /* keep whatever is on the page */
    renderTable(games);
    renderNextGame(games);
  }

  function start() {
    if (!CONFIG.apiKey || CONFIG.apiKey.indexOf('REPLACE_WITH') === 0) return;
    if (!window.fetch || !window.Promise) return;
    if (!document.getElementById('rbv-games') && !document.getElementById('ng-date')) return;

    var cached = readCache();
    if (cached) { apply(cached); return; }

    Promise.all(CONFIG.calendars.map(function (c) {
      return fetchCalendar(c).catch(function () { return []; });   /* one bad calendar ≠ blank page */
    })).then(function (lists) {
      var flat = [];
      lists.forEach(function (l) { flat = flat.concat(l); });
      if (!flat.length) return;
      var games = mergeGames(flat);
      if (!games.length) return;
      writeCache(games);
      apply(games);
    }).catch(function () { /* leave the baked HTML alone */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
