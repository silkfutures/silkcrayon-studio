import Link from "next/link";
import SiteHeader from "./SiteHeader";

export default function LegalPage({eyebrow,title,intro,children}){
  return <main className="legalPage marketingSite"><SiteHeader/><article className="legalDocument"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="legalIntro">{intro}</p>{children}<div className="legalBack"><Link href="/">← Back to Silkcrayon</Link></div></article></main>
}
export function Section({title,children}){return <section className="legalSection"><h2>{title}</h2>{children}</section>}
