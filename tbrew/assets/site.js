/* Tossed Brew: "Which beer style should I try?" picker. Runs locally, no network calls. */
(function () {
  var form = document.getElementById('style-picker');
  if (!form) return;
  var out = document.getElementById('picker-result');
  var STYLES = [
    { name: 'Pilsner', f: ['bready'], b: 2, s: 1, o: ['sun', 'dinner'], why: 'Crisp, golden and refreshing, with bready malt and a clean, gently bitter snap of floral hops.', glass: 'Tall pilsner glass', food: 'Fried fish, pretzels, salads', link: '/articles/beer-styles-explained/', read: 'Beer styles explained' },
    { name: 'Helles or Kölsch', f: ['bready'], b: 1, s: 1, o: ['sun'], why: 'Soft, delicate and easy-drinking, with honeyed malt and very little bitterness.', glass: 'Stange or mug', food: 'Sausages, soft cheese, picnic food', link: '/articles/beer-glassware-guide/', read: 'Beer glassware guide' },
    { name: 'Märzen or Vienna lager', f: ['bready', 'roast'], b: 2, s: 2, o: ['dinner', 'cozy'], why: 'Amber, toasty and smooth, with bread-crust malt that flatters roasts and spicy food alike.', glass: 'Mug or nonic pint', food: 'Roast chicken, tacos, barbecue', link: '/articles/beer-food-pairing/', read: 'Beer and food pairing' },
    { name: 'Hefeweizen', f: ['spice', 'bready'], b: 1, s: 1, o: ['sun', 'dinner'], why: 'Cloudy Bavarian wheat beer with banana and clove aromas and a big fluffy head.', glass: 'Weizen glass', food: 'Brunch, salads, mild curry', link: '/articles/how-to-pour-beer/', read: 'How to pour a beer' },
    { name: 'Saison', f: ['spice', 'citrus'], b: 2, s: 2, o: ['dinner', 'sun'], why: 'Dry, lively Belgian farmhouse ale with peppery yeast and a bright, fruity edge. Extremely food-friendly.', glass: 'Tulip', food: 'Washed-rind cheese, seafood, herby dishes', link: '/articles/beer-food-pairing/', read: 'Beer and food pairing' },
    { name: 'Belgian tripel or dubbel', f: ['spice', 'bready'], b: 2, s: 3, o: ['cozy', 'dinner'], why: 'Strong Belgian ales: tripels are golden and spicy, dubbels darker with raisin and caramel. Sip slowly.', glass: 'Chalice or tulip', food: 'Roast pork, Gruyère, stews', link: '/articles/beer-styles-explained/', read: 'Beer styles explained' },
    { name: 'Hazy IPA', f: ['citrus'], b: 1, s: 2, o: ['sun', 'dinner'], why: 'Soft, juicy and aromatic, with mango, peach and citrus notes and gentle bitterness. Buy it fresh.', glass: 'Tulip or teku', food: 'Fish tacos, grilled chicken, Thai salads', link: '/articles/ipa-styles-guide/', read: 'IPA decoded' },
    { name: 'West Coast IPA', f: ['citrus'], b: 3, s: 2, o: ['dinner', 'sun'], why: 'Clear, dry and assertive, full of pine, grapefruit and resin with a firm bitter finish.', glass: 'Tulip or nonic pint', food: 'Burgers, sharp cheddar, fried food', link: '/articles/ipa-styles-guide/', read: 'IPA decoded' },
    { name: 'Session IPA or pale ale', f: ['citrus', 'bready'], b: 2, s: 1, o: ['sun'], why: 'All the hop aroma in a lighter, lower-alcohol package that suits a long afternoon.', glass: 'Nonic pint', food: 'Burgers, nachos, grilled veg', link: '/articles/ipa-styles-guide/', read: 'IPA decoded' },
    { name: 'Double IPA', f: ['citrus'], b: 3, s: 3, o: ['cozy', 'dinner'], why: 'Big hops and big malt. Intense, resinous and strong, so pour a smaller glass.', glass: 'Tulip or snifter', food: 'Carrot cake, blue cheese, spicy wings (if you like heat)', link: '/articles/ipa-styles-guide/', read: 'IPA decoded' },
    { name: 'Dry Irish stout', f: ['roast'], b: 2, s: 1, o: ['dinner', 'cozy'], why: 'Black but light-bodied and surprisingly low in alcohol, with dry coffee-like roast.', glass: 'Nonic pint', food: 'Oysters, stew, shepherd’s pie', link: '/articles/stouts-vs-porters/', read: 'Stouts vs porters' },
    { name: 'Porter or milk stout', f: ['roast'], b: 1, s: 2, o: ['cozy', 'dinner'], why: 'Chocolatey, rounded and smooth; milk stouts add a creamy sweetness from lactose.', glass: 'Nonic pint', food: 'Barbecue, brownies, mushroom dishes', link: '/articles/stouts-vs-porters/', read: 'Stouts vs porters' },
    { name: 'Imperial stout', f: ['roast'], b: 2, s: 3, o: ['cozy'], why: 'Rich, strong and layered with dark chocolate, coffee and dried fruit. A dessert in itself.', glass: 'Snifter', food: 'Chocolate cake, blue cheese', link: '/articles/stouts-vs-porters/', read: 'Stouts vs porters' },
    { name: 'Gose or Berliner Weisse', f: ['tart'], b: 1, s: 1, o: ['sun'], why: 'Light, tart and thirst-quenching; gose adds a pinch of salt and coriander.', glass: 'Stange or tulip', food: 'Ceviche, goat cheese salad', link: '/articles/sour-beer-guide/', read: 'Sour beer guide' },
    { name: 'Fruited sour', f: ['tart'], b: 1, s: 2, o: ['sun', 'dinner'], why: 'Bright, fruity and tangy, often with raspberries, cherries or passion fruit. A fun first sour.', glass: 'Tulip', food: 'Cheesecake, fruit tarts, charcuterie', link: '/articles/sour-beer-guide/', read: 'Sour beer guide' },
    { name: 'Flanders red or gueuze', f: ['tart'], b: 1, s: 2, o: ['dinner', 'cozy'], why: 'Complex Belgian sours: wine-like cherry and oak, or dry, funky and champagne-fizzy.', glass: 'Tulip or stemmed glass', food: 'Duck, pork belly, aged cheese', link: '/articles/sour-beer-guide/', read: 'Sour beer guide' }
  ];
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function score(st, a) {
    var sc = 0;
    if (st.f.indexOf(a.flavour) === 0) sc += 6; else if (st.f.indexOf(a.flavour) > 0) sc += 4;
    sc += 3 - 1.5 * Math.abs(st.b - a.bitter);
    sc += 3 - 1.5 * Math.abs(st.s - a.strength);
    if (st.o.indexOf(a.occasion) !== -1) sc += 1.5;
    return sc;
  }
  function show(best, alt, note) {
    out.hidden = false;
    out.innerHTML = (note ? '<p class="eyebrow">' + esc(note) + '</p>' : '<p class="eyebrow">Your pour</p>') +
      '<h3>' + esc(best.name) + '</h3><p>' + esc(best.why) + '</p>' +
      '<dl><dt>Glass</dt><dd>' + esc(best.glass) + '</dd><dt>Try with</dt><dd>' + esc(best.food) + '</dd>' +
      (alt ? '<dt>Also try</dt><dd>' + esc(alt.name) + '</dd>' : '') + '</dl>' +
      '<p>Learn more: <a href="' + best.link + '">' + esc(best.read) + '</a>. Ask for a small taster first, and enjoy responsibly.</p>';
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var a = { flavour: fd.get('flavour'), bitter: +fd.get('bitter'), strength: +fd.get('strength'), occasion: fd.get('occasion') };
    var ranked = STYLES.map(function (s) { return { s: s, v: score(s, a) }; }).sort(function (x, y) { return y.v - x.v; });
    show(ranked[0].s, ranked[1].s);
  });
  document.getElementById('picker-random').addEventListener('click', function () {
    var i = Math.floor(Math.random() * STYLES.length);
    show(STYLES[i], null, 'Wild card');
  });
})();
