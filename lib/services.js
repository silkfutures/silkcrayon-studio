export const SERVICES = {
  "vocal-recording": { slug:"vocal-recording", name:"Vocal Recording", short:"Expert vocal takes, layers, comping and in-session mix work.", hourlyPence:6000, durations:[60,120,180,240,300,360,420] },
  "full-day": { slug:"full-day", name:"Full Day Studio", short:"Eight hours in the vault for focused recording, development and production.", fixedPence:45000, durations:[480] },
  "system-test": { slug:"system-test", name:"30p Test Booking", short:"Temporary checkout used to test the Silkcrayon booking system.", fixedPence:30, durations:[60] },
};
export const BUSINESS_HOURS={0:null,1:["10:00","22:00"],2:["10:00","22:00"],3:["10:00","22:00"],4:["10:00","22:00"],5:["10:00","22:00"],6:["10:00","20:00"]};
export function priceFor(s,d){return s.fixedPence??Math.round(d/60*s.hourlyPence)}
export function formatGBP(p){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:p%100===0?0:2}).format((p||0)/100)}
