import { NextResponse } from "next/server";
import { SERVICES, priceFor } from "../../../lib/services";
import { getAdminDb } from "../../../lib/supabase";
import { getStripe } from "../../../lib/stripe";
import { generateSlots } from "../../../lib/availability";
import { londonDateTimeToUtc } from "../../../lib/time";
import { rateLimit } from "../../../lib/rateLimit";

export async function POST(request) {
  let bookingId = null;
  try {
    const body = await request.json();
    if(!await rateLimit(request,{scope:'checkout',limit:20,windowSeconds:900,identity:body.email||''}))return NextResponse.json({error:'Too many booking attempts. Please wait a few minutes and try again.'},{status:429});
    const service = SERVICES[body.service];
    const duration = Number(body.duration);
    if (!service || !service.durations.includes(duration)) throw new Error("Invalid service or duration");
    if(service.slug==='system-test'&&process.env.ENABLE_SYSTEM_TEST_BOOKING!=='true')return NextResponse.json({error:'Test booking is disabled.'},{status:404});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "") || !/^\d{2}:\d{2}$/.test(body.start || "")) throw new Error("Invalid date or time");
    if (!body.fullName?.trim() || !body.email?.trim()) throw new Error("Name and email are required");
    if(String(body.fullName).length>120||String(body.email).length>254||String(body.notes||'').length>2000)return NextResponse.json({error:'Some booking details are too long.'},{status:400});
    const requestedStart=londonDateTimeToUtc(body.date,body.start);
    if(!requestedStart||requestedStart.getTime()<=Date.now()+5*60*1000)return NextResponse.json({error:'Please choose a future session time.'},{status:400});
    if (!body.policyAccepted || !body.harmfulMusicPolicy) return NextResponse.json({ error: "You must agree to the booking terms and policies before booking." }, { status: 400 });

    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const { data: existing } = await db.from("bookings").select("start_time,end_time,status,hold_expires_at").eq("booking_date", body.date).in("status", ["pending","confirmed"]);
    const liveBookings = (existing || []).filter(b => b.status === "confirmed" || !b.hold_expires_at || b.hold_expires_at > nowIso);
    const { data: blockouts } = await db.from("blockouts").select("start_time,end_time").eq("booking_date", body.date);
    const validSlots = generateSlots(body.date, duration, liveBookings, blockouts || []);
    const chosen = validSlots.find(s => s.start === body.start && s.end === body.end);
    if (!chosen) return NextResponse.json({ error: "That time has just become unavailable. Please choose another slot." }, { status: 409 });

    const email = body.email.trim().toLowerCase();
    let preferredEngineer=null;
    if(body.preferredEngineerUserId){
      const {data:eng}=await db.from("staff_profiles").select("user_id,full_name,engineer_name,active,role").eq("user_id",body.preferredEngineerUserId).maybeSingle();
      if(eng?.active&&["owner","engineer"].includes(eng.role))preferredEngineer=eng;
    }
    let customer;
    const { data: found } = await db.from("customers").select("*").eq("email", email).maybeSingle();
    const {data:crmBefore}=await db.from("crm_contacts").select("email_signup_discount_available,marketing_consent").eq("email",email).maybeSingle();
    const rewardAvailableBefore=Boolean(found?.email_signup_discount_available||crmBefore?.email_signup_discount_available);
    const newlyJoiningEmailList=!!body.marketingConsent&&!Boolean(found?.marketing_consent||crmBefore?.marketing_consent);
    if (found) {
      const { data, error } = await db.from("customers").update({ full_name: body.fullName.trim(), phone: body.phone?.trim() || null, artist_name: body.artistName?.trim() || null, marketing_consent: found.marketing_consent || !!body.marketingConsent, sms_service_consent: Boolean(body.phone?.trim()), email_signup_discount_available: found.email_signup_discount_available || newlyJoiningEmailList, sms_marketing_consent: found.sms_marketing_consent || !!body.smsMarketingConsent, preferred_engineer_user_id: preferredEngineer?.user_id || found.preferred_engineer_user_id || null, preferred_engineer: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : found.preferred_engineer, updated_at: new Date().toISOString() }).eq("id", found.id).select().single();
      if (error) throw error; customer = data;
    } else {
      const { data, error } = await db.from("customers").insert({ full_name: body.fullName.trim(), email, phone: body.phone?.trim() || null, artist_name: body.artistName?.trim() || null, marketing_consent: !!body.marketingConsent, sms_service_consent: Boolean(body.phone?.trim()), email_signup_discount_available: newlyJoiningEmailList, sms_marketing_consent: !!body.smsMarketingConsent, preferred_engineer_user_id: preferredEngineer?.user_id || null, preferred_engineer: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : null }).select().single();
      if (error) throw error; customer = data;
    }

    if(body.marketingConsent){
      await db.from("crm_contacts").upsert({customer_id:customer.id,full_name:customer.full_name,email,phone:customer.phone,source:'Booking',marketing_status:'subscribed',marketing_consent:true,email_signup_discount_available:rewardAvailableBefore||newlyJoiningEmailList,updated_at:new Date().toISOString()},{onConflict:'email'});
    }
    const listPricePence = priceFor(service, duration);
    const relaunchEligible=service.slug==='vocal-recording'&&duration===120&&Date.now()<=new Date('2026-08-31T22:59:59Z').getTime();
    let relaunchApplied=false;
    if(relaunchEligible){
      const {data:priorOffer}=await db.from('bookings').select('id').eq('customer_id',customer.id).eq('duration_minutes',120).eq('amount_pence',10000).eq('payment_status','paid').limit(1);
      const {data:priorCreditOffer}=await db.from('studio_payments').select('id').eq('customer_id',customer.id).eq('discount_code','RELAUNCH_2H_100').eq('status','paid').limit(1);
      relaunchApplied=!(priorOffer||[]).length&&!(priorCreditOffer||[]).length;
    }
    const rewardApplied=!relaunchApplied&&rewardAvailableBefore&&service.slug!=='system-test';
    const amountPence=relaunchApplied?10000:rewardApplied?Math.max(30,Math.round(listPricePence*0.95)):listPricePence;
    const holdExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: reservedId, error: bookingError } = await db.rpc("reserve_booking", {
      p_customer_id: customer.id,
      p_service_slug: service.slug,
      p_service_name: service.name,
      p_booking_date: body.date,
      p_start_time: body.start,
      p_end_time: body.end,
      p_duration_minutes: duration,
      p_genre: body.genre?.trim() || null,
      p_notes: body.notes?.trim() || null,
      p_amount_pence: amountPence,
      p_hold_expires_at: holdExpires,
      p_harmful_music_policy_accepted: true,
    });
    if (bookingError) {
      if (bookingError.message?.includes("slot_unavailable")) return NextResponse.json({ error: "That time has just become unavailable. Please choose another slot." }, { status: 409 });
      throw bookingError;
    }
    bookingId = reservedId;
    const policyVersion = "2026-08-14";
    const forwarded = request.headers.get("x-forwarded-for") || "";
    await db.from("bookings").update({
      terms_version: policyVersion,
      cancellation_policy_version: policyVersion,
      harmful_music_policy_version: policyVersion,
      privacy_policy_version: policyVersion,
      policy_accepted_at: new Date().toISOString(),
      policy_acceptance_ip: forwarded.split(",")[0]?.trim() || null,
      policy_acceptance_user_agent: request.headers.get("user-agent") || null,
      sms_reminder_consent: Boolean(body.phone?.trim()),
      preferred_engineer_user_id: preferredEngineer?.user_id || null,
      preferred_engineer_name: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : null
    }).eq("id", reservedId);
    const booking = { id: reservedId };

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      mode: "payment",
      invoice_creation: { enabled: true },
      customer_email: email,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id, service_slug: service.slug, email_signup_discount_applied:rewardApplied?'true':'false', relaunch_offer_applied:relaunchApplied?'true':'false' },
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: amountPence, product_data: { name: `Silkcrayon — ${service.name}${relaunchApplied?' · 2 Hours for £100':rewardApplied?' · 5% email reward':''}`, description: `${body.date} · ${body.start}–${body.end} · Cardiff Bay${relaunchApplied?' · Relaunch offer applied':rewardApplied?' · 5% email-list reward applied':''}` } } }],
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/booking?cancelled=1`,
      expires_at: Math.floor(Date.now()/1000) + 30*60,
    });
    await db.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", booking.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (bookingId) { try { await getAdminDb().from("bookings").update({ status: "cancelled" }).eq("id", bookingId); } catch {} }
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
