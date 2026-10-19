import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireOwner} from '../../../../lib/auth';
import {loadEngineerSupportedData} from '../../../../lib/engineerSupportedData';
import EngineerSupportedRate from '../../../../components/EngineerSupportedRate';
import EngineerSupportedArtists from '../../../../components/EngineerSupportedArtists';
export const dynamic='force-dynamic';
export default async function Page({params}){const ctx=await requireOwner(),{id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const data=await loadEngineerSupportedData(ctx,id);return <main className="container" style={{padding:'40px 0 80px'}}><Link href="/admin/staff">← Staff profiles</Link><p className="eyebrow" style={{marginTop:30}}>Engineer profile</p><h1>{data.engineer.engineer_name||data.engineer.full_name}</h1><p>{data.engineer.active?'Active':'Disabled'} · {data.engineer.role}</p><EngineerSupportedRate engineer={data.engineer}/><EngineerSupportedArtists {...data} owner/></main>}
