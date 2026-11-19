import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";

export default async function Page({searchParams}) {
  const params = await searchParams;
  if (params?.paid !== "1") redirect("/booking?service=vocal-recording&duration=120");
  return <main className="marketingSite storePage"><SiteHeader/><section className="section"><div className="container storeSuccess"><h1>Your studio hours</h1><p>Your two prepaid hours appear in My Studio once Stripe confirms payment.</p><Link className="button primary" href="/account/book?hours=2">Choose your session</Link></div></section></main>;
}
