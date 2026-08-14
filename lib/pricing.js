export const STUDIO_HOURLY_PENCE=6000;
export const MAX_PREPAID_HOURS=20;
export const STUDIO_FINISH_PRICE_PENCE=Number(process.env.STUDIO_FINISH_PRICE_PENCE||6000);
export const MIX_MASTER_PRICE_PENCE=STUDIO_FINISH_PRICE_PENCE;
export const MIX_MASTER_TURNAROUND=process.env.STUDIO_FINISH_TURNAROUND||'within 7 days';
export const MIX_MASTER_REVISIONS=Number(process.env.STUDIO_FINISH_REVISIONS||1);

export const STAFF_DISCOUNTS=[
  {code:'none',label:'No extra discount',percent:0},
  {code:'loyalty5',label:'5% loyalty',percent:5},
  {code:'approved10',label:'10% approved',percent:10},
];
export function studioHoursBasePence(hours){
  const h=Math.max(1,Math.min(MAX_PREPAID_HOURS,Number(hours)||1));
  if(h===2)return 11000;
  const perHour=h>=10?5000:h>=8?5250:h>=5?5500:6000;
  return Math.round(h*perHour);
}
export function studioHoursStandardPence(hours){return Math.round((Number(hours)||0)*STUDIO_HOURLY_PENCE)}
export function discountFor(code){return STAFF_DISCOUNTS.find(x=>x.code===code)||STAFF_DISCOUNTS[0]}
export function applyStaffDiscount(pence,code){const d=discountFor(code);return Math.max(30,Math.round(Number(pence)*(1-d.percent/100)))}
export function commercialQuote({kind,hours=0,discountCode='none',manualAmountPence=0}){
  let base=manualAmountPence;
  if(kind==='package')base=studioHoursBasePence(hours);
  if(kind==='mix_master')base=MIX_MASTER_PRICE_PENCE;
  const final=applyStaffDiscount(base,discountCode);
  return {basePence:base,finalPence:final,discount:discountFor(discountCode),standardPence:kind==='package'?studioHoursStandardPence(hours):base};
}
