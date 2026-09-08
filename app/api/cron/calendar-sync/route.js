import {NextResponse} from 'next/server';
import {syncAllAppleCalendars} from '../../../../lib/appleCalendarSync';
export async function GET(request){
 const secret=process.env.CRON_SECRET;if(!secret)return new NextResponse('CRON_SECRET not configured',{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new NextResponse('Unauthorized',{status:401});
 const results=await syncAllAppleCalendars();return NextResponse.json({ok:true,results});
}
