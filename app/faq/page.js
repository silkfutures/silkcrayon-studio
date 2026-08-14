import LegalPage,{Section} from "../../components/LegalPage";
export const metadata={title:"Studio FAQ",description:"Frequently asked questions about recording at Silkcrayon Studios in Cardiff Bay."};
const qs=[
["Where is the studio?","Silkcrayon Studio is at 113–116 Portland House, Bute Street, Cardiff CF10 5EQ, in Cardiff Bay. Your reminder email includes arrival information."],
["What should I bring?","Bring your lyrics, references and any instrumental files you need. Having WAV files or download links ready before the session helps you spend more of your time creating."],
["Is an engineer included?","Yes. Vocal Recording sessions include an engineer for the booked studio time unless a service is explicitly described otherwise."],
["Can I bring friends?","Yes — up to four guests. Please keep the room comfortable and workable for the engineer and artist."],
["Can under-16s attend?","Yes, but anyone under 16 must attend with a responsible adult."],
["What happens if I am late?","Your booking still finishes at the original end time, so arriving late reduces the recording time available."],
["Can I reschedule?","You get one free reschedule when requested more than 48 hours before the session. Requests 24–48 hours before receive studio credit rather than a cash refund. Under 24 hours is non-refundable."],
["What happens if I miss my session?","A no-show forfeits the full booking value or studio credits used for the booking."],
["What is Studio Finish?","Studio Finish is our £60 post-session finishing service. We spend additional time cleaning, balancing, processing and preparing your song after the session. Delivery is within 7 days and one revision is included. Additional work or revisions can be quoted separately."],
["How long do you keep my files?","We retain studio project/session files for up to 12 months after the session. Artists should always keep their own copies of masters, stems and important files."],
["What music can I record?","Silkcrayon has a strict No Harmful Music Policy. We do not facilitate material that glorifies real-world violence, targeted threats, hate or dehumanisation, sexual exploitation, or harassment."],
["Can I smoke or vape in the studio?","No. Smoking, vaping, cannabis and illegal drugs are not permitted on the premises."],
["I have access requirements — what should I do?","Contact info@silkcrayon.com before booking or before your visit and we will explain the current access arrangements and work with you where reasonably possible."],
];
export default function FAQ(){return <LegalPage eyebrow="Before your session" title="Studio FAQ" intro="The useful stuff — what to bring, how bookings work and what to expect when you arrive."><div className="faqList">{qs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></LegalPage>}
