import SiteHeader from '../../components/SiteHeader';
import EnquiryForm from '../../components/EnquiryForm';

export const metadata={
 title:'Plan a Project | Silkcrayon Studios',
 description:'Scoping, budgets and deadlines for artists, bands, labels and organisations developing a larger creative project with Silkcrayon Studios in Cardiff.',
 alternates:{canonical:'https://silkcrayon.com/plan-a-project'},
 openGraph:{title:'Plan a Project | Silkcrayon Studios',description:'Tell us about the record, series or funded project you want to make.',url:'https://silkcrayon.com/plan-a-project',type:'website'}
};

export default function Page(){
 return <main className="marketingSite enquiryPage"><SiteHeader/><section className="section"><div className="container"><EnquiryForm type="project"/></div></section></main>;
}
