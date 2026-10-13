// Review build: compose a manual inquiry. No Make webhook or transport is exposed.
export const SCHEMA = 'ma.system_inquiry/v1';
export function validateInquiry(values) {
  const fields = ['contact_name','email','company','engagement','notes'];
  const clean = Object.fromEntries(fields.map(key => [key, String(values[key] || '').trim()]));
  if (values.company_website) throw new Error('Please use the email address to contact Kyle.');
  if (!clean.contact_name || clean.contact_name.length > 100) throw new Error('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) || clean.email.length > 254) throw new Error('Enter a valid email address.');
  if (!clean.company || clean.company.length > 160) throw new Error('Enter your business or agency name.');
  if (!['direct','white-label'].includes(clean.engagement)) throw new Error('Choose who this inquiry is for.');
  if (clean.notes.length < 10 || clean.notes.length > 1200) throw new Error('Describe your idea in 10–1,200 characters.');
  return clean;
}
export function buildInquiry(values, submissionId, now = new Date().toISOString()) {
  if (!/^ma-inquiry-[a-f0-9-]{36}$/i.test(submissionId)) throw new Error('Unable to create an inquiry reference. Please email Kyle.');
  return {schema:SCHEMA,submission_id:submissionId,tenant_id:'MA',domain_id:'marketingapes.com',
    product:'system-inquiry',type:'ma_system_inquiry',lead_source:'ma_home_inquiry',
    ...validateInquiry(values),created_at:now,delivery_mode:'manual_email',contact_method:'email',
    automatic_contact_authorized:false};
}
export function emailLink(payload) {
  const body = `System inquiry: ${payload.submission_id}\n\nName: ${payload.contact_name}\nEmail: ${payload.email}\nBusiness: ${payload.company}\nEngagement: ${payload.engagement}\n\n${payload.notes}\n\nPrepared on MarketingApes.com. This is an inquiry, not an order.`;
  return 'mailto:kyleg@marketingapes.com?subject='+encodeURIComponent('Marketing Apes System Inquiry')+'&body='+encodeURIComponent(body);
}
// Ready for an explicitly configured same-origin server relay after review.
// Requires a durable matching receipt. HTTP 200 alone never establishes acceptance.
export async function sendToRelay(payload, {endpoint,fetchImpl = fetch,signal} = {}) {
  if (!/^\/(?!\/)[A-Za-z0-9/_-]+$/.test(endpoint || '')) throw new Error('Inquiry delivery is not configured. Please email Kyle.');
  const response = await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':payload.submission_id},body:JSON.stringify(payload),signal});
  if (!response.ok) throw new Error('The inquiry could not be accepted. Keep your reference and try again.');
  const receipt = await response.json();
  if (!['accepted','duplicate'].includes(receipt.status) || receipt.submission_id !== payload.submission_id || !receipt.receipt_id) {
    throw new Error('No confirmed receipt was returned. Keep your reference and try again.');
  }
  return {status:receipt.status,submission_id:receipt.submission_id,receipt_id:receipt.receipt_id};
}
if (typeof document !== 'undefined') {
  const form = document.getElementById('system-inquiry');
  const status = document.getElementById('inquiry-status');
  const review = document.getElementById('inquiry-review');
  let submissionId;
  // Persist only the reference. Personal details are never stored or added to analytics.
  try { submissionId = sessionStorage.getItem('ma_system_inquiry_id'); } catch {}
  if (!/^ma-inquiry-[a-f0-9-]{36}$/i.test(submissionId || '')) submissionId = 'ma-inquiry-'+crypto.randomUUID();
  try { sessionStorage.setItem('ma_system_inquiry_id',submissionId); } catch {}
  let preparing = false;
  form.querySelector('button').disabled = false;
  form.addEventListener('input',() => { review.hidden = true; status.textContent = ''; });
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (preparing || !form.reportValidity()) return;
    preparing = true;
    const button = form.querySelector('button');button.disabled = true;
    try {
      const payload = buildInquiry(Object.fromEntries(new FormData(form)),submissionId);
      document.getElementById('inquiry-summary').textContent = `${payload.contact_name} · ${payload.company}\n${payload.email}\n${payload.engagement === 'white-label' ? 'Agency / white-label partner' : 'Direct business implementation'}\n\n${payload.notes}\n\nReference: ${payload.submission_id}`;
      document.getElementById('inquiry-email').href = emailLink(payload);
      review.hidden = false;status.textContent = 'Your inquiry is prepared. Nothing has been sent.';
    } catch (error) {status.textContent = error.message;review.hidden = true;}
    finally {preparing = false;button.disabled = false;}
  });
}
