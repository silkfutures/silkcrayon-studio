import {redirect} from 'next/navigation';
import {requireStaff} from '../../../lib/auth';
export default async function Home(){const {profile}=await requireStaff();redirect('/admin/engineer')}
