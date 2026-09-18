const HOOK = 'https://hook.us2.make.com/dwzmtn5xbkdrt6pjvli9jgy3auppobbi';
const PRICE = 7500;
const PLAYS = {
  mva: 'Car accident / MVA: ads to a live talk page. Sofia answers while it’s hot, prequalifies, and we attempt a live transfer to your intake. Attention and talk are live. Closer and learn are still being wired. Not clients tomorrow.',
  abuse: 'Sexual abuse / similar: intent page, careful copy, Sofia on the talk. We do not run this as a cheap-lead dump. Delivery has to be proven before spend scales.',
  roundup: 'Roundup / herbicide: campaign + page + talk. Qualify before staff waste a morning. Mass-tort matching, not a promise a firm will take every file.',
  talc: 'Talc: same machine. Ads, page, talk while hot, prequalify. Ad spend separate from the $7,500 build.',
  rideshare: 'Uber / Lyft assault: intent landing + Sofia. State and facts matter. We route what we can; we do not invent a signed case.',
  other: 'Other tort: you name criteria (tort, states, who you can take). I map it to the current play: campaign + page + talk + prequalify. Live pieces stay live. Dark nodes stay dark.'
};
function playFor(text) {
  const t = text.toLowerCase();
  if (/mva|car wreck|car accident|motor vehicle|pi\b|personal injury/.test(t)) return {key:'mva', label:'MVA / PI', body:PLAYS.mva};
  if (/sex|abuse|assault|molest/.test(t)) return {key:'abuse', label:'Sexual abuse', body:PLAYS.abuse};
  if (/roundup|paraquat|herbicide/.test(t)) return {key:'roundup', label:'Roundup', body:PLAYS.roundup};
  if (/talc|johnson/.test(t)) return {key:'talc', label:'Talc', body:PLAYS.talc};
  if (/uber|lyft|rideshare/.test(t)) return {key:'rideshare', label:'Rideshare assault', body:PLAYS.rideshare};
  return {key:'other', label:'Your criteria', body:PLAYS.other};
}

const log = document.getElementById('log');
const form = document.getElementById('composer');
const input = document.getElementById('line');
const face = document.querySelector('.face');
const statusEl = document.getElementById('status');
let step = 'hello';
let tort = null;
let lastUser = '';

function say(text, speak) {
  const el = document.createElement('div');
  el.className = 'bubble tex';
  el.innerHTML = '<b>TEX</b>' + text.replace(/\n/g, '<br>');
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  statusEl.textContent = 'TALKING';
  face.classList.add('speaking');
  if (speak !== false && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ' '));
    u.rate = 1;
    u.onend = function () { face.classList.remove('speaking'); statusEl.textContent = 'LISTENING'; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } else {
    setTimeout(function () { face.classList.remove('speaking'); statusEl.textContent = 'LISTENING'; }, 800);
  }
}
function you(text) {
  const el = document.createElement('div');
  el.className = 'bubble you';
  el.innerHTML = '<b>YOU</b>' + text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

say('Anyway… what can we build for ya today?\n\nTell me the tort and the state. I’ll explain the current strategy based on that tort. If you confirm, I send an invoice for $' + PRICE.toLocaleString() + '. Ad spend is separate. As soon as it’s paid, campaign build starts. Then we’re done.');

form.addEventListener('submit', function (e) {
  e.preventDefault();
  const text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  you(text);
  lastUser = text;

  if (step === 'hello' || step === 'tort') {
    tort = playFor(text);
    step = 'confirm';
    say('Got it — ' + tort.label + '.\n\nCurrent strategy based on that tort:\n' + tort.body + '\n\nIf you confirm this now, I will send you an invoice for $' + PRICE.toLocaleString() + '. As soon as that is paid, your campaign build will start. Ad spend is separate. Not clients tomorrow.\n\nType YES to confirm, or name a different tort.');
    return;
  }
  if (step === 'confirm') {
    if (/^(y|yes|confirm|do it|send it|invoice)/i.test(text)) {
      step = 'email';
      say('Confirmed. Drop the firm email and I’ll send the invoice. Campaign build starts when it’s paid. Then I hang up.');
      return;
    }
    tort = playFor(text);
    say('Updated — ' + tort.label + '.\n\n' + tort.body + '\n\nType YES to confirm the $' + PRICE.toLocaleString() + ' invoice, or change the tort.');
    return;
  }
  if (step === 'email') {
    if (!/@/.test(text)) {
      say('Need a real email for the invoice.');
      return;
    }
    step = 'done';
    const data = {
      tenant_id: 'MA',
      product: 'tex-campaign',
      type: 'tex_campaign_order',
      buyer_name: 'Tex campaign confirm',
      contact_name: text,
      email: text,
      notify_email: 'kyleg@marketingapes.com',
      notes: ['TEX CAMPAIGN CONFIRM — invoice $' + PRICE, 'tort=' + (tort && tort.key), 'last=' + lastUser].join(' | '),
      lead_summary: 'Confirmed Tex campaign. Invoice $' + PRICE + '. Tort ' + (tort && tort.label)
    };
    fetch(HOOK, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event:'ee_form_submit',tenant_id:'MA',domain:'marketingapes.com',form_id:'tex-talk',product:'tex-campaign'});
    say('Invoice for $' + PRICE.toLocaleString() + ' is going to ' + text + '. As soon as it’s paid, campaign build starts.\n\nThat’s the call. I’m hanging up. Kyle’s team sees it.');
    input.disabled = true;
    form.querySelector('button').disabled = true;
    statusEl.textContent = 'CALL ENDED';
  }
});
