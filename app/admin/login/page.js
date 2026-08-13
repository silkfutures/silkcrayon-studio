import { Suspense } from 'react';
import { LoginForm } from '../../../components/AuthForms';
export default function Login(){return <main className="authPage"><section className="authCard"><p className="eyebrow">Silkcrayon Studio OS</p><h1>Staff login.</h1><p className="muted">Bookings, customers, sessions and studio operations.</p><Suspense fallback={<p className="muted">Loading…</p>}><LoginForm/></Suspense><a className="setupLink" href="/admin/setup">First time setting up V4?</a></section></main>}
