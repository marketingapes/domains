/* Network tools slot for the GLASSMAN-SSDI-002 thank-you pages (/glassman/ssdi/thank-you/ and .../other-options/).
   EMPTY ON PURPOSE: while both entries are '', the section stays hidden and nothing third-party loads.

   To add a network offer, widget or link block, put its HTML in the entry for that page ("callback" = the page for
   callback requests and quiz matches, "other_options" = the page for quiz non-matches who asked to check other options).
   Only after Kyle approves the partner, the copy, and exactly what data (if any) it receives. Never pass names, phone,
   email, state or screening answers to a network tool. The thanks.js script inserts the HTML as written.

   Network pixels/postbacks belong in GTM (web container GTM-PHC7459M), on the dataLayer event 'ee_thank_you_view'
   with fresh = true (first view after a real submit; never a reload, test or duplicate). It carries page_id,
   campaign_id, tenant_id, thank_you ('callback' | 'other_options') and lead_id (the receipt) — no contact data. */
window.GLASSMAN_SSDI_NETWORK = {
  callback: '',
  other_options: ''
};
