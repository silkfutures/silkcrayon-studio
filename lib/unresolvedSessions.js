import {sessionEndUtc} from './engineerWorkRules.js';
import {isCheckoutHold} from './bookingVisibility.js';
export function needsSessionReport(booking,today,now=Date.now()){
 const end=sessionEndUtc(booking);
 return booking.booking_date<=today&&(!end||end.getTime()<=now)&&['pending','confirmed','completed'].includes(booking.status)&&!isCheckoutHold(booking)&&!(booking.session_reports||[]).length;
}
