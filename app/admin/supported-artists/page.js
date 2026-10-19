import Link from 'next/link';
import CopySupportedArtistLink from '../../../components/CopySupportedArtistLink';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import SupportedArtistsAdmin from '../../../components/SupportedArtistsAdmin';
export const dynamic='force-dynamic';
export default async function Page(){await requireOwner();const db=getAdminDb();const [{data:applications,error},{data:engineers=[]}]=await Promise.all([db.from('supported_artists').select('*').order('created_at',{ascending:false}),db.from('staff_profiles').select('user_id,full_name,engineer_name,supported_hourly_price_pence').eq('active',true).in('role',['owner','engineer'])]);return <main className="container" style={{padding:'40px 0'}}><Link href="/admin/more">← Studio menu</Link><p className="eyebrow" style={{marginTop:30}}>Owner tools</p><h1>Supported artists.</h1><p>Review applications, choose the engineer and control access. Start with five artists; expand when you’re ready.</p><CopySupportedArtistLink/>{error?<p role="alert">Programme data is unavailable. Run the supported-artists SQL migrations before using this page.</p>:<SupportedArtistsAdmin applications={applications||[]} engineers={engineers}/>}</main>}
