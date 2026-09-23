/* For Pets Like Blue: boredom-buster picker + article filter. No network calls. */
(function () {
  var IDEAS = [
    {p:'dog',t:5,e:'calm',n:'Find-it scatter',d:'Toss a small handful of their regular kibble across a rug or the lawn and say "find it". Sniffing is surprisingly tiring for dogs.',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:5,e:'calm',n:'Towel roll-up',d:'Lay a towel flat, sprinkle a few treats, roll it up loosely and let your dog unroll it.',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:5,e:'bouncy',n:'Recall ping-pong',d:'Two people stand a room apart and take turns calling the dog, paying each arrival with a treat. Quick, fun recall practice.',a:'loose-leash-walking'},
    {p:'dog',t:5,e:'bouncy',n:'Hand-target touch',d:'Hold out a flat palm; reward the moment their nose bumps it. Move your hand around so they chase the target.',a:'loose-leash-walking'},
    {p:'dog',t:15,e:'calm',n:'Muffin-tin puzzle',d:'Drop treats into a muffin tin and cover each cup with a tennis ball. Watch them work out the lift-and-sniff.',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:15,e:'calm',n:'Handling spa',d:'Short, treat-rich handling session: touch paws, lift ears, peek at teeth. Great groundwork for nails and brushing.',a:'trimming-dog-and-cat-nails'},
    {p:'dog',t:15,e:'bouncy',n:'Box shred party',d:'Stuff a cardboard box with paper and a few treats and let them rip it open (supervised; tidy the scraps afterwards).',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:15,e:'bouncy',n:'Tug with rules',d:'Play tug, then ask for a "drop" and restart the game as the reward. Builds impulse control while burning energy.',a:'crate-training-step-by-step'},
    {p:'dog',t:30,e:'calm',n:'Sniffari walk',d:'A slow walk where the dog chooses the route and sniffs as long as they like. Use a longer leash in a safe open area.',a:'loose-leash-walking'},
    {p:'dog',t:30,e:'calm',n:'Frozen lick mat',d:'Spread a thin layer of plain, dog-safe food on a lick mat and freeze it. Licking is soothing and slow.',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:30,e:'bouncy',n:'Backyard hide-and-seek',d:'Have someone hold your dog while you hide, then call once. Make the hiding spots harder as they get good.',a:'dog-enrichment-on-a-budget'},
    {p:'dog',t:30,e:'bouncy',n:'Loose-leash "treasure" walk',d:'Pay for every few steps of slack leash on the way to a favourite sniff spot. Arrival is the jackpot.',a:'loose-leash-walking'},
    {p:'cat',t:5,e:'calm',n:'Window bird TV',d:'Clear a sunny sill or add a sturdy perch by a window with a view. Instant entertainment on their terms.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:5,e:'calm',n:'Treat trail',d:'Lay a short trail of treats up a cat tree or along a shelf route so they climb to find them.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:5,e:'bouncy',n:'Wand-toy sprint',d:'Drag a wand toy away from your cat and around corners like fleeing prey. Always let them catch it at the end.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:5,e:'bouncy',n:'Paper-ball fetch',d:'Plenty of cats will chase a scrunched paper ball. Some even bring it back.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:15,e:'calm',n:'Egg-box forager',d:'Put a few pieces of dry food in an egg box or a toilet-roll pyramid so they paw them out.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:15,e:'calm',n:'Brush and chill',d:'A slow grooming session with a soft brush, stopping before they have had enough. Treats help.',a:'trimming-dog-and-cat-nails'},
    {p:'cat',t:15,e:'bouncy',n:'Hunt, catch, eat',d:'Play hard with a wand toy, let them "catch" it, then serve a meal. It follows their natural hunt-eat-groom-sleep rhythm.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:15,e:'bouncy',n:'Box fort',d:'Tape two or three boxes together with cut-out holes and drop a toy inside. Instant ambush zone.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:30,e:'calm',n:'Carrier makeover',d:'Leave the carrier open with a soft blanket and a treat inside so it becomes a nap spot, not a vet-trip warning.',a:'road-trips-with-pets'},
    {p:'cat',t:30,e:'calm',n:'Scent box',d:'Offer a box with a sprinkle of catnip or silvervine (if your cat enjoys it) and a new crinkly toy to investigate.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:30,e:'bouncy',n:'Two-round play session',d:'Two short, intense wand-toy rounds with a break between. Watch for panting and stop early if they tire.',a:'indoor-cat-play-and-enrichment'},
    {p:'cat',t:30,e:'bouncy',n:'Teach a high-five',d:'Hold a treat just above their paw height; reward any paw lift. Cats learn tricks with short, tasty sessions.',a:'bringing-home-a-new-cat'}
  ];
  var form = document.getElementById('picker');
  if (form) {
    var out = document.getElementById('idea');
    var last = -1;
    var pick = function () {
      var p = form.pet.value, t = +form.time.value, e = form.energy.value;
      var pool = [];
      IDEAS.forEach(function (x, i) { if (x.p === p && x.t === t && x.e === e && i !== last) pool.push(i); });
      if (!pool.length) IDEAS.forEach(function (x, i) { if (x.p === p && x.t === t && x.e === e) pool.push(i); });
      var i = pool[Math.floor(Math.random() * pool.length)];
      last = i;
      var x = IDEAS[i];
      out.innerHTML = '<h3></h3><p></p><p class="meta"></p><p><a></a></p>';
      out.querySelector('h3').textContent = x.n;
      out.querySelector('p').textContent = x.d;
      out.querySelector('.meta').textContent = 'About ' + x.t + ' minutes · ' + (p === 'dog' ? 'Dog' : 'Cat') + ' · ' + (e === 'calm' ? 'Calm' : 'Bouncy');
      var a = out.querySelector('a');
      a.href = '/articles/' + x.a + '/';
      a.textContent = 'Read the related guide →';
      out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
    };
    form.addEventListener('submit', function (ev) { ev.preventDefault(); pick(); });
    form.addEventListener('change', pick);
  }
  var chips = document.querySelectorAll('[data-filter]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      document.querySelectorAll('[data-cat]').forEach(function (card) {
        card.hidden = !(f === 'all' || card.getAttribute('data-cat') === f);
      });
    });
  });
})();
