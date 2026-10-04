(function () {
  'use strict';

  const config = window.DIHAC_CONFIG || {};
  const integrations = config.integrations || {};
  const attributionKeys = [
    'lead_id', 'claim_id', 'campaign_id',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'fbclid', 'gclid', 'ttclid'
  ];
  const params = new URLSearchParams(window.location.search);

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + '_' + window.crypto.randomUUID();
    }
    const bytes = new Uint32Array(4);
    window.crypto.getRandomValues(bytes);
    return prefix + '_' + Array.from(bytes, function (part) { return part.toString(16); }).join('');
  }

  function getSessionId() {
    const key = 'dihac_session_id';
    try {
      let value = window.sessionStorage.getItem(key);
      if (!value) {
        value = makeId('session');
        window.sessionStorage.setItem(key, value);
      }
      return value;
    } catch (_error) {
      return makeId('session');
    }
  }

  function getStoredAttribution() {
    const key = 'dihac_attribution';
    const current = {};
    attributionKeys.forEach(function (name) {
      const value = params.get(name);
      if (value) current[name] = value.slice(0, 300);
    });

    try {
      const stored = JSON.parse(window.sessionStorage.getItem(key) || '{}');
      const merged = Object.assign({}, stored, current);
      window.sessionStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch (_error) {
      return current;
    }
  }

  const context = Object.freeze(Object.assign({
    domain_id: config.domainId || 'doihaveaclaim.ai',
    session_id: getSessionId()
  }, getStoredAttribution()));

  function pushEvent(eventName, safeDetails) {
    if (!integrations.analyticsEnabled) return;
    window.dataLayer = window.dataLayer || [];
    const payload = Object.assign({}, context, {
      event: eventName,
      event_id: makeId('event'),
      event_timestamp: new Date().toISOString(),
      consent_state: integrations.consentState || 'unknown'
    }, safeDetails || {});
    window.dataLayer.push(payload);
  }

  window.DIHAC_CONTEXT = context;
  window.DIHAC_TRACKING = Object.freeze({
    chatStarted: function (surface) {
      pushEvent('ee_chat_started', { chat_surface: String(surface || 'website').slice(0, 60) });
    },
    chatMessage: function (messageNumber) {
      pushEvent('ee_chat_message', { message_number: Math.max(1, Number(messageNumber) || 1) });
    },
    formStarted: function (formId) {
      pushEvent('ee_form_start', { form_id: String(formId || 'unknown').slice(0, 80) });
    },
    formSubmitted: function (formId) {
      pushEvent('ee_form_submit', { form_id: String(formId || 'unknown').slice(0, 80) });
    }
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Pages other than the Sofia homepage declare themselves with <body data-page-type="...">.
  const pageType = (document.body && document.body.dataset && document.body.dataset.pageType) || 'sofia_homepage';

  pushEvent('ee_page_view', {
    page_type: pageType,
    page_path: window.location.pathname
  });

  const phoneLink = document.querySelector('[data-sofia-phone]');
  if (phoneLink) phoneLink.addEventListener('click', function () {
    pushEvent('ee_phone_click', {
      cta_id: 'sofia_call_primary',
      contact_channel: 'phone',
      page_type: pageType
    });
  });

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('data-sofia-phone')) return;
    const href = link.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;
    const destination = new URL(href, window.location.href);
    if (destination.origin === window.location.origin) return;
    pushEvent('ee_outbound_click', {
      link_domain: destination.hostname,
      link_id: link.id || link.dataset.trackingId || 'outbound_link'
    });
  });

  /* ======================================================================
   * Quiz engine
   *
   * Config-driven. One quiz definition per tort at
   *   <config.quiz.basePath><tort>/quiz.json
   * The engine evaluates answers against the quiz's own scoring rules and
   * emits exactly one signal: strong | possible | unlikely. The result screen
   * shows a headline, the matched lawyer type and one next step
   * (sofia_outreach or resources).
   *
   * Language rules are enforced, not just documented: quiz content is linted
   * before it renders, and the site-wide disclaimer is appended to every
   * result. DIHAC is a matching service, not a law firm. Nothing here decides
   * that anyone has a claim; the strongest wording allowed is
   * "potentially qualify".
   *
   * Styling is intentionally not part of this file. The engine renders
   * semantic markup with stable `dihac-quiz*` class names and data attributes.
   * ==================================================================== */

  const quizConfig = config.quiz || {};
  const SIGNALS = ['strong', 'possible', 'unlikely'];
  const NEXT_STEPS = ['sofia_outreach', 'resources'];
  const QUESTION_TYPES = ['single', 'multi'];
  const TORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,60}$/;
  const MAX_TEXT = 600;

  // Phrases the quiz content may never contain. The only permitted use of
  // "qualify" is "potentially qualify"; the lint strips that phrase first.
  const FORBIDDEN_PHRASES = [
    { pattern: /qualif/i, rule: '"qualify" only as "potentially qualify"' },
    { pattern: /eligib/i, rule: 'no "eligible"/"eligibility" (use "potentially qualify")' },
    { pattern: /guarantee/i, rule: 'no guarantees' },
    { pattern: /compensat/i, rule: 'never promise or mention compensation' },
    { pattern: /settlement|payout|verdict|award/i, rule: 'never promise outcomes' },
    { pattern: /\bentitled\b/i, rule: 'never state entitlement' },
    { pattern: /\byou (do )?have a (valid |strong |real |good )?(claim|case|lawsuit)\b/i, rule: 'never state that a claim exists' },
    { pattern: /\byou (will|would|should|are going to) (win|receive|recover|get|be accepted|be represented)/i, rule: 'never promise outcomes' },
    { pattern: /\b(will|would|can) (accept|represent|take) (you|your)\b/i, rule: 'never promise acceptance' },
    { pattern: /\baccept(ed|ance|s|ing)?\b/i, rule: 'never promise acceptance' },
    { pattern: /\bour (attorneys?|lawyers?|law firm|legal team)\b/i, rule: 'DIHAC is a matching service, not a law firm' },
    { pattern: /\blegal advice\b/i, rule: 'no legal advice (the disclaimer covers this once)' },
    { pattern: /\b(free|no[- ]cost) (consultation|case review|evaluation)\b/i, rule: 'never promise firm services' },
    { pattern: /\bstatute of limitations\b|\bdeadline\b/i, rule: 'no deadline or limitations statements' }
  ];
  const REQUIRED_RESULT_PHRASE = /potentially qualify/i;

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || MAX_TEXT);
  }

  /* ---------- structural validation ---------- */

  function validateQuiz(quiz) {
    const problems = [];
    const fail = function (message) { problems.push(message); };
    if (!isPlainObject(quiz)) return ['quiz must be an object'];

    if (!TORT_PATTERN.test(String(quiz.tort || ''))) fail('tort must be a lowercase slug');
    if (!text(quiz.title)) fail('title is required');
    if (!isPlainObject(quiz.lawyerType) || !text(quiz.lawyerType.id) || !text(quiz.lawyerType.label)) {
      fail('lawyerType.id and lawyerType.label are required');
    }

    const questionIds = new Set();
    if (!Array.isArray(quiz.questions) || !quiz.questions.length) {
      fail('questions must be a non-empty array');
    } else {
      quiz.questions.forEach(function (question, index) {
        const where = 'questions[' + index + ']';
        if (!isPlainObject(question)) return fail(where + ' must be an object');
        if (!/^[a-z][a-z0-9_]{0,40}$/.test(String(question.id || ''))) fail(where + '.id must be a snake_case identifier');
        if (questionIds.has(question.id)) fail(where + '.id duplicates ' + question.id);
        questionIds.add(question.id);
        if (QUESTION_TYPES.indexOf(question.type) === -1) fail(where + '.type must be single or multi');
        if (!text(question.prompt)) fail(where + '.prompt is required');
        if (!Array.isArray(question.options) || question.options.length < 2) {
          fail(where + '.options needs at least two options');
        } else {
          const values = new Set();
          question.options.forEach(function (option, optionIndex) {
            const optionWhere = where + '.options[' + optionIndex + ']';
            if (!isPlainObject(option)) return fail(optionWhere + ' must be an object');
            if (!/^[a-z0-9][a-z0-9_]{0,40}$/.test(String(option.value || ''))) fail(optionWhere + '.value must be a slug');
            if (values.has(option.value)) fail(optionWhere + '.value duplicates ' + option.value);
            values.add(option.value);
            if (!text(option.label)) fail(optionWhere + '.label is required');
          });
        }
      });
    }

    const scoring = quiz.scoring;
    if (!isPlainObject(scoring)) {
      fail('scoring is required');
    } else {
      ['disqualify', 'required', 'points'].forEach(function (key) {
        if (scoring[key] == null) return;
        if (!Array.isArray(scoring[key])) return fail('scoring.' + key + ' must be an array');
        scoring[key].forEach(function (rule, index) {
          const where = 'scoring.' + key + '[' + index + ']';
          if (!isPlainObject(rule) || !isPlainObject(rule.when)) return fail(where + '.when is required');
          validateCondition(rule.when, questionIds, where + '.when', problems);
          if (key === 'points' && !Number.isFinite(rule.points)) fail(where + '.points must be a number');
        });
      });
      const thresholds = scoring.thresholds;
      if (!isPlainObject(thresholds) || !Number.isFinite(thresholds.strong) || !Number.isFinite(thresholds.possible)) {
        fail('scoring.thresholds.strong and scoring.thresholds.possible must be numbers');
      } else if (thresholds.strong <= thresholds.possible) {
        fail('scoring.thresholds.strong must be greater than scoring.thresholds.possible');
      }
    }

    if (!isPlainObject(quiz.results)) {
      fail('results is required');
    } else {
      SIGNALS.forEach(function (signal) {
        const result = quiz.results[signal];
        const where = 'results.' + signal;
        if (!isPlainObject(result)) return fail(where + ' is required');
        if (!text(result.headline)) fail(where + '.headline is required');
        if (NEXT_STEPS.indexOf(result.nextStep) === -1) fail(where + '.nextStep must be sofia_outreach or resources');
        if (result.lawyerType != null && (!isPlainObject(result.lawyerType) || !text(result.lawyerType.id) || !text(result.lawyerType.label))) {
          fail(where + '.lawyerType must include id and label');
        }
      });
    }
    return problems;
  }

  function validateCondition(condition, questionIds, where, problems) {
    if (!isPlainObject(condition)) return problems.push(where + ' must be an object');
    if (Array.isArray(condition.all) || Array.isArray(condition.any)) {
      const list = condition.all || condition.any;
      if (!list.length) problems.push(where + ' needs at least one child condition');
      list.forEach(function (child, index) { validateCondition(child, questionIds, where + '[' + index + ']', problems); });
      return;
    }
    if (condition.not) return validateCondition(condition.not, questionIds, where + '.not', problems);
    if (!questionIds.has(condition.question)) return problems.push(where + ' references unknown question ' + condition.question);
    const operators = ['is', 'in', 'includesAll', 'answered'].filter(function (key) { return condition[key] !== undefined; });
    if (operators.length !== 1) problems.push(where + ' needs exactly one of is | in | includesAll | answered');
    if (condition.in !== undefined && !Array.isArray(condition.in)) problems.push(where + '.in must be an array');
    if (condition.includesAll !== undefined && !Array.isArray(condition.includesAll)) problems.push(where + '.includesAll must be an array');
  }

  /* ---------- language lint ---------- */

  function lintQuiz(quiz) {
    const problems = [];
    const visit = function (value, path) {
      if (typeof value === 'string') {
        // Only "potentially qualify" (and "potentially qualifying") is allowed.
        const stripped = value.replace(/potentially qualif(y|ying|ies)\b/gi, '');
        FORBIDDEN_PHRASES.forEach(function (entry) {
          if (entry.pattern.test(stripped)) problems.push(path + ': ' + entry.rule + ' (found in "' + value.slice(0, 80) + '")');
        });
        return;
      }
      if (Array.isArray(value)) return value.forEach(function (item, index) { visit(item, path + '[' + index + ']'); });
      if (isPlainObject(value)) Object.keys(value).forEach(function (key) { visit(value[key], path + '.' + key); });
    };
    visit(quiz, 'quiz');

    if (isPlainObject(quiz) && isPlainObject(quiz.results)) {
      ['strong', 'possible'].forEach(function (signal) {
        const result = quiz.results[signal] || {};
        if (!REQUIRED_RESULT_PHRASE.test(text(result.headline) + ' ' + text(result.body))) {
          problems.push('quiz.results.' + signal + ': must say "potentially qualify"');
        }
      });
      const unlikely = quiz.results.unlikely || {};
      if (REQUIRED_RESULT_PHRASE.test(text(unlikely.headline))) {
        problems.push('quiz.results.unlikely.headline: must not suggest a match');
      }
    }
    return problems;
  }

  /* ---------- scoring ---------- */

  function answerList(answers, questionId) {
    const value = answers ? answers[questionId] : undefined;
    if (value == null || value === '') return [];
    return Array.isArray(value) ? value.map(String) : [String(value)];
  }

  function matches(condition, answers) {
    if (!isPlainObject(condition)) return false;
    if (Array.isArray(condition.all)) return condition.all.every(function (child) { return matches(child, answers); });
    if (Array.isArray(condition.any)) return condition.any.some(function (child) { return matches(child, answers); });
    if (condition.not) return !matches(condition.not, answers);
    const given = answerList(answers, condition.question);
    if (condition.answered !== undefined) return (given.length > 0) === !!condition.answered;
    if (condition.is !== undefined) return given.indexOf(String(condition.is)) !== -1;
    if (Array.isArray(condition.in)) return condition.in.some(function (value) { return given.indexOf(String(value)) !== -1; });
    if (Array.isArray(condition.includesAll)) return condition.includesAll.every(function (value) { return given.indexOf(String(value)) !== -1; });
    return false;
  }

  function scoreQuiz(quiz, answers) {
    const scoring = quiz.scoring || {};
    const thresholds = scoring.thresholds || { strong: Infinity, possible: Infinity };
    const reasons = [];
    const disqualified = (scoring.disqualify || []).filter(function (rule) { return matches(rule.when, answers); });
    const unmetRequired = (scoring.required || []).filter(function (rule) { return !matches(rule.when, answers); });
    let points = 0;
    (scoring.points || []).forEach(function (rule) {
      if (!matches(rule.when, answers)) return;
      points += Number(rule.points) || 0;
      if (rule.reason) reasons.push(text(rule.reason));
    });

    let signal;
    if (disqualified.length) {
      signal = 'unlikely';
    } else if (points >= thresholds.strong) {
      signal = unmetRequired.length ? 'possible' : 'strong';
    } else if (points >= thresholds.possible) {
      signal = 'possible';
    } else {
      signal = 'unlikely';
    }

    return Object.freeze({
      signal: signal,
      points: points,
      thresholds: Object.freeze({ strong: thresholds.strong, possible: thresholds.possible }),
      disqualified: disqualified.map(function (rule) { return text(rule.reason) || 'A screening answer rules this path out.'; }),
      unmetRequired: unmetRequired.map(function (rule) { return text(rule.reason) || 'A screening detail still needs review.'; }),
      reasons: reasons
    });
  }

  function evaluateQuiz(quiz, answers) {
    const outcome = scoreQuiz(quiz, answers);
    const result = quiz.results[outcome.signal];
    const lawyerType = result.lawyerType || quiz.lawyerType;
    const nextStep = result.nextStep;
    return Object.freeze({
      tort: quiz.tort,
      quizVersion: text(quiz.version, 40),
      signal: outcome.signal,
      signalLabel: text((quizConfig.signals || {})[outcome.signal] && quizConfig.signals[outcome.signal].label, 60) || outcome.signal,
      points: outcome.points,
      thresholds: outcome.thresholds,
      disqualified: outcome.disqualified,
      unmetRequired: outcome.unmetRequired,
      reasons: outcome.reasons,
      headline: text(result.headline),
      body: text(result.body),
      lawyerType: Object.freeze({ id: text(lawyerType.id, 80), label: text(lawyerType.label) }),
      nextStep: nextStep,
      nextStepConfig: (quizConfig.nextSteps || {})[nextStep] || Object.freeze({ label: 'Talk with Sofia', href: '/' }),
      disclaimer: text(quizConfig.disclaimer, 1200)
    });
  }

  /* ---------- loading ---------- */

  // Strict: only an allow-listed slug resolves. Callers that want the default
  // fall back explicitly (see mountQuiz) so an unknown tort never loads
  // another tort's questions by accident.
  function resolveTort(requested) {
    const allowed = Array.isArray(quizConfig.torts) ? quizConfig.torts : [];
    const candidate = String(requested || '').toLowerCase();
    if (candidate && TORT_PATTERN.test(candidate) && allowed.indexOf(candidate) !== -1) return candidate;
    return null;
  }

  function loadQuiz(tort, basePath) {
    const resolved = resolveTort(tort);
    if (!resolved) return Promise.reject(new Error('No quiz is configured for ' + text(tort, 60)));
    const base = String(basePath || quizConfig.basePath || '/campaigns/');
    const url = new URL(base.replace(/\/?$/, '/') + resolved + '/quiz.json', window.location.href);
    return window.fetch(url.href, { cache: 'no-store', credentials: 'omit' }).then(function (response) {
      if (!response.ok) throw new Error('Quiz definition unavailable (' + response.status + ')');
      return response.json();
    }).then(function (quiz) {
      if (quiz.tort !== resolved) throw new Error('Quiz definition does not match ' + resolved);
      const problems = validateQuiz(quiz).concat(lintQuiz(quiz));
      if (problems.length) {
        const error = new Error('Quiz definition rejected: ' + problems.join('; '));
        error.problems = problems;
        throw error;
      }
      return quiz;
    });
  }

  /* ---------- rendering ---------- */

  function el(tag, attributes, children) {
    const node = document.createElement(tag);
    Object.keys(attributes || {}).forEach(function (key) {
      if (attributes[key] == null || attributes[key] === false) return;
      if (key === 'text') node.textContent = attributes[key];
      else if (key === 'className') node.className = attributes[key];
      else node.setAttribute(key, attributes[key] === true ? '' : String(attributes[key]));
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function renderQuiz(mount, quiz) {
    const questions = quiz.questions;
    const answers = {};
    const state = { step: 0, started: false, completed: false };
    const formId = 'dihac_quiz_' + quiz.tort;
    mount.innerHTML = '';
    mount.setAttribute('data-quiz-tort', quiz.tort);
    mount.setAttribute('data-quiz-state', 'question');

    const root = el('section', { className: 'dihac-quiz', 'aria-live': 'polite' });
    const header = el('header', { className: 'dihac-quiz__header' }, [
      el('p', { className: 'dihac-quiz__eyebrow', text: text(quiz.eyebrow, 120) || 'A few quick questions' }),
      el('h2', { className: 'dihac-quiz__title', text: text(quiz.title, 160) }),
      quiz.intro ? el('p', { className: 'dihac-quiz__intro', text: text(quiz.intro) }) : null
    ]);
    const progress = el('p', { className: 'dihac-quiz__progress', role: 'status' });
    const stage = el('div', { className: 'dihac-quiz__stage' });
    const notice = el('p', { className: 'dihac-quiz__notice', text: text(quiz.notice) || 'Your answers stay on this page until you choose a next step. This is not a legal evaluation.' });
    root.appendChild(header);
    root.appendChild(progress);
    root.appendChild(stage);
    root.appendChild(notice);
    mount.appendChild(root);

    function markStarted() {
      if (state.started) return;
      state.started = true;
      pushEvent('ee_quiz_start', { quiz_tort: quiz.tort, quiz_version: text(quiz.version, 40), form_id: formId });
      if (window.DIHAC_TRACKING) window.DIHAC_TRACKING.formStarted(formId);
    }

    function renderQuestion() {
      const index = state.step;
      const question = questions[index];
      const inputName = formId + '_' + question.id;
      progress.textContent = 'Question ' + (index + 1) + ' of ' + questions.length;
      mount.setAttribute('data-quiz-state', 'question');
      stage.innerHTML = '';

      const form = el('form', { className: 'dihac-quiz__question', 'data-question-id': question.id, novalidate: true });
      const fieldset = el('fieldset', { className: 'dihac-quiz__fieldset' }, [
        el('legend', { className: 'dihac-quiz__prompt', text: text(question.prompt) }),
        question.help ? el('p', { className: 'dihac-quiz__help', text: text(question.help) }) : null
      ]);
      const options = el('div', { className: 'dihac-quiz__options', role: question.type === 'multi' ? 'group' : undefined });
      const selected = answerList(answers, question.id);
      question.options.forEach(function (option, optionIndex) {
        const inputId = inputName + '_' + optionIndex;
        const input = el('input', {
          className: 'dihac-quiz__input',
          type: question.type === 'multi' ? 'checkbox' : 'radio',
          name: inputName,
          id: inputId,
          value: option.value
        });
        input.checked = selected.indexOf(option.value) !== -1;
        input.addEventListener('change', markStarted);
        const label = el('label', { className: 'dihac-quiz__option', for: inputId }, [
          input,
          el('span', { className: 'dihac-quiz__option-label', text: text(option.label, 200) }),
          option.help ? el('small', { className: 'dihac-quiz__option-help', text: text(option.help, 240) }) : null
        ]);
        options.appendChild(label);
      });
      fieldset.appendChild(options);
      form.appendChild(fieldset);

      const error = el('p', { className: 'dihac-quiz__error', role: 'alert', hidden: true });
      const nav = el('div', { className: 'dihac-quiz__nav' });
      if (index > 0) {
        const back = el('button', { type: 'button', className: 'dihac-quiz__back', text: 'Back' });
        back.addEventListener('click', function () { state.step -= 1; renderQuestion(); });
        nav.appendChild(back);
      }
      nav.appendChild(el('button', { type: 'submit', className: 'dihac-quiz__next', text: index === questions.length - 1 ? 'See my result' : 'Continue' }));
      form.appendChild(error);
      form.appendChild(nav);

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const chosen = Array.prototype.slice.call(form.querySelectorAll('input:checked')).map(function (input) { return input.value; });
        if (!chosen.length && !question.optional) {
          error.textContent = question.type === 'multi' ? 'Choose at least one option to continue.' : 'Choose one option to continue.';
          error.hidden = false;
          return;
        }
        error.hidden = true;
        if (question.type === 'multi') answers[question.id] = chosen;
        else if (chosen.length) answers[question.id] = chosen[0];
        else delete answers[question.id];
        markStarted();
        pushEvent('ee_quiz_step', { quiz_tort: quiz.tort, question_id: question.id, step_number: index + 1, step_total: questions.length });
        if (index + 1 < questions.length) {
          state.step = index + 1;
          renderQuestion();
        } else {
          renderResult();
        }
      });

      stage.appendChild(form);
      const focusTarget = form.querySelector('legend');
      if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: false }); }
    }

    function renderResult() {
      const result = evaluateQuiz(quiz, answers);
      state.completed = true;
      mount.setAttribute('data-quiz-state', 'result');
      mount.setAttribute('data-quiz-signal', result.signal);
      progress.textContent = 'Your result';
      stage.innerHTML = '';

      pushEvent('ee_quiz_complete', {
        quiz_tort: quiz.tort,
        quiz_version: result.quizVersion,
        quiz_signal: result.signal,
        quiz_points: result.points,
        lawyer_type_id: result.lawyerType.id,
        next_step: result.nextStep,
        form_id: formId
      });
      if (window.DIHAC_TRACKING) window.DIHAC_TRACKING.formSubmitted(formId);

      const step = result.nextStepConfig || {};
      const article = el('article', { className: 'dihac-quiz__result', 'data-signal': result.signal, 'data-next-step': result.nextStep }, [
        el('p', { className: 'dihac-quiz__signal', text: result.signalLabel }),
        el('h3', { className: 'dihac-quiz__headline', text: result.headline }),
        result.body ? el('p', { className: 'dihac-quiz__body', text: result.body }) : null,
        el('p', { className: 'dihac-quiz__lawyer-type' }, [
          el('span', { className: 'dihac-quiz__lawyer-type-label', text: 'Type of lawyer who reviews matters like this: ' }),
          el('strong', { text: result.lawyerType.label })
        ])
      ]);

      if (result.unmetRequired.length || result.disqualified.length) {
        const list = el('ul', { className: 'dihac-quiz__notes' });
        result.disqualified.concat(result.unmetRequired).forEach(function (reason) { list.appendChild(el('li', { text: reason })); });
        article.appendChild(list);
      }

      const nextStep = el('div', { className: 'dihac-quiz__next-step' }, [
        el('h4', { className: 'dihac-quiz__next-step-title', text: 'Next step' }),
        step.description ? el('p', { text: text(step.description) }) : null
      ]);
      const actions = el('div', { className: 'dihac-quiz__actions' });
      if (step.href) actions.appendChild(el('a', { className: 'dihac-quiz__cta dihac-quiz__cta--primary', href: step.href, 'data-ee-cta': 'quiz_' + result.nextStep, text: text(step.label, 80) || 'Continue' }));
      if (result.nextStep === 'sofia_outreach' && step.phone) {
        actions.appendChild(el('a', { className: 'dihac-quiz__cta dihac-quiz__cta--phone', href: 'tel:' + step.phone, 'data-ee-cta': 'quiz_sofia_call', text: 'Call Sofia ' + text(step.phoneDisplay, 30) }));
      }
      nextStep.appendChild(actions);
      if (result.nextStep === 'resources' && Array.isArray(step.links) && step.links.length) {
        const links = el('ul', { className: 'dihac-quiz__links' });
        step.links.forEach(function (link) {
          if (!link || !link.href) return;
          links.appendChild(el('li', {}, [el('a', { href: link.href, text: text(link.label, 80) })]));
        });
        nextStep.appendChild(links);
      }
      article.appendChild(nextStep);
      article.appendChild(el('p', { className: 'dihac-quiz__disclaimer', text: result.disclaimer }));

      const restart = el('button', { type: 'button', className: 'dihac-quiz__restart', text: 'Start over' });
      restart.addEventListener('click', function () {
        Object.keys(answers).forEach(function (key) { delete answers[key]; });
        state.step = 0;
        state.completed = false;
        mount.removeAttribute('data-quiz-signal');
        renderQuestion();
      });
      article.appendChild(restart);
      stage.appendChild(article);
      const headline = article.querySelector('.dihac-quiz__headline');
      if (headline) { headline.setAttribute('tabindex', '-1'); headline.focus(); }
    }

    renderQuestion();
    return Object.freeze({
      quiz: quiz,
      answers: answers,
      state: state,
      evaluate: function () { return evaluateQuiz(quiz, answers); }
    });
  }

  function renderUnavailable(mount, error) {
    mount.innerHTML = '';
    mount.setAttribute('data-quiz-state', 'unavailable');
    const sofia = (quizConfig.nextSteps || {}).sofia_outreach || { href: '/', label: 'Talk with Sofia' };
    mount.appendChild(el('section', { className: 'dihac-quiz dihac-quiz--unavailable' }, [
      el('h2', { className: 'dihac-quiz__title', text: 'This questionnaire is not available right now.' }),
      el('p', { className: 'dihac-quiz__body', text: 'You can still talk with Sofia about what happened.' }),
      el('a', { className: 'dihac-quiz__cta dihac-quiz__cta--primary', href: sofia.href, text: text(sofia.label, 80) })
    ]));
    if (window.console && error) window.console.warn('[dihac quiz]', error.message || error);
  }

  function mountQuiz(mount) {
    const attribute = mount.getAttribute('data-dihac-quiz');
    const requested = (!attribute || attribute === 'auto') ? params.get('tort') : attribute;
    const tort = resolveTort(requested) || resolveTort(quizConfig.defaultTort);
    if (!tort) {
      renderUnavailable(mount, new Error('No quiz configured for ' + text(requested, 60)));
      return Promise.resolve(null);
    }
    mount.setAttribute('aria-busy', 'true');
    return loadQuiz(tort, mount.getAttribute('data-quiz-base')).then(function (quiz) {
      mount.removeAttribute('aria-busy');
      return renderQuiz(mount, quiz);
    }).catch(function (error) {
      mount.removeAttribute('aria-busy');
      renderUnavailable(mount, error);
      return null;
    });
  }

  window.DIHAC_QUIZ = Object.freeze({
    signals: Object.freeze(SIGNALS.slice()),
    nextSteps: Object.freeze(NEXT_STEPS.slice()),
    validate: validateQuiz,
    lint: lintQuiz,
    matches: matches,
    score: scoreQuiz,
    evaluate: evaluateQuiz,
    resolveTort: resolveTort,
    load: loadQuiz,
    render: renderQuiz,
    mount: mountQuiz
  });

  if (typeof document.querySelectorAll === 'function') {
    Array.prototype.slice.call(document.querySelectorAll('[data-dihac-quiz]')).forEach(mountQuiz);
  }
})();
