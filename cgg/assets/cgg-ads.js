/* Manual AdSense units on crazygolfgame.com content pages (never deal pages).
   CGG_AD_SLOT is the single slot-ID config for every in-content unit
   (<ins class="adsbygoogle" data-cgg-ad="...">). Replace REPLACE_WITH_ADSENSE_SLOT_ID
   with a real display ad unit ID (AdSense > Ads > By ad unit) before merge.
   Until then the units are labelled and reserve space but request no ads.
   Pushing to window.adsbygoogle before adsbygoogle.js loads is AdSense's queue
   pattern; the data-cgg="nov15-tags" loader injects the script later and drains it. */
var CGG_AD_SLOT = "REPLACE_WITH_ADSENSE_SLOT_ID";
(function () {
  if (!/^\d{6,}$/.test(CGG_AD_SLOT)) return;
  var units = document.querySelectorAll('ins.adsbygoogle[data-cgg-ad]:not([data-ad-slot])');
  for (var i = 0; i < units.length; i++) {
    units[i].setAttribute("data-ad-slot", CGG_AD_SLOT);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
})();
