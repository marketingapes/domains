  (function (root) {
    'use strict';
    // DIHAC quiz engine. Pure functions over the shared schema; no DOM, no network.
    // Source: dihac/quiz/engine.js. Injected into index.html by dihac/quiz/build.mjs.
    function createEngine(schema) {
      var stepsById = {};
      schema.steps.forEach(function (s) { stepsById[s.id] = s; });

      function step(id) {
        var s = stepsById[id];
        if (!s) throw new Error('unknown step: ' + id);
        return s;
      }
      function choice(stepId, choiceId) {
        var s = step(stepId);
        for (var i = 0; i < s.choices.length; i++) if (s.choices[i].id === choiceId) return s.choices[i];
        throw new Error('unknown choice ' + choiceId + ' on step ' + stepId);
      }
      function route(key) {
        var r = schema.routes[key];
        if (!r) throw new Error('unknown route ' + key);
        return r;
      }
      // Longest number of steps still to answer from a step. Throws on a cycle.
      var memo = {}, visiting = {};
      function remaining(id) {
        if (memo[id] !== undefined) return memo[id];
        if (visiting[id]) throw new Error('cycle at step ' + id);
        visiting[id] = true;
        var best = 0;
        step(id).choices.forEach(function (c) {
          if (c.next) best = Math.max(best, 1 + remaining(c.next));
        });
        visiting[id] = false;
        memo[id] = best;
        return best;
      }
      function tracks() {
        var seen = {}, out = [];
        schema.steps.forEach(function (s) { if (s.track && !seen[s.track]) { seen[s.track] = true; out.push(s.track); } });
        return out;
      }
      function start(tort) {
        if (tort) {
          for (var i = 0; i < schema.steps.length; i++) if (schema.steps[i].track === tort) return schema.steps[i].id;
        }
        return schema.entry;
      }
      function apply(stepId, choiceId) {
        var c = choice(stepId, choiceId);
        if (c.result) {
          if (!schema.outcomes[c.result]) throw new Error('unknown outcome ' + c.result);
          route(c.route);
          return { done: true, result: c.result, route: c.route, stop_reason: c.stop_reason || null, track: c.track || null };
        }
        step(c.next);
        return { done: false, next: c.next, track: c.track || null };
      }
      function walk(choiceIds, tort) {
        var id = start(tort), track = tort || null, path = [];
        for (var i = 0; i < choiceIds.length; i++) {
          var out = apply(id, choiceIds[i]);
          path.push({ step: id, choice: choiceIds[i] });
          if (out.track) track = out.track;
          if (out.done) return { result: out.result, route: out.route, stop_reason: out.stop_reason, track: track, path: path, tort: route(out.route).tort, status: route(out.route).status || 'live' };
          id = out.next;
        }
        return { result: null, route: null, stop_reason: null, track: track, path: path, at: id };
      }
      // Human-readable recap of a path: [{step_id, prompt, label}]. On-page only; never transmitted.
      function describe(path) {
        return path.map(function (p) {
          var s = step(p.step), c = choice(p.step, p.choice);
          return { step_id: s.id, prompt: s.prompt, label: c.label };
        });
      }
      // Build the outbound URL. incoming = URLSearchParams-like (has .get) or plain object.
      function destination(routeKey, opts) {
        opts = opts || {};
        var r = route(routeKey);
        var origin = opts.origin || 'https://' + schema.domain_id;
        var url = new URL(r.url, origin);
        var get = function (k) {
          var inc = opts.incoming;
          if (!inc) return null;
          return typeof inc.get === 'function' ? inc.get(k) : (inc[k] === undefined ? null : inc[k]);
        };
        if (r.tenant_id !== schema.tenant_id) {
          if (r.tort) url.searchParams.set('tort', r.tort);
          Object.keys(schema.outbound_utm).forEach(function (k) { url.searchParams.set(k, schema.outbound_utm[k]); });
          if (opts.result) url.searchParams.set('utm_content', String(opts.result).slice(0, 60));
          url.searchParams.set('quiz_id', schema.quiz_id);
          url.searchParams.set('quiz_version', schema.version);
          if (opts.session_id) url.searchParams.set('session_id', String(opts.session_id).slice(0, 80));
          schema.attribution_passthrough.forEach(function (k) {
            var v = get(k);
            if (v) url.searchParams.set(k, String(v).slice(0, 300));
          });
        } else {
          url.searchParams.set('from', schema.quiz_id);
          if (opts.result) url.searchParams.set('result', String(opts.result).slice(0, 60));
          if (r.tort) url.searchParams.set('tort', r.tort);
          if (r.intent) url.searchParams.set('intent', r.intent);
          url.searchParams.set('utm_campaign', schema.outbound_utm.utm_campaign);
          url.searchParams.set('utm_content', String(opts.result || '').slice(0, 60));
        }
        return url.href;
      }
      // Static validation of the whole schema. Returns [] when clean.
      function validate() {
        var errors = [];
        if (!stepsById[schema.entry]) errors.push('entry ' + schema.entry + ' missing');
        schema.steps.forEach(function (s) {
          if (!s.choices || s.choices.length < 2) errors.push(s.id + ': fewer than 2 choices');
          (s.choices || []).forEach(function (c) {
            var terminal = Boolean(c.result), branch = Boolean(c.next);
            if (terminal === branch) errors.push(s.id + '/' + c.id + ': needs exactly one of next|result');
            if (c.next && !stepsById[c.next]) errors.push(s.id + '/' + c.id + ': next ' + c.next + ' missing');
            if (c.result && !schema.outcomes[c.result]) errors.push(s.id + '/' + c.id + ': outcome ' + c.result + ' missing');
            if (c.result && !schema.routes[c.route]) errors.push(s.id + '/' + c.id + ': route ' + c.route + ' missing');
            if (c.stop_reason && !schema.stop_reasons[c.stop_reason]) errors.push(s.id + '/' + c.id + ': stop_reason ' + c.stop_reason + ' missing');
          });
        });
        try { schema.steps.forEach(function (s) { remaining(s.id); }); } catch (e) { errors.push(String(e.message)); }
        Object.keys(schema.routes).forEach(function (k) {
          var r = schema.routes[k];
          if (!r.tenant_id || !r.url || !r.cta) errors.push('route ' + k + ': tenant_id/url/cta required');
          if (r.status && ['live', 'needs_buyer'].indexOf(r.status) < 0) errors.push('route ' + k + ': bad status ' + r.status);
        });
        return errors;
      }
      return { schema: schema, step: step, choice: choice, route: route, remaining: remaining, tracks: tracks, start: start, apply: apply, walk: walk, describe: describe, destination: destination, validate: validate };
    }
    root.DIHAC_QUIZ_ENGINE = { createEngine: createEngine };
  })(typeof window !== 'undefined' ? window : globalThis);
