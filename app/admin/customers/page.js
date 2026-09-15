import {redirect} from 'next/navigation';
import {requireOwner} from '../../../lib/auth';
export default async function Customers(){await requireOwner();redirect('/admin/artists')}
