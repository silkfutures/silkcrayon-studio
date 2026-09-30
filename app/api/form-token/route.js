import {NextResponse} from 'next/server';
import {issueFormToken} from '../../../lib/formToken';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json({token:issueFormToken()},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Form verification is temporarily unavailable.'},{status:503})}}
