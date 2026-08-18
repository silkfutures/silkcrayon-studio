import SeoServicePage from "../../components/SeoServicePage";
export const metadata={title:"Recording Studio Cardiff | Silkcrayon Studios",description:"Professional recording studio in Cardiff Bay for vocal recording, music production, mixing and artist development. Engineer included. Book Silkcrayon Studios online.",alternates:{canonical:"https://silkcrayon.com/recording-studio-cardiff"},openGraph:{title:"Recording Studio Cardiff | Silkcrayon Studios",description:"Artist-focused recording studio in Cardiff Bay for professional vocal recording, production and release-ready creative development.",url:"https://silkcrayon.com/recording-studio-cardiff",type:"website"}};
export default function Page(){return <SeoServicePage
 eyebrow="Recording studio · Cardiff Bay"
 title="A Cardiff studio"
 accent="built for artists."
 intro="Professional recording without the conveyor-belt feeling. Silkcrayon combines a serious vocal chain, hands-on engineering and creative guidance so every session moves the record forward."
 proof={["Neumann U87","Engineer included","Cardiff Bay","From £60/hour"]}
 points={[{title:"Artist-first sessions",copy:"You are not simply hiring a room. Your engineer helps shape takes, layers, decisions and momentum around what the record actually needs."},{title:"Professional vocal chain",copy:"Record through a Neumann U87 in a dedicated booth with Adam monitoring and an engineer focused on capturing the performance properly."},{title:"A place to keep growing",copy:"Recording can lead naturally into production, mixing, artist development and future sessions without starting again with a different team every time."}]}
 storyTitle="Come in with the idea. Leave further forward."
 story={["Some artists arrive with a finished beat and one vocal to capture. Others arrive with a voice note, half-written hook or a record that is not quite working yet. Both are welcome.","We keep the process practical: get the strongest performance, make useful creative decisions while the energy is there, and keep the project organised so the next session starts where the last one ended."]}
 storyImage="/images/workstation.webp" storyImageAlt="Silkcrayon recording studio workstation in Cardiff Bay"
 process={[{title:"Choose your session",copy:"Book vocal recording online, or enquire if the project needs production, mixing or something more bespoke."},{title:"Tell us the goal",copy:"Give us the context before you arrive so your engineer knows what you are trying to make."},{title:"Make the work",copy:"Record, comp, layer, refine and make decisions in a focused creative environment."},{title:"Keep building",copy:"Your session history and files stay connected to the studio so future work can continue with context."}]}
 ctaHref="/booking" cta="Book studio time" image="/images/wide.webp" imageAlt="Silkcrayon professional recording studio in Cardiff Bay"
 showPromotion={true}
 related={[{kicker:"Vocal sessions",title:"Premium vocal recording",copy:"See the recording setup →",href:"/vocal-recording-cardiff"},{kicker:"Creative development",title:"Music production Cardiff",copy:"Build the whole record →",href:"/music-production-cardiff"},{kicker:"Visit the studio",title:"Getting here",copy:"Find us in Cardiff Bay →",href:"/getting-here"}]}
 />}
