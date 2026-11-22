/* Pillow Exchange marketplace front end. Talks to px-exchange-api (see <meta name="px-api">). */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="px-api"]');
  var API = (window.PX_API || (meta && meta.content) || '').replace(/\/$/, '');
  var TOKEN_KEY = 'px_token', USER_KEY = 'px_user';
  var page = document.body.getAttribute('data-page');

  var LABEL = {
    size: { '18in': '18" square', '20in': '20" square', '22in': '22" square', '24in': '24" square', lumbar: 'Lumbar', other: 'Other size' },
    condition: { 'new': 'New, never used', 'like-new': 'Like new', good: 'Good', fair: 'Fair' },
    method: { ship: 'Ship only', meetup: 'Local meetup only', either: 'Ship or meet up' },
    style: { solid: 'Solid', striped: 'Striped', plaid: 'Plaid', floral: 'Floral', geometric: 'Geometric', boho: 'Boho', knit: 'Knit', velvet: 'Velvet', linen: 'Linen', boucle: 'Boucle', seasonal: 'Seasonal / holiday', outdoor: 'Outdoor', other: 'Other' },
    color: { white: 'White', cream: 'Cream', gray: 'Gray', black: 'Black', blue: 'Blue', green: 'Green', yellow: 'Yellow', orange: 'Orange / rust', red: 'Red', pink: 'Pink', purple: 'Purple', brown: 'Brown / tan', multi: 'Multicolor' }
  };

  // Licensed photos used by the example listings (Wikimedia Commons). Shown on the listing page.
  var CREDITS = {
    '/images/demo/leather-sofa-pair.jpg': ['Aaaatu', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Decorative_pillows_on_a_leather_sofa.jpg'],
    '/images/demo/batik-blue.jpg': ['Gunarta', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Batik_Kawung_Cushion.jpg'],
    '/images/demo/szekely-red.jpg': ['Laslovarga', 'CC BY-SA 2.5', 'https://commons.wikimedia.org/wiki/File:Sz%C3%A9kely_traditional_ornamental_Pillow.JPG'],
    '/images/demo/red-scatter-pair.jpg': ['Markjones959', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Throw_Pillows_(Scatter_Cushions).jpg'],
    '/images/demo/yellow-navy-velvet.jpg': ['Lear 21', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Home24sofa.jpg'],
    '/images/demo/geometric-bw.jpg': ['Kari Shea (Unsplash)', 'CC0', 'https://commons.wikimedia.org/wiki/File:Home_Sweet_Home_Pt._6_(Unsplash).jpg'],
    '/images/demo/mint-mustard.jpg': ['Irene van der Poel (Unsplash)', 'CC0', 'https://commons.wikimedia.org/wiki/File:Cozy_bed_by_a_windowsill_(Unsplash).jpg'],
    '/images/demo/armenian-pattern.jpg': ['\u0531\u0580\u0561\u0580\u0561\u057f \u0539\u0580\u057e\u0561\u0576\u0581', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Decorative_pillows_with_traditional_Armenian_patterns.jpg']
  };

  // ---------- helpers ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lab(k, v) { return (LABEL[k] && LABEL[k][v]) || v; }
  function imgUrl(id) { if (!id) return '/images/logo.svg'; return id.charAt(0) === '/' ? id : API + '/api/images/' + id; }
  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function me() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } }
  function setSession(t, u) { try { if (t) localStorage.setItem(TOKEN_KEY, t); if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch (e) {} }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function ago(d) {
    var s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago';
    return new Date(d).toLocaleDateString();
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800);
  }
  function api(method, path, body) {
    var h = { 'Content-Type': 'application/json' }; var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && t) clearSession();
          if (!r.ok) { var e = new Error(j.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
          return j;
        });
      }, function () { throw new Error('Could not reach Pillow Exchange. Check your connection and try again.'); });
  }
  function signInUrl() { return '/account/?next=' + encodeURIComponent(location.pathname + location.search); }
  function requireUser() { if (!token()) { location.href = signInUrl(); return false; } return true; }
  function options(k, ph) {
    return (ph ? '<option value="">' + esc(ph) + '</option>' : '') + Object.keys(LABEL[k]).map(function (v) { return '<option value="' + v + '">' + esc(LABEL[k][v]) + '</option>'; }).join('');
  }

  // header account link
  function paintHeader() {
    var a = $('#acct-link'); if (!a) return;
    var u = me();
    if (u && token()) { a.textContent = 'Hi, ' + u.display_name.split(' ')[0]; a.href = '/account/'; }
    else { a.textContent = 'Sign in'; a.href = signInUrl(); }
  }

  // ---------- listing card ----------
  function card(l) {
    return '<li><a class="lcard" href="/listing/?id=' + l.id + '">' +
      '<span class="ph"><img src="' + esc(imgUrl(l.images[0])) + '" alt="' + esc(l.title) + '" loading="lazy" width="400" height="300">' +
      (l.is_demo ? '<span class="tag tag-demo">Example</span>' : '') + '</span>' +
      '<span class="bd"><span class="kicker">' + esc(lab('style', l.style)) + (l.color ? ' &middot; ' + esc(lab('color', l.color)) : '') + '</span><h3>' + esc(l.title) + '</h3>' +
      '<span class="meta">' + esc(lab('size', l.size)) + ' &middot; ' + esc(lab('condition', l.condition)) + (l.quantity > 1 ? ' &middot; set of ' + l.quantity : '') + '</span>' +
      '<span class="loc">' + esc(l.city) + ' &middot; ' + esc(lab('method', l.method)) + '</span></span></a></li>';
  }

  // ---------- browse (home) ----------
  function initBrowse() {
    var form = $('#filters'), grid = $('#grid'), count = $('#count');
    var PH = { size: 'Size', style: 'Style', color: 'Color', condition: 'Condition' };
    ['size', 'style', 'color', 'condition'].forEach(function (k) { var s = form.elements[k]; s.innerHTML = options(k, PH[k]); });
    var p = new URLSearchParams(location.search);
    ['q', 'size', 'style', 'color', 'condition', 'method', 'zip'].forEach(function (k) { if (p.get(k)) form.elements[k].value = p.get(k); });
    if (p.get('real') === '1') form.elements.real.checked = true;
    var timer;
    function load() {
      var q = new URLSearchParams();
      ['q', 'size', 'style', 'color', 'condition', 'method', 'zip'].forEach(function (k) { var v = form.elements[k].value.trim(); if (v) q.set(k, v); });
      if (form.elements.real.checked) q.set('real', '1');
      history.replaceState(null, '', q.toString() ? '?' + q + '#browse' : location.pathname + (location.hash || ''));
      grid.setAttribute('aria-busy', 'true');
      $all('select', form).forEach(function (s) { s.classList.toggle('on', !!s.value); });
      api('GET', '/api/listings?' + q).then(function (j) {
        grid.removeAttribute('aria-busy');
        var n = j.listings.length, real = j.totals.real;
        count.textContent = n + (n === 1 ? ' pillow' : ' pillows') + (real === 0 ? ' (examples only so far)' : '');
        $('#demo-note').hidden = !j.listings.some(function (l) { return l.is_demo; });
        grid.innerHTML = n ? j.listings.map(card).join('') :
          '<li class="empty" style="grid-column:1/-1">No pillows match those filters yet. <a href="/post/">Post yours</a> and be the first.</li>';
      }).catch(function (e) {
        grid.removeAttribute('aria-busy');
        grid.innerHTML = '<li class="empty" style="grid-column:1/-1">' + esc(e.message) + ' <button class="linkish" type="button" id="retry">Retry</button></li>';
        var r = $('#retry'); if (r) r.onclick = load;
      });
    }
    var hq = $('#head-q');
    if (hq) {
      hq.value = form.elements.q.value;
      hq.addEventListener('input', function () { form.elements.q.value = hq.value; clearTimeout(timer); timer = setTimeout(load, 250); });
      hq.form.addEventListener('submit', function (e) { e.preventDefault(); load(); $('#browse').scrollIntoView({ behavior: 'smooth' }); });
    }
    grid.innerHTML = new Array(9).join('<li><div class="skel"></div></li>');
    form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 250); });
    form.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    $('#reset').addEventListener('click', function () { form.reset(); if (hq) hq.value = ''; load(); });
    load();
  }

  // ---------- photo uploader ----------
  function resize(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1200, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('That file is not a photo we can read. Try a JPEG or PNG.')); };
      img.src = url;
    });
  }
  function uploader(root, max) {
    var ids = [], pending = 0;
    var input = $('input[type=file]', root), thumbs = $('.thumbs', root);
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      files.slice(0, Math.max(0, max - ids.length - pending)).forEach(function (f) {
        var box = document.createElement('div'); box.className = 'thumb';
        box.innerHTML = '<span class="up">Uploading&hellip;</span>'; thumbs.appendChild(box); pending++;
        resize(f).then(function (data) {
          box.insertAdjacentHTML('afterbegin', '<img alt="" src="' + data + '">');
          return api('POST', '/api/images', { data: data });
        }).then(function (j) {
          pending--; ids.push(j.id); box.dataset.id = j.id; $('.up', box).remove();
          var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Remove photo'); b.textContent = '\u00d7';
          b.onclick = function () { ids = ids.filter(function (x) { return x !== j.id; }); box.remove(); };
          box.appendChild(b);
        }).catch(function (e) { pending--; box.remove(); toast(e.message); });
      });
    });
    return { ids: function () { return ids.slice(); }, busy: function () { return pending > 0; } };
  }

  // Shared pillow fields (post page + "offer a different pillow")
  function pillowFields(p) {
    var u = me() || {};
    return '' +
      '<div class="field full photo-drop" id="' + p + 'photos"><span class="lbl">Photos (1 to 4)</span>' +
      '<input type="file" accept="image/*" multiple aria-label="Add photos"><small>Front, back and the care tag help. Photos are resized before upload.</small><div class="thumbs"></div></div>' +
      '<div class="field full"><label for="' + p + 'title">Title</label><input type="text" id="' + p + 'title" name="title" maxlength="80" required placeholder="e.g. Sage linen square with tassels"></div>' +
      '<div class="field"><label for="' + p + 'size">Size</label><select id="' + p + 'size" name="size" required>' + options('size', 'Choose a size') + '</select></div>' +
      '<div class="field"><label for="' + p + 'condition">Condition</label><select id="' + p + 'condition" name="condition" required>' + options('condition', 'Choose condition') + '</select></div>' +
      '<div class="field"><label for="' + p + 'style">Style</label><select id="' + p + 'style" name="style" required>' + options('style', 'Choose a style') + '</select></div>' +
      '<div class="field"><label for="' + p + 'color">Main color</label><select id="' + p + 'color" name="color" required>' + options('color', 'Choose a color') + '</select></div>' +
      '<div class="field full"><label for="' + p + 'description">Details</label><textarea id="' + p + 'description" name="description" maxlength="1500" placeholder="Fabric, zipper or envelope back, any marks, how it was cleaned"></textarea></div>' +
      '<div class="field"><label for="' + p + 'city">City</label><input type="text" id="' + p + 'city" name="city" maxlength="60" required value="' + esc(u.city || '') + '"></div>' +
      '<div class="field"><label for="' + p + 'zip">ZIP</label><input type="text" id="' + p + 'zip" name="zip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required value="' + esc(u.zip || '') + '"><small>Only the ZIP and city are shown, never your address.</small></div>' +
      '<div class="field"><label for="' + p + 'method">How you will swap</label><select id="' + p + 'method" name="method">' + options('method').replace('value="either"', 'value="either" selected') + '</select></div>' +
      '<div class="field"><label for="' + p + 'quantity">How many in this listing</label><input type="number" id="' + p + 'quantity" name="quantity" min="1" max="6" value="1"></div>' +
      '<div class="field full checks"><label><input type="checkbox" name="cover_washed" required> The cover is washed (or brand new) and free of stains, odors and pests.</label>' +
      '<label><input type="checkbox" name="insert_included"> The insert is included (leave unticked for cover only).</label>' +
      '<label><input type="checkbox" name="smoke_free"> Smoke-free home</label><label><input type="checkbox" name="pet_free"> Pet-free home</label></div>';
  }
  function readPillow(form, up) {
    var f = form.elements;
    return { title: f.title.value, size: f.size.value, condition: f.condition.value, style: f.style.value, color: f.color.value,
      description: f.description.value, city: f.city.value, zip: f.zip.value, method: f.method.value, quantity: f.quantity.value,
      want: f.want ? f.want.value : '', cover_washed: f.cover_washed.checked, insert_included: f.insert_included.checked,
      smoke_free: f.smoke_free.checked, pet_free: f.pet_free.checked, images: up.ids() };
  }
  function busy(btn, on, text) { btn.disabled = on; if (text) btn.textContent = text; }

  // ---------- post ----------
  function initPost() {
    if (!requireUser()) return;
    var form = $('#post-form');
    $('#post-fields').innerHTML = pillowFields('p-') + '<div class="field full"><label for="p-want">What would you like in return?</label>' +
      '<input type="text" id="p-want" name="want" maxlength="300" placeholder="e.g. Anything in sage or cream, or a lumbar in any color"></div>' +
      '<div class="field full checks"><label><input type="checkbox" name="rules" required> I have read the <a href="/rules/" target="_blank">swap rules</a> and this pillow follows them.</label></div>';
    var up = uploader($('#p-photos'), 4), msg = $('#post-msg'), btn = $('#post-btn');
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg.textContent = ''; msg.className = 'form-msg';
      if (up.busy()) { msg.textContent = 'Wait for the photos to finish uploading.'; msg.className = 'form-msg err'; return; }
      if (!form.elements.rules.checked) { msg.textContent = 'Please confirm the swap rules.'; msg.className = 'form-msg err'; return; }
      busy(btn, true, 'Posting\u2026');
      api('POST', '/api/listings', readPillow(form, up)).then(function (j) {
        location.href = '/listing/?id=' + j.id + '&posted=1';
      }).catch(function (e) { busy(btn, false, 'Post my pillow'); msg.textContent = e.message; msg.className = 'form-msg err'; });
    });
  }

  // ---------- listing detail + propose ----------
  function initListing() {
    var id = qs('id'), root = $('#listing');
    if (!/^\d+$/.test(id || '')) { root.innerHTML = '<p class="empty">That listing link is not complete. <a href="/#browse">Browse pillows</a>.</p>'; return; }
    api('GET', '/api/listings/' + id).then(function (j) {
      var l = j.listing; document.title = l.title + ' | Pillow Exchange';
      $('#crumb-title').textContent = l.title;
      var ticks = [l.cover_washed ? 'Cover washed' : '', l.insert_included ? 'Insert included' : 'Cover only', l.smoke_free ? 'Smoke-free home' : '', l.pet_free ? 'Pet-free home' : ''].filter(Boolean);
      root.innerHTML = '<div class="detail"><div class="gallery"><div class="main"><img id="main-img" src="' + esc(imgUrl(l.images[0])) + '" alt="' + esc(l.title) + '" width="800" height="600"></div>' +
        (l.is_demo && CREDITS[l.images[0]] ? '<p class="credit">Example photo: ' + esc(CREDITS[l.images[0]][0]) + ', <a href="' + esc(CREDITS[l.images[0]][2]) + '" rel="noopener" target="_blank">' + esc(CREDITS[l.images[0]][1]) + ' via Wikimedia Commons</a>, cropped. <a href="/credits/">All photo credits</a>.</p>' : '') +
        (l.images.length > 1 ? '<div class="strip">' + l.images.map(function (im, i) { return '<button type="button" data-src="' + esc(imgUrl(im)) + '" aria-current="' + (i === 0) + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(imgUrl(im)) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>' +
        '<div class="info-col"><p style="margin:0;display:flex;gap:6px">' + (l.is_demo ? '<span class="tag tag-demo">Example listing</span> ' : '') + (l.status === 'traded' ? '<span class="tag tag-traded">Swapped</span>' : '<span class="tag tag-ok">Open to swaps</span>') + '</p>' +
        '<h1>' + esc(l.title) + '</h1>' +
        '<dl class="facts"><dt>Size</dt><dd>' + esc(lab('size', l.size)) + (l.quantity > 1 ? ' (set of ' + l.quantity + ')' : '') + '</dd><dt>Condition</dt><dd>' + esc(lab('condition', l.condition)) + '</dd>' +
        '<dt>Style</dt><dd>' + esc(lab('style', l.style)) + ', ' + esc(lab('color', l.color).toLowerCase()) + '</dd><dt>Location</dt><dd>' + esc(l.city) + ' ' + esc(l.zip) + '</dd><dt>Swap by</dt><dd>' + esc(lab('method', l.method)) + '</dd></dl>' +
        '<ul class="ticks">' + ticks.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        (l.want ? '<div class="wants-box"><b>Would like in return</b>' + esc(l.want) + '</div>' : '') +
        (l.description ? '<p class="desc">' + esc(l.description) + '</p>' : '') +
        '<div class="owner"><span class="avatar">' + esc((l.owner.name || '?').charAt(0)) + '</span><span>Listed by <b>' + esc(l.owner.name) + '</b> &middot; ' + esc(ago(l.created_at)) + '</span></div>' +
        '<div id="cta"></div><p style="font-size:13px;margin-top:14px"><button type="button" class="linkish" id="report">Report this listing</button></p></div></div>' +
        '<section class="propose panel" id="propose" hidden aria-labelledby="propose-h"></section>';
      $all('.strip button', root).forEach(function (b) { b.onclick = function () { $('#main-img').src = b.dataset.src; $all('.strip button').forEach(function (x) { x.setAttribute('aria-current', x === b); }); }; });
      $('#report').onclick = function () {
        var r = prompt('What is wrong with this listing? (for example: not a pillow, unsafe, spam)');
        if (r) api('POST', '/api/listings/' + l.id + '/report', { reason: r }).then(function () { toast('Thanks. We will take a look.'); }).catch(function (e) { toast(e.message); });
      };
      var cta = $('#cta');
      if (qs('posted')) toast('Your pillow is live. Offers will show up in My swaps.');
      if (l.mine) {
        cta.innerHTML = '<p>This is your pillow' + (l.offer_count ? ' and it has <b>' + l.offer_count + '</b> offer' + (l.offer_count > 1 ? 's' : '') + ' waiting' : '') + '.</p><a class="btn btn-sm" href="/my-swaps/">See offers in My swaps</a>';
      } else if (l.is_demo) {
        cta.innerHTML = '<p class="demo-note">This is an example listing that shows how a post looks. It cannot take offers. <a href="/#browse">Browse real pillows</a> or <a href="/post/">post your own</a>.</p>';
      } else if (l.status !== 'active') {
        cta.innerHTML = '<p>This pillow has already been swapped.</p>';
      } else if (j.listing.my_offer && j.listing.my_offer.status === 'pending') {
        cta.innerHTML = '<p>You have an offer waiting on this pillow.</p><a class="btn btn-sm" href="/my-swaps/#sent">View my offer</a>';
      } else {
        cta.innerHTML = '<button class="btn" type="button" id="open-propose">Propose a swap</button>';
        $('#open-propose').onclick = function () { if (requireUser()) openPropose(l); };
        if (qs('propose') && token()) openPropose(l);
      }
    }).catch(function (e) { root.innerHTML = '<p class="empty">' + esc(e.message) + ' <a href="/#browse">Browse pillows</a>.</p>'; });
  }

  function openPropose(l) {
    var box = $('#propose'); box.hidden = false;
    box.innerHTML = '<h2 id="propose-h">Propose a swap for &ldquo;' + esc(l.title) + '&rdquo;</h2>' +
      '<p>Show ' + esc(l.owner.name) + ' what you would trade. They can accept or decline. Your email is only shared if they accept.</p>' +
      '<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-tab="pick" id="tab-pick">One of my listed pillows</button><button type="button" role="tab" aria-selected="false" data-tab="new" id="tab-new">Upload a different pillow</button></div>' +
      '<form id="propose-form" novalidate><div id="pane-pick" role="tabpanel"><p class="loading">Loading your pillows&hellip;</p></div>' +
      '<div id="pane-new" role="tabpanel" hidden><div class="form-grid">' + pillowFields('o-') +
      '<div class="field full checks"><label><input type="checkbox" name="list_publicly"> Also list this pillow publicly so others can offer on it</label></div></div></div>' +
      '<div class="field" style="margin-top:14px"><label for="o-msg">Message to ' + esc(l.owner.name) + ' (optional)</label><textarea id="o-msg" name="message" maxlength="600" placeholder="Hi! I think these would look great swapped. I can meet in ' + esc(l.city) + ' or ship."></textarea></div>' +
      '<div class="field checks"><label><input type="checkbox" name="rules"> My pillow follows the <a href="/rules/" target="_blank">swap rules</a> (washed cover, no stains, odors or pests).</label></div>' +
      '<div class="form-actions"><button class="btn" type="submit" id="send-offer">Send swap offer</button><p class="form-msg" id="offer-msg" role="alert"></p></div></form>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var form = $('#propose-form'), up = uploader($('#o-photos'), 4), mode = 'pick';
    $all('.tabs button', box).forEach(function (b) {
      b.onclick = function () {
        mode = b.dataset.tab;
        $all('.tabs button', box).forEach(function (x) { x.setAttribute('aria-selected', x === b); });
        $('#pane-pick').hidden = mode !== 'pick'; $('#pane-new').hidden = mode !== 'new';
      };
    });
    api('GET', '/api/my/listings').then(function (j) {
      var mine = j.listings.filter(function (x) { return x.status === 'active'; });
      if (!mine.length) {
        $('#pane-pick').innerHTML = '<p>You have no listed pillows yet. Use <b>Upload a different pillow</b> to add the one you want to offer.</p>';
        $('#tab-new').click(); return;
      }
      $('#pane-pick').innerHTML = '<ul class="pick-grid">' + mine.map(function (m, i) {
        return '<li><label><input type="radio" name="offered" value="' + m.id + '"' + (i === 0 ? ' checked' : '') + '><span><img src="' + esc(imgUrl(m.images[0])) + '" alt=""><span class="t">' + esc(m.title) + '</span></span></label></li>';
      }).join('') + '</ul>';
    }).catch(function (e) { $('#pane-pick').innerHTML = '<p class="form-msg err">' + esc(e.message) + '</p>'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('#offer-msg'), btn = $('#send-offer'); msg.className = 'form-msg'; msg.textContent = '';
      if (!form.elements.rules.checked) { msg.textContent = 'Please confirm your pillow follows the swap rules.'; msg.className = 'form-msg err'; return; }
      var body = { message: form.elements.message.value };
      if (mode === 'pick') {
        var r = $('input[name=offered]:checked', form);
        if (!r) { msg.textContent = 'Pick one of your pillows, or upload a different one.'; msg.className = 'form-msg err'; return; }
        body.offered_listing_id = Number(r.value);
      } else {
        if (up.busy()) { msg.textContent = 'Wait for the photos to finish uploading.'; msg.className = 'form-msg err'; return; }
        body.new_listing = readPillow(form, up); body.new_listing.want = ''; body.list_publicly = form.elements.list_publicly.checked;
      }
      busy(btn, true, 'Sending\u2026');
      api('POST', '/api/listings/' + l.id + '/offers', body).then(function () {
        box.innerHTML = '<h2>Offer sent</h2><p>' + esc(l.owner.name) + ' will see your pillow in their offers. If they accept, you will both see each other&rsquo;s email to arrange the swap.</p><p><a class="btn btn-sm" href="/my-swaps/#sent">Track it in My swaps</a> <a class="btn btn-sm btn-ghost" href="/#browse">Keep browsing</a></p>';
        $('#cta').innerHTML = '<p>You have an offer waiting on this pillow.</p>';
      }).catch(function (e) { busy(btn, false, 'Send swap offer'); msg.textContent = e.message; msg.className = 'form-msg err'; });
    });
  }

  // ---------- my swaps ----------
  function offerRow(o, side) {
    var other = side === 'received' ? o.from : o.to;
    var acts = '';
    if (o.status === 'pending' && side === 'received') acts = '<div class="acts"><button class="btn btn-sm btn-accent" data-act="accept" data-id="' + o.id + '">Accept swap</button><button class="btn btn-sm btn-ghost" data-act="decline" data-id="' + o.id + '">Decline</button></div>';
    if (o.status === 'pending' && side === 'sent') acts = '<div class="acts"><button class="btn btn-sm btn-ghost" data-act="withdraw" data-id="' + o.id + '">Withdraw offer</button></div>';
    var contact = o.contact ? '<div class="contact-box"><b>Swap agreed.</b> Email ' + esc(o.contact.name) + ' at <a href="mailto:' + esc(o.contact.email) + '">' + esc(o.contact.email) + '</a> to set up shipping or a public meetup spot.</div>' : '';
    return '<article class="offer"><a href="/listing/?id=' + o.listing.id + '"><img src="' + esc(imgUrl(o.listing.images[0])) + '" alt="' + esc(o.listing.title) + '"></a><span class="arrow" aria-hidden="true">&#8646;</span>' +
      '<img src="' + esc(imgUrl(o.offered.images[0])) + '" alt="' + esc(o.offered.title) + '">' +
      '<div><h3>' + (side === 'received' ? esc(o.from.name) + ' offers &ldquo;' + esc(o.offered.title) + '&rdquo;' : 'You offered &ldquo;' + esc(o.offered.title) + '&rdquo;') + ' <span class="tag tag-' + o.status + '">' + esc(o.status) + '</span></h3>' +
      '<p>For ' + (side === 'received' ? 'your' : esc(other.name) + '&rsquo;s') + ' &ldquo;' + esc(o.listing.title) + '&rdquo; &middot; ' + esc(ago(o.created_at)) + '</p>' +
      '<p><small>' + esc(o.offered.size_label) + ', ' + esc(lab('condition', o.offered.condition)) + ', ' + esc(lab('style', o.offered.style)) + ' &middot; ' + (o.offered.insert_included ? 'insert included' : 'cover only') + ' &middot; ' + esc(o.offered.city) + ' &middot; ' + esc(lab('method', o.offered.method)) + '</small></p>' +
      (o.offered.description ? '<p><small>' + esc(o.offered.description) + '</small></p>' : '') +
      (o.message ? '<p>&ldquo;' + esc(o.message) + '&rdquo;</p>' : '') + contact + acts + '</div></article>';
  }
  function initMySwaps() {
    if (!requireUser()) return;
    var tabs = $all('.tabs button'), panes = { received: $('#received'), sent: $('#sent'), mine: $('#mine') };
    function show(t) { tabs.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t); }); Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== t; }); }
    tabs.forEach(function (b) { b.onclick = function () { show(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }; });
    var h0 = location.hash.slice(1); show(panes[h0] ? h0 : 'received');
    function load() {
      api('GET', '/api/my/offers').then(function (j) {
        var pend = j.received.filter(function (o) { return o.status === 'pending'; }).length;
        $('#n-received').textContent = pend ? ' (' + pend + ')' : '';
        panes.received.innerHTML = j.received.length ? j.received.map(function (o) { return offerRow(o, 'received'); }).join('') : '<p class="empty">No offers yet. Share your listing link or <a href="/post/">post another pillow</a>.</p>';
        panes.sent.innerHTML = j.sent.length ? j.sent.map(function (o) { return offerRow(o, 'sent'); }).join('') : '<p class="empty">You have not made any offers. <a href="/#browse">Browse pillows</a> and propose a swap.</p>';
      }).catch(function (e) { panes.received.innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; });
      api('GET', '/api/my/listings').then(function (j) {
        panes.mine.innerHTML = j.listings.length ? j.listings.map(function (l) {
          return '<div class="mine-row"><img src="' + esc(imgUrl(l.images[0])) + '" alt=""><div><h3><a href="/listing/?id=' + l.id + '">' + esc(l.title) + '</a></h3><p><small>' + esc(lab('size', l.size)) + ' &middot; ' + (l.visibility === 'offer' ? 'only shown in an offer' : 'public') + ' &middot; ' + esc(l.status) + (l.offer_count ? ' &middot; ' + l.offer_count + ' pending offer(s)' : '') + '</small></p></div>' +
            (l.status === 'active' ? '<button class="btn btn-sm btn-danger" data-remove="' + l.id + '">Remove</button>' : '<span class="tag tag-traded">' + esc(l.status) + '</span>') + '</div>';
        }).join('') : '<p class="empty">No pillows listed. <a href="/post/">Post your first pillow</a>.</p>';
      }).catch(function () {});
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'accept' && !confirm('Accept this swap? Your email will be shared with them, and any other offers on this pillow will be declined.')) return;
        busy(b, true);
        api('POST', '/api/offers/' + b.dataset.id + '/' + act).then(function () { toast(act === 'accept' ? 'Swap accepted. Their email is now shown so you can arrange it.' : act === 'decline' ? 'Offer declined.' : 'Offer withdrawn.'); load(); })
          .catch(function (err) { busy(b, false); toast(err.message); });
      }
      var r = e.target.closest('[data-remove]');
      if (r && confirm('Remove this pillow? Pending offers on it will be declined.')) {
        api('PATCH', '/api/listings/' + r.dataset.remove, { status: 'removed' }).then(function () { toast('Listing removed.'); load(); }).catch(function (err) { toast(err.message); });
      }
    });
    load();
  }

  // ---------- account ----------
  function initAccount() {
    var next = qs('next'); if (!next || next.charAt(0) !== '/' || next.charAt(1) === '/') next = '/my-swaps/';
    var out = $('#signed-out'), inn = $('#signed-in');
    function render() {
      var u = me();
      if (u && token()) {
        out.hidden = true; inn.hidden = false;
        $('#who').innerHTML = '<b>' + esc(u.display_name) + '</b><br>' + esc(u.email) + '<br>' + esc(u.city) + ' ' + esc(u.zip);
      } else { out.hidden = false; inn.hidden = true; }
      paintHeader();
    }
    if (token()) api('GET', '/api/me').then(function (j) { setSession(null, j.user); render(); }).catch(function () { render(); });
    render();
    function wire(id, path, fields) {
      var f = $(id), msg = $('.form-msg', f), btn = $('button[type=submit]', f), label = btn.textContent;
      f.addEventListener('submit', function (e) {
        e.preventDefault(); msg.textContent = ''; msg.className = 'form-msg';
        var body = {}; fields.forEach(function (k) { body[k] = f.elements[k].value; });
        if (path.indexOf('signup') > -1 && !f.elements.agree.checked) { msg.textContent = 'Please agree to the swap rules.'; msg.className = 'form-msg err'; return; }
        busy(btn, true, 'One moment\u2026');
        api('POST', path, body).then(function (j) { setSession(j.token, j.user); location.href = next; })
          .catch(function (err) { busy(btn, false, label); msg.textContent = err.message; msg.className = 'form-msg err'; });
      });
    }
    wire('#login-form', '/api/auth/login', ['email', 'password']);
    wire('#signup-form', '/api/auth/signup', ['email', 'password', 'display_name', 'city', 'zip']);
    $('#signout').onclick = function () { api('POST', '/api/auth/logout').catch(function () {}).then(function () { clearSession(); render(); toast('Signed out.'); }); };
    $('#delete-acct').onclick = function () {
      if (!confirm('Delete your account, your pillows, photos and offers? This cannot be undone.')) return;
      api('DELETE', '/api/me').then(function () { clearSession(); render(); toast('Your account was deleted.'); }).catch(function (e) { toast(e.message); });
    };
  }

  paintHeader();
  var hs = $('#head-search');
  if (hs && page !== 'browse') hs.addEventListener('submit', function (e) { e.preventDefault(); location.href = '/?q=' + encodeURIComponent($('#head-q').value) + '#browse'; });
  var init = { browse: initBrowse, post: initPost, listing: initListing, swaps: initMySwaps, account: initAccount }[page];
  if (init) init();
})();
