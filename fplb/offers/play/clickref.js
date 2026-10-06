// Only bounded channel labels leave the page. Never forward inbound parameters.
(function () {
  'use strict';
  var map = {
    email: 'fplb-email-001',
    instagram: 'fplb-social-ig',
    facebook: 'fplb-social-fb',
    threads: 'fplb-social-threads'
  };
  var source = null;
  try { source = new URLSearchParams(location.search).get('utm_source'); } catch (e) {}
  // Inherited names (constructor, toString, __proto__) must also use the fallback.
  var ref = Object.prototype.hasOwnProperty.call(map, source) ? map[source] : 'fplb-landing-001';
  document.querySelectorAll('a[data-awin]').forEach(function (a) {
    try {
      var url = new URL(a.href);
      url.searchParams.set('clickref', ref);
      a.href = url.toString();
    } catch (e) {}
  });
})();
