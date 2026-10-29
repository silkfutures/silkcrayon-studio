// The enquiry pipeline shown on Studio OS -> Enquiries.
// contacted/interested and booked/won predate this pipeline (see normaliseLeadStatus).
export const LEAD_STATUSES=[
 {key:'new',label:'New',hint:'Not yet replied to.'},
 {key:'discussing',label:'Discussing',hint:'In conversation, scoping the work.'},
 {key:'quote_sent',label:'Quote sent',hint:'Quote with them, waiting on an answer.'},
 {key:'confirmed',label:'Confirmed',hint:'Agreed. Book the sessions.'},
 {key:'lost',label:'Lost',hint:'Not going ahead.'}
];
export const LEAD_STATUS_KEYS=LEAD_STATUSES.map(s=>s.key);
// Historic values kept in the database, folded into the pipeline for display.
const LEGACY={contacted:'discussing',interested:'discussing',booked:'confirmed',won:'confirmed'};
export function normaliseLeadStatus(status){return LEGACY[status]||(LEAD_STATUS_KEYS.includes(status)?status:'new')}
export function leadStatusLabel(status){const key=normaliseLeadStatus(status);return (LEAD_STATUSES.find(s=>s.key===key)||LEAD_STATUSES[0]).label}
// Enquiry types that get the full project treatment in the OS.
export const PROJECT_ENQUIRY_TYPES=['project','bespoke-production'];
export function isProjectEnquiry(lead={}){return PROJECT_ENQUIRY_TYPES.includes(String(lead.enquiry_type||''))}
