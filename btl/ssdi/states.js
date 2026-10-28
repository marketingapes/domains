/* Fills every state select on the SSDI pages. California and Colorado stay in the list so the answer is honest;
   criteria.js scores them as outside the campaign area. */
(function () {
  var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  document.querySelectorAll('select[data-states]').forEach(function (s) {
    states.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; s.appendChild(o); });
  });
})();
