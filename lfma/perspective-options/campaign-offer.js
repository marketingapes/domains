// Operator-configurable illustrative pilot, not a universal commercial agreement.
// Buyer fields and model arguments cannot negotiate these example values. Actual terms require agreement before purchase.
export const campaignOffer=Object.freeze({id:'lfma-pilot-v1',days:14,serviceFee:2500,mediaBudget:5000,total:7500,currency:'USD'});
if(campaignOffer.serviceFee+campaignOffer.mediaBudget!==campaignOffer.total)throw new Error('Invalid campaign offer');
export const offerMoney=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:campaignOffer.currency,maximumFractionDigits:0}).format(value);
