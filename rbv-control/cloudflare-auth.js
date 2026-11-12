// Candidate origin protection for Cloudflare Access Managed OAuth. Not deployed.
// Cloudflare validates opaque OAuth tokens; the origin validates its signed assertion.
export function createCloudflareAuth(env) {
  const issuer = env.RBV_CF_ACCESS_ISSUER;
  const audience = env.RBV_CF_ACCESS_AUD;
  const emails = new Set((env.RBV_CF_ALLOWED_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  let configured = false;
  try { const u = new URL(issuer); configured = u.protocol === 'https:' && /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(u.hostname) && u.origin === issuer && typeof audience === 'string' && /^[a-f0-9]{64}$/.test(audience) && emails.size > 0; } catch {}
  let keySet;
  async function authorize(assertion) {
    if (!configured) return {ok:false,status:503,error:'auth_not_configured'};
    if (typeof assertion !== 'string' || !assertion || /\s|,/.test(assertion)) return {ok:false,status:401,error:'invalid_token'};
    try {
      const {createRemoteJWKSet,jwtVerify} = await import('jose');
      keySet ||= createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      const {payload} = await jwtVerify(assertion,keySet,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
      if (payload.type !== 'app' || typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || !emails.has(payload.email.toLowerCase())) return {ok:false,status:403,error:'access_denied'};
      return {ok:true,subject:payload.sub};
    } catch {return {ok:false,status:401,error:'invalid_token'};}
  }
  return {configured,authorize};
}
