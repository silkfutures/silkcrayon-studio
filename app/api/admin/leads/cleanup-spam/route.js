import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {leadSpamScore} from '../../../../../lib/leadSpam';
export async function POST(){try{await requireOwner();const db=getAdminDb(),{data:leads=[],error}=await db.from('leads').select('*');if(error)throw error;const spam=leads.filter(x=>leadSpamScore(x)>=5),ids=spam.map(x=>x.id);if(ids.length){const {error:de}=await db.from('leads').delete().in('id',ids);if(de)throw de;for(const lead of spam){const {data:customer}=await db.from('customers').select('id').eq('email',lead.email).maybeSingle();if(!customer)await db.from('crm_contacts').delete().eq('email',lead.email).eq('source','Website enquiry')}}return NextResponse.json({ok:true,deleted:ids.length});}catch(e){return NextResponse.json({error:e.message||'Could not clean spam.'},{status:500})}}
