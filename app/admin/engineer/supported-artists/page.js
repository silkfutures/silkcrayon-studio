import {redirect} from 'next/navigation';
import CopySupportedArtistLink from '../../../../components/CopySupportedArtistLink';
import {requireStaff} from '../../../../lib/auth';
import {loadEngineerSupportedData} from '../../../../lib/engineerSupportedData';
import {EngineerHeader,EngineerBottomNav} from '../../../../components/EngineerShell';
import EngineerSupportedArtists from '../../../../components/EngineerSupportedArtists';
export const dynamic='force-dynamic';
export default async function Page(){const ctx=await requireStaff();if(ctx.profile.role==='owner')redirect('/admin/supported-artists');const data=await loadEngineerSupportedData(ctx,ctx.user.id);return <main className="engApp"><EngineerHeader profile={ctx.profile}/><div className="container" style={{padding:'32px 0 90px'}}><h1>{data.engineer.engineer_name||data.engineer.full_name}</h1><CopySupportedArtistLink/><EngineerSupportedArtists {...data} owner={ctx.profile.role==='owner'}/></div><EngineerBottomNav profile={ctx.profile}/></main>}
