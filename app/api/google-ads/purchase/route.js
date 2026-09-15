import {NextResponse} from "next/server";
import {getStripe} from "../../../../lib/stripe";
import {getAdminDb} from "../../../../lib/supabase";
import {verifiedPurchase} from "../../../../lib/googleAds";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => NextResponse.json(body, {status, headers: {"Cache-Control": "no-store"}});
export async function GET(request) {
  try {
    const id = new URL(request.url).searchParams.get("session_id");
    if (!id || !/^cs_live_[a-zA-Z0-9]+$/.test(id)) return reply({error: "Invalid checkout session"}, 400);
    const session = await getStripe().checkout.sessions.retrieve(id);
    const purchase = await verifiedPurchase(session, getAdminDb());
    return purchase ? reply(purchase) : reply({error: "Payment is not eligible or confirmation is pending"}, 404);
  } catch (error) {
    console.error("Google Ads conversion verification failed", error?.message);
    return reply({error: "Could not verify payment"}, 503);
  }
}
