export const VERSION='2026-09-08.1';
export const SOURCE='https://www.jpml.uscourts.gov/sites/jpml/files/Pending_MDL_Dockets_By_MDL_Type-September-1-2026.pdf';
export const brands=[
 {id:'lfma',name:'Law Firm Marketing Apes',host:'lawfirmmarketingapes.com',url:'https://lawfirmmarketingapes.com',role:'agency',color:'#173f70'},
 {id:'btl',name:'Best Tort Lawyers',host:'besttortlawyers.com',url:'https://pages.besttortlawyers.com',role:'consumer',color:'#153b51'},
 {id:'nil',name:'Nearest Injury Lawyers',host:'nearestinjurylawyers.com',url:'https://nearestinjurylawyers.com',role:'consumer',color:'#182e4a'},
 {id:'dihac',name:'Do I Have A Claim',host:'doihaveaclaim.ai',url:'https://dihac-site.onrender.com',role:'consumer',color:'#145c59'},
 {id:'ma',name:'Marketing Apes',host:'marketingapes.com',url:'https://marketingapes.com',role:'agency',color:'#184e46'},
 {id:'kg',name:'Kyle Gosselin',host:'kylegosselin.com',url:'https://kylegosselin.com',role:'agency',color:'#283b57'},
 {id:'lee',name:'Legal Evolution Engine',host:'legalevolutionengine.com',url:'https://lee-site-2rwl.onrender.com',role:'agency',color:'#3f3164'}
];
const rows=[
 ['mva','Motor vehicle accidents','Local injury',null,'Accident location, date, injury, treatment and representation status.'],
 ['sexual-abuse','Sexual abuse','Abuse',null,'Approved jurisdiction, institution and time period. Use a trauma-informed private intake.'],
 ['depo-provera','Depo-Provera','Medication',3140,'Product identification, treatment history and buyer-approved diagnosis criteria.'],
 ['talc','Talcum powder','Consumer product',2738,'Product and use history, relevant diagnosis and buyer-approved time periods.'],
 ['roundup','Roundup','Exposure',2741,'Product identification, exposure history and buyer-approved diagnosis criteria.'],
 ['paraquat','Paraquat','Exposure',3004,'Product identification, occupational exposure history and approved criteria.'],
 ['afff','AFFF firefighting foam','Exposure',2873,'Exposure setting, product history, geography and buyer-approved criteria.'],
 ['hair-relaxer','Hair relaxer','Consumer product',3060,'Product identification, use history and buyer-approved medical criteria.'],
 ['hernia-mesh','Hernia mesh','Medical device',2846,'Manufacturer, implant and revision records; distinguish each device litigation.'],
 ['bard-port','Bard implanted ports','Medical device',3081,'Device identification, procedure records and buyer-approved complications.'],
 ['paragard','Paragard IUD','Medical device',2974,'Device identification, placement or removal history and approved criteria.'],
 ['cpap','Philips CPAP','Medical device',3014,'Device model, use history and buyer-approved criteria.'],
 ['exactech','Exactech implants','Medical device',3044,'Implant model, procedure and revision records.'],
 ['suboxone','Suboxone film','Medication',3092,'Product formulation, prescription history and approved criteria.'],
 ['glp-1','GLP-1 medications','Medication',3094,'Exact medication, treatment and diagnosis history; separate related litigation tracks.'],
 ['glp-1-vision','GLP-1 vision claims','Medication',3163,'Exact medication and buyer-approved ophthalmology records.'],
 ['tepezza','Tepezza','Medication',3079,'Treatment history and buyer-approved medical records.'],
 ['dupixent','Dupixent','Medication',3180,'Treatment dates, product identification and approved medical criteria.'],
 ['infant-nutrition','Preterm infant nutrition','Consumer product',3026,'Exact nutrition product and medical records through a private guardian intake.'],
 ['social-media','Social media personal injury','Consumer product',3047,'Platform, dates, age and approved criteria through a private intake.'],
 ['uber-assault','Uber passenger assault','Abuse',3084,'Trip identification, jurisdiction and approved criteria using trauma-informed intake.'],
 ['lyft-assault','Lyft passenger assault','Abuse',3171,'Trip identification, jurisdiction and approved criteria using trauma-informed intake.'],
 ['roblox','Roblox exploitation and assault','Abuse',3166,'Platform records and approved criteria through a private guardian intake.'],
 ['custom','Custom campaign','Custom',null,'Define the offer, audience, geography, acceptance criteria and delivery owner.']
];
export const topics=rows.map(([id,name,category,mdl,review])=>({id,name,category,mdl,review,source:mdl?SOURCE:null,contentStatus:'template_review_required',acceptingClaimsVerified:false}));
