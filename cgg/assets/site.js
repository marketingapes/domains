/* Crazy Golf Game: Crazy Hole Generator (no network calls) */
(function () {
  var spin = document.getElementById('gen-spin');
  if (!spin) return;
  var where = document.getElementById('gen-where');
  var out = {
    hole: document.getElementById('gen-hole'), obstacle: document.getElementById('gen-obstacle'),
    twist: document.getElementById('gen-twist'), par: document.getElementById('gen-par')
  };
  var ball = document.querySelector('.gen-ball');
  var OBSTACLES = {
    yard: [
      ['Garden-hose S-bend around two flower pots', 3], ['Plank ramp onto an upturned tray green', 3],
      ['Bucket-on-its-side volcano at the end of a slope', 2], ['Pool-noodle half-pipe around the tree trunk', 3],
      ['Shoe slalom: every player donates one shoe', 3], ['Cardboard-box tunnel with two exits, only one is good', 3],
      ['Bank shot off a board set at an angle', 2], ['Watering-can gate you must putt between', 2],
      ['Brick wall with a single ball-width gap', 3], ['Long lag across the whole lawn to a hoop', 4]
    ],
    home: [
      ['Tunnel under the coffee table', 2], ['Sofa-cushion bank shot', 2], ['Book ramp into a shoebox', 3],
      ['Hallway par four with a sock slalom', 4], ['Weave through the dining chair legs', 3],
      ['Mug-on-its-side cup behind a pillow wall', 2], ['Rug-to-floor speed change, stop in a tape circle', 3],
      ['Cardboard windmill with spinning blades', 3], ['Laundry-basket finale: any touch counts', 2],
      ['Towel-roll maze with one dead end', 3]
    ],
    course: [['Play the hole as designed', 0]]
  };
  var TWISTS = [
    'Putt with your weaker hand', 'One hand on the putter only', 'Close your eyes for the stroke',
    'Your opponent chooses where you tee off (within the tee area)', 'Hum a tune until the ball stops',
    'Ace it and pick the next twist for everyone', 'Croquet style: putt between your feet',
    'Every bank shot earns a bonus point', 'Play it as a two-person scramble', 'No twist, just pure golf. Rare!',
    'Last place on the previous hole tees off first and gets a mulligan', 'Call your shot: name the wall you will hit'
  ];
  var holeNo = 0;
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  spin.addEventListener('click', function () {
    var list = OBSTACLES[where.value] || OBSTACLES.yard;
    var o = pick(list);
    holeNo = holeNo >= 18 ? 1 : holeNo + 1;
    out.hole.textContent = holeNo;
    out.obstacle.textContent = o[0];
    out.twist.textContent = pick(TWISTS);
    out.par.textContent = o[1] ? String(o[1]) : 'Use the par on the scorecard';
    if (ball) { ball.classList.remove('spin'); void ball.offsetWidth; ball.classList.add('spin'); }
  });
})();
