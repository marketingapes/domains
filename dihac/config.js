window.DIHAC_CONFIG = Object.freeze({
  status: 'BUILT_NOT_LIVE',
  domainId: 'doihaveaclaim.ai',
  vapi: Object.freeze({
    publicKey: '28268245-4ca4-4fc2-8d3d-4d77a0d4c55b',
    assistantId: 'b6fe8ca6-db50-49bb-a6c1-59a3507a87f8',
    sdkUrl: 'https://cdn.jsdelivr.net/npm/@vapi-ai/web/+esm',
    sendAttributionToVapi: false
  }),
  integrations: Object.freeze({
    zapierWebhookUrl: '',
    analyticsEnabled: true,
    consentState: 'immediate',
    googleTagManagerId: 'GTM-WJCZF46W',
    googleAnalyticsId: 'G-9HSY1GEXZ6',
    metaPixelId: '947766107786966',
    tiktokPixelId: 'D77K36JC77UBVFP9H2F0'
  }),
  // Quiz engine (dihac/app.js). Content-only settings; no credentials belong here.
  // One quiz definition per tort lives at <quiz.basePath><tort>/quiz.json.
  quiz: Object.freeze({
    basePath: '/campaigns/',
    defaultTort: 'afff',
    torts: Object.freeze(['afff', 'paraquat']),
    signals: Object.freeze({
      strong: Object.freeze({ label: 'Strong match' }),
      possible: Object.freeze({ label: 'Possible match' }),
      unlikely: Object.freeze({ label: 'Unlikely match' })
    }),
    nextSteps: Object.freeze({
      sofia_outreach: Object.freeze({
        label: 'Talk with Sofia',
        description: 'Sofia can explain what a review by this kind of firm involves and, only if you choose, help connect you with a network firm accepting similar matters.',
        href: '/',
        phone: '+12135137977',
        phoneDisplay: '213-513-7977'
      }),
      resources: Object.freeze({
        label: 'Read the FAQ',
        description: 'Based on these answers this may not be the right path, but other options may exist. Sofia can still talk through what happened.',
        href: '/faq.html',
        links: Object.freeze([
          Object.freeze({ label: 'Frequently asked questions', href: '/faq.html' }),
          Object.freeze({ label: 'How DoIHaveAClaim.ai works', href: '/about.html' }),
          Object.freeze({ label: 'Talk with Sofia', href: '/' })
        ])
      })
    }),
    disclaimer: 'DoIHaveAClaim.ai is a matching service, not a law firm, and does not provide legal advice. Answering these questions does not create an attorney-client relationship, does not mean any firm has agreed to review or take your matter, and does not predict any outcome. Only an attorney can evaluate a legal claim. Firm criteria vary and change over time.'
  })
});
