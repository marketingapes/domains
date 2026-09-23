/* Toned 'N Tasty — Spin-a-Bowl widget. Plain JS, no network calls. */
(function(){
  var root = document.getElementById('bowl');
  if (!root) return;
  // Protein grams are rough typical values for the portion shown; labels vary.
  var parts = {
    protein: [
      ['4 oz grilled chicken thigh', 28], ['4 oz baked salmon', 25], ['3/4 cup shelled edamame', 14],
      ['5 oz firm tofu, crisped', 14], ['2 hard-boiled eggs', 12], ['4 oz lean ground turkey', 22],
      ['1 can tuna, drained', 25], ['4 oz shrimp', 23], ['3/4 cup cooked lentils', 13]
    ],
    base: [
      ['1 cup brown rice', 5], ['1 cup quinoa', 8], ['2 cups mixed greens', 2], ['1 cup soba noodles', 6],
      ['1 cup roasted sweet potato', 2], ['1 cup farro', 7], ['1 whole-wheat wrap', 5]
    ],
    veg: [
      ['roasted broccoli', 3], ['charred corn + peppers', 2], ['cucumber + cherry tomato', 1],
      ['shredded cabbage slaw', 1], ['sauteed spinach + mushrooms', 3], ['pickled red onion + radish', 0],
      ['roasted zucchini', 2]
    ],
    sauce: [
      ['lemon-tahini drizzle', 2], ['Greek yogurt tzatziki', 4], ['peanut-lime sauce', 3],
      ['salsa verde', 0], ['sriracha-honey glaze', 0], ['chimichurri', 0], ['miso-ginger dressing', 1]
    ]
  };
  var order = ['protein', 'base', 'veg', 'sauce'];
  var current = {};
  var out = document.getElementById('bowl-out');
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function render(){
    var total = 0;
    order.forEach(function(k){ total += current[k][1]; });
    out.textContent = 'Rough protein estimate: about ' + total + ' g. ' +
      (total >= 30 ? 'A solid main meal.' : 'Add an egg, a scoop of yogurt sauce or extra beans to bump it up.');
  }
  function spin(){
    order.forEach(function(k){
      var box = document.getElementById('lock-' + k);
      if (box && box.checked && current[k]) return;
      var next = pick(parts[k]);
      if (current[k] && parts[k].length > 1) { while (next[0] === current[k][0]) next = pick(parts[k]); }
      current[k] = next;
      var slot = document.getElementById('slot-' + k);
      slot.querySelector('.val').textContent = next[0];
      slot.classList.remove('spin'); void slot.offsetWidth; slot.classList.add('spin');
    });
    render();
  }
  document.getElementById('bowl-spin').addEventListener('click', spin);
  spin();
})();
