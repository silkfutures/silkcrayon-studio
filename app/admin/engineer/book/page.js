import {requireStaff} from '../../../../lib/auth';
import Link from 'next/link';
import {EngineerHeader,EngineerBottomNav} from '../../../../components/EngineerShell';
import EngineerBookingForm from '../../../../components/EngineerBookingForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function EngineerNewBooking(){
 const ctx=await requireStaff();
 if(ctx.profile.role!=='engineer')return <main className="engApp"><EngineerHeader profile={ctx.profile}/><p>Use the <Link href="/admin/bookings/new">owner booking form</Link>.</p></main>;
 return <main className="engApp"><EngineerHeader profile={ctx.profile}/><section className="engWelcome"><Link href="/admin/engineer">← Back to sessions</Link><h1>New booking</h1><p>Create a paid recording booking for an artist who has contacted you.</p></section><EngineerBookingForm/><EngineerBottomNav profile={ctx.profile}/></main>;
}
