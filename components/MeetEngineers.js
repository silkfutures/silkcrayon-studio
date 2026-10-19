import Link from 'next/link';
import { engineers } from '../lib/engineers';
import styles from './MeetEngineers.module.css';

export default function MeetEngineers() {
  return <section id="engineers" className={`section ${styles.section}`} aria-labelledby="engineers-heading">
    <div className="container">
      <div className="sectionHeading"><div><p className="eyebrow">The people behind the sound</p><h2 id="engineers-heading">Find your engineer.</h2></div><p>Three different backgrounds. Find the person who fits your sound.</p></div>
      <div className={styles.profiles}>{engineers.map(person => <article className={styles.profile} key={person.slug}>
        <Link href={`/engineers/${person.slug}`} className={styles.portrait} aria-label={`Meet ${person.name}`}><img src={person.image} alt={`${person.name} at work in the studio`} width={person.width} height={person.height} loading="lazy"/></Link>
        <div className={styles.bio}><p className="eyebrow">{person.role}</p><h3>{person.name}</h3><p className={styles.statement}>{person.genres}</p><Link className="textLink" href={`/engineers/${person.slug}`}>Meet {person.short} →</Link></div>
      </article>)}</div>
    </div>
  </section>;
}
