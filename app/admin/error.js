"use client";
import Link from 'next/link';
export default function ErrorScreen({reset}){return <main className="adminPage"><section className="adminSection" role="alert"><p className="eyebrow">Studio OS</p><h1>We couldn’t load this page.</h1><p>Please retry. If you just saved a booking or payment, check its existing record before submitting again.</p><div className="actions"><button className="button primary" onClick={()=>reset()}>Try again</button><Link className="button outline" href="/admin/home">Go to home</Link></div></section></main>}
