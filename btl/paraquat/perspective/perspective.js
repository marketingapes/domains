/* Public Paraquat overview: aggregate-only allowlist. No claimant records, recordings,
   credentials, form submissions, outbound calls, SMS or browser storage. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.bind(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var CAMPAIGN = 'PARAQUAT-PILOT-001';
  var SOURCES = { form: 'Page and form', sofia: 'Conversation with Sofia', quiz: 'Guided quiz' };
  var STATUSES = { received: 'Received', screening: 'Screening', review: 'Firm review', followup: 'Follow-up', handed_off: 'Handed off', not_a_fit: 'Not a fit' };
  var CONNECTIONS = { intake: 'Intake', sofia: 'Sofia activity', ad_spend: 'Ad spend' };
  function count(v) { return Number.isSafeInteger(v) && v >= 0 ? v : null; }
  function cleanFeed(v) {
    if (!v || v.schema !== 'paraquat-perspective/v1' || v.campaign_id !== CAMPAIGN || v.synthetic !== false) throw new Error('Unverified feed');
    // Enumerated labels and numeric counts only. Ignore every extra key, including lead records.
    var out = { counts: { leads: count(v.counts && v.counts.leads), calls: count(v.counts && v.counts.calls), followups: count(v.counts && v.counts.followups) }, sources: [], statuses: [], connections: {}, as_of: null };
    if (typeof v.as_of === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v.as_of) && Number.isFinite(Date.parse(v.as_of))) out.as_of = new Date(v.as_of).toISOString();
    ['sources','statuses'].forEach(function (kind) {
      var labels = kind === 'sources' ? SOURCES : STATUSES;
      if (Array.isArray(v[kind])) v[kind].slice(0,20).forEach(function (r) {
        if (r && Object.prototype.hasOwnProperty.call(labels,r.key) && count(r.count) !== null && !out[kind].some(function (x) { return x.key === r.key; })) out[kind].push({key:r.key,count:r.count});
      });
    });
    Object.keys(CONNECTIONS).forEach(function (k) { out.connections[k] = v.connections && v.connections[k] === true; });
    if (!out.connections.intake) { out.counts.leads = null; out.sources = []; out.statuses = []; }
    if (!out.connections.sofia) { out.counts.calls = null; out.counts.followups = null; }
    return out;
  }
  function allowedEndpoint(v) {
    if (typeof v !== 'string') return false;
    try { var u = new URL(v); return u.protocol === 'https:' && u.origin === 'https://legal-web-lead.onrender.com' && u.pathname === '/api/v1/portal/paraquat/overview' && !u.search && !u.hash && !u.username && !u.password; } catch (_) { return false; }
  }
  function bind(win) {
    var doc = win.document, mode = 'live', generation = 0, abort;
    function $(id) { return doc.getElementById(id); }
    function n(v) { return v === null ? '—' : String(v); }
    function list(id, rows, labels, empty) {
      var el=$(id); el.textContent='';
      if (!rows.length) { var li=doc.createElement('li');li.textContent=empty;el.appendChild(li);return; }
      rows.forEach(function(r){var li=doc.createElement('li');li.textContent=labels[r.key]+': '+n(r.count);el.appendChild(li);});
    }
    function render(feed, synthetic) {
      $('leadCount').textContent=n(feed.counts.leads);$('callCount').textContent=n(feed.counts.calls);$('followupCount').textContent=n(feed.counts.followups);
      $('spendCount').textContent='—';
      list('sources',feed.sources,SOURCES,'Source totals are not connected yet.');
      list('statuses',feed.statuses,STATUSES,'Lead status totals are not connected yet.');
      $('activity').textContent=synthetic?'Synthetic examples: two fictional calls and one follow-up attempt.':feed.connections.sofia?'Sofia activity totals are connected. No recordings or transcripts are exposed here.':'No connected Sofia activity feed.';
      $('connections').textContent=''; Object.keys(CONNECTIONS).forEach(function(k){var li=doc.createElement('li');li.textContent=CONNECTIONS[k]+': '+(synthetic?'synthetic example only':feed.connections[k]?'connected':'not connected');$('connections').appendChild(li);});
      $('freshness').textContent=synthetic?'Synthetic examples · no live data timestamp.':feed.as_of?'Connected data as of '+new Date(feed.as_of).toLocaleString():'No connected data timestamp.';
    }
    var EMPTY={counts:{leads:null,calls:null,followups:null},sources:[],statuses:[],connections:{},as_of:null};
    var DEMO={counts:{leads:3,calls:2,followups:1},sources:[{key:'form',count:1},{key:'sofia',count:1},{key:'quiz',count:1}],statuses:[{key:'followup',count:1},{key:'handed_off',count:1},{key:'review',count:1}],connections:{},as_of:null};
    var EXAMPLES={form:['Synthetic Demo 01 · page and form','Inquiry received with call consent','Sofia follow-up attempt · no answer','Status: follow-up'],sofia:['Synthetic Demo 02 · conversation with Sofia','Inbound conversation started','Intake criteria checked','Handoff requested · status: handed off'],quiz:['Synthetic Demo 03 · guided quiz','Quiz completed','Uncertain answer flagged','Status: firm review']};
    function example(k){$('timeline').textContent='';EXAMPLES[k].forEach(function(t){var li=doc.createElement('li');li.textContent=t;$('timeline').appendChild(li);});}
    Object.keys(SOURCES).forEach(function(k){var b=doc.createElement('button');b.type='button';b.className='btn ghost';b.textContent=SOURCES[k];b.onclick=function(){example(k);};$('examples').appendChild(b);});
    async function load() {
      var own=++generation; if(abort)abort.abort();abort=new AbortController();
      render(EMPTY,false);$('dataNote').textContent='Checking connected data…';
      var timer=setTimeout(function(){abort.abort();},10000);
      try {
        var cr=await win.fetch('/paraquat/perspective/config.json',{cache:'no-store',credentials:'omit',signal:abort.signal});
        if(!cr.ok)throw new Error('config');var c=await cr.json();
        if(c.schema!=='paraquat-perspective-config/v1'||c.campaign_id!==CAMPAIGN||!allowedEndpoint(c.feed_url))throw new Error('unconnected');
        var r=await win.fetch(c.feed_url,{cache:'no-store',credentials:'omit',redirect:'error',signal:abort.signal});
        if(!r.ok)throw new Error('unavailable'); var f=cleanFeed(await r.json());
        if(own!==generation||mode!=='live')return;
        render(f,false);$('dataNote').textContent='Connected aggregate overview. Claimant information stays private.';
      } catch (_) {if(own===generation&&mode==='live')$('dataNote').textContent='Connected totals are not available yet. Explore the synthetic examples to see how the paths fit together.';}
      finally{clearTimeout(timer);}
    }
    function change(next){mode=next;++generation;if(abort)abort.abort();$('liveMode').setAttribute('aria-pressed',String(next==='live'));$('demoMode').setAttribute('aria-pressed',String(next==='demo'));$('syntheticPanel').hidden=next!=='demo';if(next==='live')load();else{render(DEMO,true);$('dataNote').textContent='SYNTHETIC EXAMPLES · fictional records, separate from connected totals. No calls or messages were sent.';var k=new URLSearchParams(win.location.search).get('source');example(EXAMPLES[k]?k:'form');}}
    $('liveMode').onclick=function(){change('live');};$('demoMode').onclick=function(){change('demo');};$('refresh').onclick=function(){change(mode);};load();
  }
  return {cleanFeed:cleanFeed,allowedEndpoint:allowedEndpoint,bind:bind};
});
