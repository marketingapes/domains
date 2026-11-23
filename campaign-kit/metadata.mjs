// Shared metadata and URL rules. No network, tracking, or deployment side effects.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unesc = value => value.replace(/&(amp|quot|apos|lt|gt|#39);/g, (_, name) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>','#39':"'"}[name]));

export function absoluteWebUrl(ref, base) {
  const url = new URL(ref, base);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('Public page and asset URLs must use HTTPS without credentials');
  return url.href;
}

export function campaignPageUrl(c, file = 'index.html') {
  if (!/^[a-z0-9.-]+$/i.test(c.domain_id ?? '') || !c.domain_id.includes('.')) throw Error('domain_id must be a hostname');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(c.slug ?? '')) throw Error('slug must be lower-kebab');
  return absoluteWebUrl(file === 'index.html' ? './' : file, `https://${c.domain_id}/c/${c.slug}/`);
}

export function pageMetadata({title, description, url, siteName, image, imageAlt, imageSize}) {
  if (!String(title ?? '').trim() || !String(description ?? '').trim()) throw Error('Page title and description are required');
  const canonical = absoluteWebUrl(url, url);
  const shareImage = image ? absoluteWebUrl(image, new URL(canonical).origin + '/') : null;
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="${shareImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">${shareImage ? `
<meta property="og:image" content="${esc(shareImage)}">
<meta name="twitter:image" content="${esc(shareImage)}">${imageAlt ? `
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">` : ''}${imageSize?.w && imageSize?.h ? `
<meta property="og:image:width" content="${imageSize.w}">
<meta property="og:image:height" content="${imageSize.h}">` : ''}` : ''}`;
}

// Only live generated documents use this. Preview references stay local so review
// cannot fetch production assets or navigate to a live intake door.
export function absoluteHtmlReferences(html, pageUrl) {
  const resolve = ref => {
    const value = unesc(ref);
    if (!value || /^(?:#|tel:|mailto:|data:)/i.test(value)) return ref;
    return esc(absoluteWebUrl(value, pageUrl));
  };
  const tag = value => value.replace(/(\s)(href|src|poster|srcset)=(['"])(.*?)\3/gi, (_, space, name, quote, ref) => {
    const next = name.toLowerCase() === 'srcset' && !/^data:/i.test(ref)
      ? ref.split(',').map(candidate => {const [url, ...size] = candidate.trim().split(/\s+/); return [resolve(url), ...size].join(' ');}).join(', ')
      : resolve(ref);
    return `${space}${name}=${quote}${next}${quote}`;
  });
  // Treat script/style contents as opaque; never rewrite HTML-like strings in JS.
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[a-z][^>]*>/gi, value => {
    const end = value.indexOf('>');
    return tag(value.slice(0, end + 1)) + value.slice(end + 1);
  });
}
