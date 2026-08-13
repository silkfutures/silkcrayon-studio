export const SERVICES = {
  "test-booking": { slug:"test-booking", name:"Test Booking", short:"Private checkout test.", fixedPence:30, durations:[60], testOnly:true },
  "vocal-recording": { slug:"vocal-recording", name:"Vocal Recording", short:"Expert vocal takes, layers, comping and in-session mix work.", hourlyPence:6000, durations:[60,120,180,240] },
  "full-day": { slug:"full-day", name:"Full Day Studio", short:"Eight hours in the vault for focused recording and production.", fixedPence:45000, durations:[480] },
};
export const BUSINESS_HOURS={0:null,1:["10:00","22:00"],2:["10:00","22:00"],3:["10:00","22:00"],4:["10:00","22:00"],5:["10:00","22:00"],6:["10:00","20:00"]};
export function priceFor(service,d){return service.fixedPence??Math.round((d/60)*service.hourlyPence)}
export function formatGBP(p){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:p<100?2:0,maximumFractionDigits:2}).format(p/100)}
