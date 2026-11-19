import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { getStudioSettings } from "../../lib/studioSettings";
import { recordingRateLabel, dryHireRate, voiceoverRate } from "../../lib/publicRates";
import { STUDIO_PASS_HOURLY_PENCE } from "../../lib/studioPassPricing";
import { formatGBP } from "../../lib/services";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studio Services & Prices | Silkcrayon Studios",
  description: "Recording, studio hire, mixing and music production in Cardiff Bay. See rates and book your session.",
  alternates: { canonical: "https://silkcrayon.com/services" }
};

export default async function Services() {
  const pricing = await getStudioSettings();
  const sessions = [
    ["Vocal recording", "Record with an engineer. Mixing and mastering are included within your session.", recordingRateLabel(pricing.studioHourlyPricePence), "/booking?service=vocal-recording", "Book vocals"],
    ["Studio dry hire", "Run your own session or bring your engineer.", `${dryHireRate}/hour · 2-hour minimum`, "/dry-hire-cardiff", "View dry hire"],
    ["Voiceover & narration", "Record speech or audiobook narration with an engineer. WAV files included. Editing is quoted separately.", `${voiceoverRate}/hour`, "/booking?service=voiceover", "Book voiceover"],
    ["Studio hour pass", "Spread 4–8 prepaid recording hours across visits within 30 days. Engineer included.", `${formatGBP(STUDIO_PASS_HOURLY_PENCE)}/hour`, "/studio-pass", "Choose a pass"]
  ];
  const projects = [
    ["Mixing & mastering", "Send your track and a reference so we can quote for the work it needs.", "Quote per track", "/mix-request", "Send your track"],
    ["Music production", "Build a track from scratch or develop an existing demo with a producer.", "Project quote", "/enquire?type=production", "Discuss your project"]
  ];
  return <main className="marketingSite"><SiteHeader/>
    <div className={`container ${styles.directory}`}>
      <header><p className="eyebrow">Silkcrayon Studios · Cardiff Bay</p><h1>Services &amp; prices</h1>
        <img className={styles.vault} src="/images/vault.webp" alt="Inside Silkcrayon’s vault studio in Cardiff Bay" />
      </header>
      {[["Studio sessions", sessions], ["Project work", projects]].map(([heading, rows]) =>
        <section key={heading}><h2>{heading}</h2>
          {rows.map(([title, description, rate, href, action]) =>
            <article className={styles.row} key={title}>
              <div><h3>{title}</h3><p>{description}</p></div>
              <div className={styles.action}><strong>{rate}</strong><Link href={href}>{action}</Link></div>
            </article>)}
        </section>)}
      <p className={styles.help}>Planning an EP, an album or a funded project? <Link href="/plan-a-project">Tell us what you have in mind</Link>.</p>
      <p>Need help choosing? <Link href="/enquire?call=1">Request a call</Link></p>
    </div><SiteFooter/></main>;
}
