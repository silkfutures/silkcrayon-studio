import {redirect} from 'next/navigation';
// Moved: QuickBooks history now lives under Invoicing → Past invoices.
export default async function Moved(){redirect('/admin/invoicing?tab=past');}
