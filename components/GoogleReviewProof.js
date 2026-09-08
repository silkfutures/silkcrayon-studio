import Reveal from './Reveal';

const reviewUrl='https://www.google.com/maps/search/?api=1&query=Silkcrayon+Studio+Cardiff';
const general=[
 ['“It’s more than just a place to record or create—it’s a genuine safe space.”','Cherry Morgan'],
 ['“Incredible experience. Nathan was such a joy to work with.”','Kathryn Feehan'],
 ['“Nathan is very knowledgeable and knows how to bring people along with encouragement.”','J B']
];
const development=[
 ['“Held a safe space for me being my authentic self and gave me insight.”','Da Mota Pritchard'],
 ['“Nathan is very knowledgeable and knows how to bring people along with encouragement.”','J B'],
 ['“It’s more than just a place to record or create—it’s a genuine safe space.”','Cherry Morgan']
];

export default function GoogleReviewProof({context='general',compact=false}){
 const reviews=context==='artist-development'?development:general;
 if(compact)return <section className="googleReviewCompact"><div className="container"><div><span className="reviewStars" aria-label="5 out of 5 stars">★★★★★</span><b>5.0 on Google</b><small>40+ published reviews</small></div><a href={reviewUrl} target="_blank" rel="noreferrer">Read what artists say ↗</a></div></section>;
 return <section className="section googleReviewProof"><div className="container"><Reveal><div className="sectionHeading"><div><p className="eyebrow">{context==='artist-development'?'What artists experience':'The artist perspective'}</p><h2>{context==='artist-development'?<>The room matters.<br/>So does the person.</>:<>Good sessions feel<br/>different.</>}</h2></div><div className="reviewRating"><span className="reviewStars" aria-label="5 out of 5 stars">★★★★★</span><b>5.0 on Google</b><small>40+ published reviews</small></div></div></Reveal><div className="googleReviewGrid">{reviews.map(([quote,name],i)=><Reveal key={name} delay={i*70}><blockquote><p>{quote}</p><cite>{name} · Google review</cite></blockquote></Reveal>)}</div><a className="textLink" href={reviewUrl} target="_blank" rel="noreferrer">Read all Google reviews ↗</a></div></section>
}
