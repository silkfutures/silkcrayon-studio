import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '../../../components/SiteHeader';
import { engineers, testimonials } from '../../../lib/engineers';
import styles from '../../../components/MeetEngineers.module.css';
export function generateStaticParams() { return engineers.map(({slug}) => ({slug})); }
export async function generateMetadata({ params }) {
  const {slug} = await params;
  const person = engineers.find(p => p.slug === slug);
  if (!person) return {};
  return { title: `${person.name} | Silkcrayon Studios Cardiff`, description: person.bio[0], alternates: { canonical: `/engineers/${slug}` } };
}
export default async function EngineerProfile({ params }) {
  const {slug} = await params;
  const person = engineers.find(p => p.slug === slug);
  if (!person) notFound();
  return <main className="marketingSite"><SiteHeader/><section className={styles.profilePage}><div className="container">
    <Link className="textLink" href="/#engineers">← Meet the engineers</Link>
    <div className={styles.profileLayout}><div className={styles.portrait}><img src={person.image} width={person.width} height={person.height} alt={`${person.name} at work in the studio`}/></div>
    <div className={styles.bio}><p className="eyebrow">{person.role}</p><h1>{person.name}</h1><p className={styles.statement}>{person.genres}</p>{person.bio.map(p => <p key={p}>{p}</p>)}
    <Link className="button primary" href="/booking">Book a session ↗</Link>
    <p><Link className="textLink" href={`/enquire?engineer=${person.slug}`}>Ask about working with {person.short} →</Link></p>
    {person.slug === 'nathan-misra' && <Link className="textLink" href="/artist-development">Explore artist development →</Link>}</div></div>
    {person.slug === 'billy-tucker' && <div className={styles.testimonials}><p className="eyebrow">Artists on working with Billy</p><div className={styles.quotes}>{testimonials.map(({name,quote}) => <figure key={name}><blockquote>“{quote}”</blockquote><figcaption>{name}</figcaption></figure>)}</div></div>}
    <nav className={styles.profileLinks} aria-label="Other engineers">{engineers.filter(p => p.slug !== slug).map(p => <Link key={p.slug} className="textLink" href={`/engineers/${p.slug}`}>Meet {p.short} →</Link>)}</nav>
  </div></section></main>;
}
