import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

for (const path of ['ddm/guides/checkout-comparison/index.html', 'px/guides/pillow-cover-fit/index.html']) {
  test(`${path} prints long and multiline values as plain text without duplicate outputs`, () => {
    const html = readFileSync(path, 'utf8');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const values = ['Return terms '.repeat(100), '<img src=x onerror=alert(1)>\nsecond line', ''];
    const inserted = [];
    const fields = values.map(value => ({value, insertAdjacentElement(position, output) {
      assert.equal(position, 'afterend'); inserted.push(output);
    }}));
    let beforeprint;
    vm.runInNewContext(scripts[0][1], {
      document: {
        querySelectorAll(selector) { assert.equal(selector, 'input[type="text"], textarea'); return fields; },
        createElement(tag) { assert.equal(tag, 'div'); return {setAttribute(name, value) {
          assert.equal(name, 'aria-hidden'); assert.equal(value, 'true');
        }}; }
      },
      window: {addEventListener(name, fn) { assert.equal(name, 'beforeprint'); beforeprint = fn; }}
    });
    assert.equal(inserted.length, 3);
    beforeprint();
    assert.equal(inserted[0].textContent, values[0]);
    assert.equal(inserted[1].textContent, values[1]);
    assert.equal(inserted[2].textContent, '\u00a0');
    assert.ok(inserted.every(x => x.className === 'print-value' && !('innerHTML' in x)));
    fields[0].value = 'Updated after the first print';
    beforeprint();
    assert.equal(inserted[0].textContent, fields[0].value);
    assert.equal(inserted.length, 3);
    assert.match(html, /white-space:pre-wrap;overflow-wrap:anywhere/);
  });
}
