import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireOwner} from '../../../../lib/auth';
import {loadEngineerSupportedData} from '../../../../lib/engineerSupportedData';
import EngineerSupportedRate from '../../../../components/EngineerSupportedRate';
import EngineerSupportedArtists from '../../../../components/EngineerSupportedArtists';
import EngineerPaySettings from '../../../../components/EngineerPaySettings';
import {getAdminDb} from '../../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function Page({params}){const ctx=await requireOwner(),{id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const data=await loadEngineerSupportedData(ctx,id);const {data:pay}=await getAdminDb().from('staff_profiles').select('user_id,engineer_pay_hourly_pence,engineer_supported_pay_hourly_pence,stripe_connect_account_id,stripe_transfers_active').eq('user_id',id).maybeSingle();return <main className="container" style={{padding:'40px 0 80px'}}><Link href="/admin/staff">← Staff profiles</Link><p className="eyebrow" style={{marginTop:30}}>Engineer profile</p><h1>{data.engineer.engineer_name||data.engineer.full_name}</h1><p>{data.engineer.active?'Active':'Disabled'} · {data.engineer.role}</p>{pay&&<EngineerPaySettings engineer={pay}/>}<EngineerSupportedRate engineer={data.engineer}/><EngineerSupportedArtists {...data} owner/></main>}
