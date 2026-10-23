import {cookies} from 'next/headers';
import AdminBackButton from '../../components/AdminBackButton';
import PrivacyMode from '../../components/PrivacyMode';
import './os-polish.css';
import './os-design-refresh.css';
export const metadata={robots:{index:false,follow:false}};
export default async function AdminLayout({children}){const jar=await cookies();return <PrivacyMode initialHidden={jar.get('sc_privacy')?.value==='1'}><AdminBackButton/>{children}</PrivacyMode>}
