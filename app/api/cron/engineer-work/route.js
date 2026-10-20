import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {processDueOffers} from '../../../../lib/engineerOffers';
import {processDuePayouts,lowBalanceAlert} from '../../../../lib/engineerPayouts';

// Every 5 minutes: close expired offers → next backup / owner alert, then release due engineer payouts.
export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return new NextResponse('CRON_SECRET not configured',{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new NextResponse('Unauthorized',{status:401});
 const db=getAdminDb(),out={ok:true};
 try{Object.assign(out,await processDueOffers(db));}catch(e){out.ok=false;out.offerError=e.message;}
 try{Object.assign(out,await processDuePayouts(db,{limit:25}));}catch(e){out.ok=false;out.payoutError=e.message;}
 try{Object.assign(out,await lowBalanceAlert(db));}catch(e){out.balanceError=e.message;}
 return NextResponse.json(out,{status:out.ok?200:500});
}
