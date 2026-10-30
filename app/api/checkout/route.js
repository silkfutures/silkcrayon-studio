import {getCustomerContext} from '../../../lib/customerAuth';
import {programmeSlotAllowed,programmeRate} from '../../../lib/supportedArtists';
import {publicFormGuard} from "../../../lib/publicFormGuard";
import { NextResponse } from "next/server";
import { SERVICES, priceFor } from "../../../lib/services";
import { getAdminDb } from "../../../lib/supabase";
import { getStripe } from "../../../lib/stripe";
import { generateSlots } from "../../../lib/availability";
import { londonDateTimeToUtc } from "../../../lib/time";
import { rateLimit } from "../../../lib/rateLimit";
import { getPromotionFor } from "../../../lib/promotions";
import {getStudioSettings} from "../../../lib/studioSettings";

export async function POST(request) {
  let submitted;try{submitted=await request.clone().json()}catch{return NextResponse.json({error:'Invalid form submission.'},{status:400})}
  const blocked=await publicFormGuard(request,submitted,{lead:false});
  if(blocked)return blocked;

  let bookingId = null;
  try {
    const body = await request.json();
    if(!await rateLimit(request,{scope:'checkout',limit:20,windowSeconds:900,identity:body.email||''}))return NextResponse.json({error:'Too many booking attempts. Please wait a few minutes and try again.'},{status:429});
    let programme=null;
    if(body.supportedArtist===true){
      const ctx=await getCustomerContext();
      if(!ctx)return NextResponse.json({error:'Sign in to book at your supported rate.'},{status:401});
      const {data:m,error}=await getAdminDb().from('supported_artists').select('*').eq('customer_id',ctx.customer.id).maybeSingle();
      if(error)throw error;
      if(body.service!=='vocal-recording'||!programmeSlotAllowed(m,body.date,body.start,body.end,Number(body.duration)))return NextResponse.json({error:'Choose a session within your active programme dates, eligible times and agreed minimum duration.'},{status:403});
      programme=m;
      body.email=ctx.customer.email;body.fullName=ctx.customer.full_name;body.artistName=ctx.customer.artist_name||m.artist_name;
      body.preferredEngineerUserId=m.engineer_user_id;
    }
    const service = SERVICES[body.service];
    const duration = Number(body.duration);
    if (!service || !service.durations.includes(duration)) throw new Error("Invalid service or duration");
    if(service.slug==='system-test'&&process.env.ENABLE_SYSTEM_TEST_BOOKING!=='true')return NextResponse.json({error:'Test booking is disabled.'},{status:404});
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "") || !/^\d{2}:\d{2}$/.test(body.start || "")) throw new Error("Invalid date or time");
    if (!body.fullName?.trim() || !body.email?.trim()) throw new Error("Name and email are required");
    if(service.slug==='artist-development'&&(!String(body.developmentGoal||'').trim()||!String(body.developmentBlocker||'').trim()||!String(body.developmentOutcome||'').trim()))return NextResponse.json({error:'Tell us your goal, what is stopping you and what would make the session useful.'},{status:400});
    if(String(body.fullName).length>120||String(body.email).length>254||String(body.notes||'').length>2000||String(body.instagram||'').length>200||String(body.developmentGoal||'').length>2000||String(body.developmentBlocker||'').length>2000||String(body.developmentOutcome||'').length>2000)return NextResponse.json({error:'Some booking details are too long.'},{status:400});
    const requestedStart=londonDateTimeToUtc(body.date,body.start);
    if(!requestedStart||requestedStart.getTime()<=Date.now()+5*60*1000)return NextResponse.json({error:'Please choose a future session time.'},{status:400});
    if (!body.policyAccepted || !body.harmfulMusicPolicy) return NextResponse.json({ error: "You must agree to the booking terms and policies before booking." }, { status: 400 });
    if(service.slug==="dry-hire"&&!body.dryHireAccepted)return NextResponse.json({error:"You must agree to the Dry Hire Terms before booking."},{status:400});
    if(service.slug==="dry-hire"&&!body.dryHireAgeAccepted)return NextResponse.json({error:"The lead hirer must confirm they are 18 or over."},{status:400});
    if(service.slug==="dry-hire"&&!String(body.phone||"").trim())return NextResponse.json({error:"A mobile number is required for Dry Hire."},{status:400});
    if(service.slug==="dry-hire"&&!String(body.postcode||"").trim())return NextResponse.json({error:"A home postcode is required for Dry Hire."},{status:400});
    if(String(body.postcode||"").length>20)return NextResponse.json({error:"Postcode is too long."},{status:400});

    const developmentContext=service.slug==='artist-development'?[`ARTIST DEVELOPMENT SESSION`,body.developmentFormat?`Format: ${body.developmentFormat.replaceAll('_',' ')}`:'',body.developmentGoal?`Goal: ${body.developmentGoal}`:'',body.developmentBlocker?`Current blocker: ${body.developmentBlocker}`:'',body.developmentBacklog?`Unreleased catalogue: ${body.developmentBacklog}`:'',body.developmentMusicLink?`Music link: ${body.developmentMusicLink}`:'',body.developmentOutcome?`Useful outcome: ${body.developmentOutcome}`:''].filter(Boolean).join('\n\n'):String(body.notes||'').trim();
    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const { data: existing } = await db.from("bookings").select("booking_date,start_time,end_time,status,hold_expires_at").gte('booking_date',new Date(new Date(body.date+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10)).lte('booking_date',body.date).in("status", ["pending","confirmed"]);
    const liveBookings = (existing || []).filter(b => b.status === "confirmed" || !b.hold_expires_at || b.hold_expires_at > nowIso);
    const { data: blockouts } = await db.from("blockouts").select("start_time,end_time,ignored_service_slugs").eq("booking_date", body.date);
    const validSlots = generateSlots(body.date, duration, liveBookings, blockouts || [], service.slug);
    const chosen = validSlots.find(s => s.start === body.start && s.end === body.end);
    if (!chosen) return NextResponse.json({ error: "That time has just become unavailable. Please choose another slot." }, { status: 409 });

    const email = body.email.trim().toLowerCase();
    let preferredEngineer=null;
    if(service.slug!=="dry-hire"&&body.preferredEngineerUserId){
      const {data:eng}=await db.from("staff_profiles").select("user_id,full_name,engineer_name,active,role").eq("user_id",body.preferredEngineerUserId).maybeSingle();
      if(eng?.active&&["owner","engineer"].includes(eng.role))preferredEngineer=eng;
    }
    let customer;
    const { data: found } = await db.from("customers").select("*").eq("email", email).maybeSingle();
    const {data:crmBefore}=await db.from("crm_contacts").select("email_signup_discount_available,marketing_consent").eq("email",email).maybeSingle();
    const rewardAvailableBefore=Boolean(found?.email_signup_discount_available||crmBefore?.email_signup_discount_available);
    const newlyJoiningEmailList=!!body.marketingConsent&&!Boolean(found?.marketing_consent||crmBefore?.marketing_consent);
    if (found) {
      const { data, error } = await db.from("customers").update({ full_name: body.fullName.trim(), phone: body.phone?.trim() || null, postcode: body.postcode?.trim() || found.postcode || null, artist_name: body.artistName?.trim() || null, instagram: body.instagram?.trim() || found.instagram || null, marketing_consent: found.marketing_consent || !!body.marketingConsent, sms_service_consent: Boolean(body.phone?.trim()), email_signup_discount_available: found.email_signup_discount_available || newlyJoiningEmailList, sms_marketing_consent: found.sms_marketing_consent || !!body.smsMarketingConsent, preferred_engineer_user_id: preferredEngineer?.user_id || found.preferred_engineer_user_id || null, preferred_engineer: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : found.preferred_engineer, updated_at: new Date().toISOString() }).eq("id", found.id).select().single();
      if (error) throw error; customer = data;
    } else {
      const { data, error } = await db.from("customers").insert({ full_name: body.fullName.trim(), email, phone: body.phone?.trim() || null, postcode: body.postcode?.trim() || null, artist_name: body.artistName?.trim() || null, instagram: body.instagram?.trim() || null, marketing_consent: !!body.marketingConsent, sms_service_consent: Boolean(body.phone?.trim()), email_signup_discount_available: newlyJoiningEmailList, sms_marketing_consent: !!body.smsMarketingConsent, preferred_engineer_user_id: preferredEngineer?.user_id || null, preferred_engineer: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : null }).select().single();
      if (error) throw error; customer = data;
    }

    if(body.marketingConsent){
      await db.from("crm_contacts").upsert({customer_id:customer.id,full_name:customer.full_name,email,phone:customer.phone,source:'Booking',marketing_status:'subscribed',marketing_consent:true,email_signup_discount_available:rewardAvailableBefore||newlyJoiningEmailList,updated_at:new Date().toISOString()},{onConflict:'email'});
    }
    const commercial=await getStudioSettings();
    const listPricePence = service.slug==="vocal-recording"?Math.round(duration/60*commercial.studioHourlyPricePence):service.slug==="full-day"?commercial.fullDayPricePence:priceFor(service,duration);
    let promotion=programme||service.slug==='system-test'?null:await getPromotionFor(service.slug,duration);
    const requestedCode=String(body.promoCode||'').trim().toUpperCase();
    if(requestedCode){
      if(programme||service.slug==='system-test'||!/^[A-Z0-9_-]{3,40}$/.test(requestedCode))return NextResponse.json({error:'Invalid discount code.'},{status:400});
      const {data:codeOffer,error:codeError}=await db.from('promotions').select('*').eq('code',requestedCode).maybeSingle();
      if(codeError)throw codeError;
      if(!codeOffer||!codeOffer.active||(codeOffer.starts_at&&new Date(codeOffer.starts_at)>new Date())||(codeOffer.ends_at&&new Date(codeOffer.ends_at)<new Date())||codeOffer.service_slug&&codeOffer.service_slug!==service.slug||codeOffer.duration_minutes&&Number(codeOffer.duration_minutes)!==duration||codeOffer.min_duration_minutes&&duration<Number(codeOffer.min_duration_minutes))return NextResponse.json({error:'This code is expired or not valid for this session.'},{status:400});
      promotion=codeOffer;
    }
    if(promotion?.usage_limit_per_customer){
      const {count}=await db.from('bookings').select('id',{count:'exact',head:true}).eq('customer_id',customer.id).eq('promotion_id',promotion.id).in('status',['pending','confirmed','completed']);
      if(Number(count||0)>=Number(promotion.usage_limit_per_customer)){if(requestedCode)return NextResponse.json({error:'This code has reached its usage limit.'},{status:400});promotion=null;}
    }
    const rewardApplied=!programme&&!promotion&&rewardAvailableBefore&&service.slug!=='system-test';
    let amountPence = programme?Math.round(duration/60*programmeRate(programme)):promotion?(promotion.discount_percent?Math.round(listPricePence*(100-Number(promotion.discount_percent))/100):Number(promotion.offer_price_pence)):(rewardApplied?Math.max(30,Math.round(listPricePence*0.95)):listPricePence);
    const holdExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: reservedId, error: bookingError } = await db.rpc(programme?"reserve_supported_booking_v2":"reserve_booking", programme?{
      p_expected_rate_pence:programmeRate(programme),p_membership_id:programme.id,p_customer_id:customer.id,p_booking_date:body.date,p_start_time:body.start,p_end_time:body.end,p_duration_minutes:duration,p_genre:body.genre?.trim()||null,p_notes:developmentContext||null,p_harmful_music_policy_accepted:true
    }:{
      p_customer_id: customer.id,
      p_service_slug: service.slug,
      p_service_name: service.name,
      p_booking_date: body.date,
      p_start_time: body.start,
      p_end_time: body.end,
      p_duration_minutes: duration,
      p_genre: body.genre?.trim() || null,
      p_notes: developmentContext || null,
      p_amount_pence: amountPence,
      p_hold_expires_at: holdExpires,
      p_harmful_music_policy_accepted: true,
    });
    if (bookingError) {
      if (bookingError.message?.includes("slot_unavailable")) return NextResponse.json({ error: "That time has just become unavailable. Please choose another slot." }, { status: 409 });
      if(programme)return NextResponse.json({error:bookingError.message||"Programme booking unavailable."},{status:409});
      throw bookingError;
    }
    bookingId = reservedId;
    if(programme){
      const {data:reserved,error:priceError}=await db.from('bookings').select('amount_pence').eq('id',reservedId).single();
      if(priceError||!reserved||!Number.isInteger(reserved.amount_pence)||reserved.amount_pence<100)throw new Error('Could not verify programme price. Please retry.');
      amountPence=reserved.amount_pence;
    }
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
      preferred_engineer_name: preferredEngineer ? (preferredEngineer.engineer_name||preferredEngineer.full_name) : null,
      promotion_id: promotion?.id || null,
      promotion_code: promotion?.code || null,
      list_amount_pence: listPricePence,
      discount_amount_pence: Math.max(0,listPricePence-amountPence),
      dry_hire_terms_accepted: service.slug==="dry-hire" ? true : false,
      dry_hire_terms_version: service.slug==="dry-hire" ? "2026-09-05" : null,
      dry_hire_lead_hirer_18_confirmed: service.slug==="dry-hire" ? true : false
    }).eq("id", reservedId);
    const booking = { id: reservedId };

    // Anonymous attribution only. Never allow browser analytics to set payment status.
    const visitorId=String(body.analyticsVisitorId||'').slice(0,100);
    const tracked=/^[a-zA-Z0-9_-]{12,100}$/.test(visitorId);
    const tag=(v,n)=>String(v||'').trim().slice(0,n)||null;
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: false,
      mode: "payment",
      invoice_creation: { enabled: true },
      customer_email: email,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id, service_slug: service.slug, promotion_code:promotion?.code||'', supported_artist_id:programme?.id||'', email_signup_discount_applied:rewardApplied?'true':'false', analytics_visitor_id:tracked?visitorId:'' },
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: amountPence, product_data: { name: `Silkcrayon — ${programme?"Supported Artist · Studio session":service.name}${promotion?` · ${promotion.name}`:(rewardApplied?' · 5% email reward':'')}`, description: `${body.date} · ${body.start}–${body.end} · Cardiff Bay${promotion?` · ${promotion.name}`:(rewardApplied?' · 5% email-list reward applied':'')}` } } }],
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: programme?`${baseUrl}/account/supported-artists?cancelled=1`:`${baseUrl}/booking?cancelled=1`,
      expires_at: Math.floor(Date.now()/1000) + 30*60,
    });
    await db.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", booking.id);
    if(tracked){
      // Best effort: analytics must never prevent a paid booking or redirect.
      try{
        const {error:trackError}=await db.from('booking_funnel_events').insert({
          event_name:'checkout_started',visitor_id:visitorId,booking_id:booking.id,service_slug:service.slug,
          utm_source:tag(body.analyticsSource,120),utm_medium:tag(body.analyticsMedium,120),
          utm_campaign:tag(body.analyticsCampaign,120),referrer_host:tag(body.analyticsReferrerHost,120)
        });
        if(trackError)console.error('Checkout conversion event failed',trackError.message);
      }catch(error){console.error('Checkout conversion event failed',error?.message||error);}
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (bookingId) { try { await getAdminDb().from("bookings").update({ status: "cancelled" }).eq("id", bookingId); } catch {} }
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
