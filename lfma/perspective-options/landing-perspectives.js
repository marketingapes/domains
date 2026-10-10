import {campaignOffer,offerMoney} from './campaign-offer.js';
// Copy/offer choices only. Same draft validator, product and backend. No purchase agreement.
export const landingPerspectives=Object.freeze({
 story:{angle:'Business case',model:'Illustrative paid test',scope:'One claim campaign: branded ad and landing page, AI intake plan and Perspective follow-up visibility.',pricing:'illustrative',terms:'Illustrative two-week test: $2,500 service fee + $5,000 media budget = $7,500. Scope, terms and pricing must be confirmed before purchase.'},
 build:{angle:'Watch your campaign build',model:'Install in your firm’s accounts',scope:'Explore a branded campaign + AI intake system operating in your firm’s accounts. Ownership, responsibilities and integrations need agreement.',pricing:'to_confirm',terms:'Scope and pricing confirmed before purchase. No installation price or commitment is agreed here.'},
 test:{angle:'Test the intake',model:'Ongoing managed operation',scope:'Explore ongoing campaign and AI intake operation with agreed review and reporting responsibilities.',pricing:'to_confirm',terms:'Scope and pricing confirmed before purchase. No recurring fee, minimum term or service commitment is agreed here.'},
 offer:{angle:'Historical LA proof',model:'Larger rollout discussion',scope:'Explore whether this campaign + AI intake approach fits a broader rollout after reviewing readiness and account evidence.',pricing:'to_confirm',terms:'Scope and pricing confirmed before purchase. Campaign count, rollout schedule and commercial terms remain undecided.'}
});

export const engagementOptions=Object.freeze(['Short paid test','Setup in your firm’s accounts','Ongoing managed operation','Larger rollout']);
export const engagementIntro='Possible structures to discuss, subject to agreed scope and readiness. No option is activated or contracted here.';
export const sharedOfferTerms=`Example pilot: ${campaignOffer.days} days at ${offerMoney(campaignOffer.total)}, comprising ${offerMoney(campaignOffer.serviceFee)} service fee and ${offerMoney(campaignOffer.mediaBudget)} media budget. Actual scope, account setup, operation, media budget and pricing are agreed in writing before purchase. No results are guaranteed. Online checkout is unavailable.`;
