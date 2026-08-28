import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../lib/auth';
import {syncEligibleContacts} from '../../../../../lib/marketing';
export async function POST(req){try{await requireOwner();const b=await req.json().catch(()=>({}));return NextResponse.json(await syncEligibleContacts(b.audienceKey||'subscribers'));}catch(e){return NextResponse.json({error:e.message||'Sync failed.'},{status:500})}}
