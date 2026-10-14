import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../btl/paraquat/', import.meta.url);
function quiz(reduced = false) {
  class Element {
    children = []; style = {}; hidden = false; attributes = {};
    set innerHTML(value) { this.children = value.includes('<span') ? [new Element(), new Element()] : []; }
    get lastChild() { return this.children.at(-1); }
    setAttribute(k, v) { this.attributes[k] = v; }
    appendChild(child) { this.children.push(child); }
    querySelector() { return this.children[0]; }
    querySelectorAll() { return this.children; }
    focus() {}
    scrollIntoView() {}
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const document = { getElementById: get, createElement: () => new Element(), addEventListener() {}, activeElement: { tagName: 'BODY' } };
  const context = { document, window: {}, matchMedia: () => ({ matches: reduced }), setTimeout() {}, location: {} };
  context.window.matchMedia = context.matchMedia;
  vm.runInNewContext(fs.readFileSync(new URL('prequal.js', root), 'utf8'), context);
  return { get, context, pick(index) { get('qChoices').children[index].onclick(); } };
}

for (const reduced of [false, true]) {
  test(`answers work without animation timers, reduced motion=${reduced}`, () => {
    const q = quiz(reduced);
    assert.equal(q.get('qChoices').children.length, 3);
    q.pick(0);
    assert.match(q.get('qPrompt').textContent, /doctor diagnosed/);
    assert.equal(q.get('qChoices').children.length, 3);
    q.get('qBack').onclick();
    assert.match(q.get('qPrompt').textContent, /yourself/);
    assert.equal(q.get('qChoices').children.length, 3);
  });
}
test('qualified path reaches result and contact while timers are paused', () => {
  const q = quiz();
  for (const index of [0, 0, 0, 0, 0, 0, 1, 0, 0, 0]) q.pick(index);
  assert.equal(q.get('resultStep').hidden, false);
  assert.equal(q.context.window.BTL_QUIZ.answers().web_outcome, 'QUALIFIED');
  q.get('rActions').children[0].onclick();
  assert.equal(q.get('contactStep').hidden, false);
});
test('uncertain and unmatched answers retain human contact option', () => {
  const q = quiz(); q.pick(0); q.pick(1);
  assert.equal(q.context.window.BTL_QUIZ.answers().web_outcome, 'NOT_A_FIT');
  q.get('rActions').children[0].onclick();
  assert.equal(q.get('contactStep').hidden, false);
});
test('existing consumer routes omit demo overview navigation and quiz uses fresh script version', () => {
  for (const path of ['index.html', 'quiz/index.html', 'talk-to-sofia/index.html']) {
    const html = fs.readFileSync(new URL(path, root), 'utf8');
    assert.doesNotMatch(html, /Paraquat demo paths|Perspective overview/);
    if (path === 'quiz/index.html') assert.match(html, /prequal\.js\?v=20261014a/);
  }
});
