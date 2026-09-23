/* Research Investigation: before-you-buy red-flag scorer. Runs locally; no network calls. */
(function () {
  var box = document.getElementById('flags');
  if (!box) return;
  // w: weight (3 = serious, 2 = notable, 1 = worth checking); stop: deal-breaker
  var DATA = {
    shop: {
      read: ['/articles/is-this-online-store-legit/', 'Is this online store legit?'],
      flags: [
        { t: 'Asks for payment by bank transfer, crypto or gift cards only', w: 3, stop: true },
        { t: 'Prices far below every other retailer for the same item', w: 3 },
        { t: 'Web address has a misspelling or an odd ending', h: 'e.g. extra words like "-official-sale"', w: 3 },
        { t: 'Domain registered only weeks or months ago', w: 2 },
        { t: 'No physical address, company name or working phone number', w: 2 },
        { t: 'Reviews appear only on the shop\'s own site', w: 2 },
        { t: 'Returns policy missing, vague or copied from another site', w: 1 },
        { t: 'Countdown timers and "only 2 left" pressure everywhere', w: 1 }
      ]
    },
    trade: {
      read: ['/articles/vet-a-contractor/', 'How to vet a contractor'],
      flags: [
        { t: 'Wants a large deposit in cash before any work starts', w: 3 },
        { t: 'Cannot or will not give a licence number you can look up', w: 3 },
        { t: 'Knocked on your door unasked ("just finished a job nearby")', w: 2 },
        { t: 'No written contract or itemised estimate', w: 3 },
        { t: 'Pushes you to decide today for a special price', w: 2 },
        { t: 'Will not show a certificate of insurance', w: 2 },
        { t: 'Only a mobile number; no business address', w: 1 },
        { t: 'Suggests skipping the permit to save money', w: 2 }
      ]
    },
    rent: {
      read: ['/articles/research-a-landlord/', 'How to research a landlord'],
      flags: [
        { t: 'You cannot view the property in person before paying', w: 3 },
        { t: 'Deposit or rent requested by wire, app transfer or gift card', w: 3, stop: true },
        { t: 'Rent well below similar homes nearby', w: 2 },
        { t: '"Landlord" is abroad and will post the keys', w: 3 },
        { t: 'Listing photos also appear on another listing or site', w: 3 },
        { t: 'Name does not match the owner in public property records', w: 2 },
        { t: 'Pressure to pay now because "others are interested"', w: 1 },
        { t: 'No written lease, or a lease with blank sections', w: 2 }
      ]
    },
    private: {
      read: ['/articles/buy-secondhand-safely/', 'Buying second-hand safely'],
      flags: [
        { t: 'Seller will only ship, never meet or allow an inspection', w: 2 },
        { t: 'Wants to move the chat off the marketplace app', w: 2 },
        { t: 'Sends "too much" money and asks you to refund the difference', w: 3, stop: true },
        { t: 'Asks for payment as "friends and family" or by gift card', w: 3 },
        { t: 'Will not show a serial number, VIN or proof of ownership', w: 2 },
        { t: 'Brand-new profile with no ratings or history', w: 1 },
        { t: 'Price far below what the item usually sells for', w: 2 },
        { t: 'Story keeps changing about why they are selling', w: 1 }
      ]
    }
  };
  var kind = 'shop';
  var tabs = document.querySelectorAll('.scorer-tabs button');
  var fill = document.getElementById('meter-fill');
  var title = document.getElementById('verdict-title');
  var text = document.getElementById('verdict-text');
  var read = document.getElementById('verdict-read');

  function render() {
    var d = DATA[kind];
    box.innerHTML = '<legend class="sr-only">Red flags you have noticed</legend>';
    d.flags.forEach(function (f, i) {
      var id = 'f-' + kind + '-' + i;
      var lab = document.createElement('label');
      lab.className = 'flag';
      lab.setAttribute('for', id);
      var sev = f.stop ? 'Deal-breaker' : (f.w === 3 ? 'Serious' : f.w === 2 ? 'Notable' : 'Worth checking');
      lab.innerHTML = '<input type="checkbox" id="' + id + '" data-w="' + f.w + '"' + (f.stop ? ' data-stop="1"' : '') + '>' +
        '<span><span class="sev">' + sev + '</span><br>' + f.t + (f.h ? '<small>' + f.h + '</small>' : '') + '</span>';
      box.appendChild(lab);
    });
    score();
  }

  function score() {
    var d = DATA[kind], total = 0, max = 0, stop = false, n = 0;
    box.querySelectorAll('input').forEach(function (c) {
      var w = +c.getAttribute('data-w');
      max += w;
      c.parentNode.classList.toggle('is-on', c.checked);
      if (c.checked) { total += w; n++; if (c.getAttribute('data-stop')) stop = true; }
    });
    var pct = Math.min(100, Math.round(total / (max * 0.6) * 100));
    if (stop) pct = 100;
    fill.style.width = (100 - pct) + '%';
    var t, x;
    if (stop) {
      t = 'Stop: this is a known scam pattern';
      x = 'At least one sign you ticked is a classic way people lose money they cannot get back. Do not pay until you have independently verified who you are dealing with, and use a payment method with dispute rights.';
    } else if (n === 0) {
      t = 'No flags ticked yet';
      x = 'That is a good start, but silence is not proof. Run the basic checks anyway.';
    } else if (total <= 3) {
      t = 'Proceed, carefully';
      x = 'A small number of minor flags. Get the missing details in writing and keep your payment protected.';
    } else if (total <= 7) {
      t = 'Pause and verify';
      x = 'Several warning signs together. Verify identity, licences or ownership through an official source before you commit any money.';
    } else {
      t = 'Walk away unless you can clear every flag';
      x = 'This many red flags is a strong pattern. The safest choice is usually a different seller, contractor or listing.';
    }
    title.textContent = t + (n ? ' (' + n + ' flag' + (n > 1 ? 's' : '') + ')' : '');
    text.textContent = x;
    read.innerHTML = 'Read next: <a href="' + d.read[0] + '">' + d.read[1] + '</a> &middot; <a href="/articles/safest-ways-to-pay/">The safest ways to pay</a>';
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
      kind = b.getAttribute('data-kind');
      render();
    });
  });
  box.addEventListener('change', score);
  document.getElementById('reset').addEventListener('click', function () {
    box.querySelectorAll('input').forEach(function (c) { c.checked = false; });
    score();
  });
  render();
})();
