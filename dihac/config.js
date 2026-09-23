window.DIHAC_CONFIG = Object.freeze({
  status: 'TEXT_FIRST_V1',
  domainId: 'doihaveaclaim.ai',

  // VOICE GATE — shut. dihac/domain.json declares:
  //   vapi  : connection_status MISSING, activation_state OFF, assistant_id null
  //   phone : connection_status MISSING, activation_state OFF
  //   policy: "borrowing another tenant's assistant is prohibited"
  // While enabled is false the page performs zero Vapi work and fetches no SDK.
  // To turn it on, this domain needs its OWN verified assistant id here.
  voice: Object.freeze({
    enabled: false,
    reason: 'domain.json declares vapi OFF / assistant_id null',
    assistantId: null,
    publicKey: null,
    sdkUrl: null
  }),

  integrations: Object.freeze({
    zapierWebhookUrl: '',
    analyticsEnabled: true,
    consentState: 'immediate',
    // DIHAC's own web container. Owned by this domain.
    googleTagManagerId: 'GTM-WJCZF46W',
    // Blank beats wrong (CURRENT-BRIEF.md rule 4). G-9HSY1GEXZ6 was shared
    // across three brands and is silent contamination, so it is not used here.
    googleAnalyticsId: '',
    metaPixelId: '',
    tiktokPixelId: ''
  })
});
