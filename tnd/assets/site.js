// The Nearest Dentists: "Is this a dental emergency?" checker. No network calls.
(function () {
  var form = document.getElementById('triage-form');
  if (!form) return;
  var out = document.getElementById('triage-out');
  var btn = document.getElementById('triage-btn');
  var always = '<p>This checker gives general information only and cannot diagnose you. If symptoms are severe or getting worse, contact a dentist or seek emergency care straight away.</p>';

  function count(name) {
    return form.querySelectorAll('input[name="' + name + '"]:checked').length;
  }

  function show() {
    var r = count('r'), u = count('u'), m = count('m'), html;
    if (r) {
      html = '<div class="result red" role="status"><h3>Seek emergency care now</h3>' +
        '<p>One or more serious warning signs are ticked. Call 911 (or your local emergency number) or go to the nearest hospital emergency room. These signs can mean a spreading infection, airway problem or serious injury that needs urgent medical care.</p>' +
        '<p>Once you are safe, let your dentist know so they can arrange follow-up.</p>' + always + '</div>';
    } else if (u) {
      html = '<div class="result amber" role="status"><h3>Call a dentist today</h3>' +
        '<p>These problems usually need to be seen the same day. Call your dentist now; if they are closed, use their after-hours instructions or find an emergency dental service. If you cannot reach any dentist, go to an emergency room.</p>' +
        (form.querySelector('input[value="knock"]:checked') ? '<p><strong>Knocked-out adult tooth:</strong> hold it by the crown, rinse briefly if dirty, try to put it back in the socket, or keep it in milk, and get to a dentist immediately.</p>' : '') +
        '<p>If swelling spreads, a fever starts, or breathing or swallowing becomes difficult, go to an emergency room.</p>' + always + '</div>';
    } else if (m) {
      html = '<div class="result green" role="status"><h3>Contact your dentist soon</h3>' +
        '<p>This does not sound like an emergency, but it is worth calling your dentist for advice and booking an appointment, usually within a few days. Protect the area and chew on the other side in the meantime.</p>' +
        '<p>If pain becomes severe or swelling appears, treat it as urgent and call a dentist the same day.</p>' + always + '</div>';
    } else {
      html = '<div class="result green" role="status"><h3>Nothing ticked yet</h3>' +
        '<p>Tick any symptoms that match. If you are unsure about something that is happening, contact a dentist; if symptoms feel severe, seek emergency care.</p></div>';
    }
    out.innerHTML = html;
  }

  btn.addEventListener('click', show);
  form.addEventListener('reset', function () { out.innerHTML = ''; });
})();
