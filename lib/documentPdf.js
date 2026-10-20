import {PDFDocument,rgb,StandardFonts,PDFName,PDFString} from 'pdf-lib';
import {logoDarkBase64} from './documentLogoDark.js';

// Clean accounting layout (white page, Helvetica/Arial): business details + logo, INVOICE TO / meta grid,
// DATE · SERVICE · DESCRIPTION · QTY · RATE · AMOUNT table, BALANCE DUE, "Please make payment to".
// Renders new snapshots (rows/terms/payTo) and older stored snapshots (lines/sections) alike.
const W=595.28,H=841.89,L=20,R=575,BOTTOM=60;
const ink=rgb(0,0,0),grey=rgb(.55,.55,.57),soft=rgb(.42,.42,.45),rule=rgb(.78,.78,.8),purple=rgb(.40,.23,.61);
const cash=n=>`£${(Number(n||0)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const num=n=>(Number(n||0)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
// Standard PDF fonts use WinAnsi; keep £ and accents, swap anything else for a safe character.
const clean=v=>String(v??'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/→|↗/g,'>').replace(/[·•]/g,'-').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'?');
function ukDate(v){if(!v)return '';const s=String(v).slice(0,10);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s;}
const TITLES={quote:'QUOTE',invoice:'INVOICE',receipt:'RECEIPT',statement:'SESSION STATEMENT'};

function rowsFor(d,issued){
 if(Array.isArray(d.rows)&&d.rows.length)return d.rows;
 // Older snapshots only stored lines.
 return (d.lines||[]).map(l=>({date:d.kind==='quote'?'':(d.serviceDate||issued),service:d.kind==='quote'?l.label:(d.title||l.label),description:d.kind==='quote'?'':(d.session||''),qty:1,rate:l.pence,amount:l.pence}));
}
function sellerLines(s){
 const lines=[];
 for(const part of String(s.address||'').split(/,|\n/).map(x=>x.trim()).filter(Boolean)){
  if(/silkcrayon/i.test(part)&&lines.length===0)continue; // address already starts with the business name
  lines.push(part);
 }
 if(s.phone)lines.push(s.phone);
 if(s.email)lines.push(s.email);
 return lines;
}

export async function renderDocumentPdf(doc){
 const d=doc.snapshot,pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),logo=await pdf.embedPng(Buffer.from(logoDarkBase64,'base64'));
 const issued=String(doc.created_at||new Date().toISOString()).slice(0,10);
 const pages=[];let page,y;
 const width=(t,size,f=font)=>f.widthOfTextAtSize(clean(t),size);
 const draw=(t,x,yy,size,f=font,color=ink)=>page.drawText(clean(t),{x,y:yy,size,font:f,color});
 const right=(t,xr,yy,size,f=font,color=ink)=>draw(t,xr-width(t,size,f),yy,size,f,color);
 function wrap(t,maxW,size,f=font){
  const out=[];for(const para of clean(t).split('\n')){let line='';for(const word of para.split(/\s+/).filter(Boolean)){let w=word;while(f.widthOfTextAtSize(w,size)>maxW){let i=w.length;while(i>1&&f.widthOfTextAtSize(w.slice(0,i),size)>maxW)i--;if(line){out.push(line);line='';}out.push(w.slice(0,i));w=w.slice(i);}const next=line?`${line} ${w}`:w;if(f.widthOfTextAtSize(next,size)>maxW&&line){out.push(line);line=w;}else line=next;}out.push(line);}
  return out;
 }
 const newPage=()=>{page=pdf.addPage([W,H]);pages.push(page);y=H-40;};
 const COLS={date:24,service:105,desc:217,qtyR:427,rateR:487,amountR:R-2};
 function tableHeader(){
  for(const [label,x,isRight] of [['DATE',COLS.date],['SERVICE',COLS.service],['DESCRIPTION',COLS.desc],['QTY',COLS.qtyR,1],['RATE',COLS.rateR,1],['AMOUNT',COLS.amountR,1]])isRight?right(label,x,y,7.5):draw(label,x,y,7.5);
  y-=24;
 }
 const ensure=(h,withHeader=false)=>{if(y-h<BOTTOM){newPage();draw(`${TITLES[d.kind]||'DOCUMENT'} ${doc.number||''} (continued)`,L,y,8,font,grey);y-=26;if(withHeader)tableHeader();}};

 // ---- Header: business (left) + logo (right)
 newPage();
 const top=H-40;
 draw(d.seller?.name||'Silkcrayon Studios',L,top,9.5,bold);
 let sy=top-14;for(const line of sellerLines(d.seller||{})){draw(line,L,sy,6.8);sy-=11.2;}
 if(d.seller?.details){for(const line of wrap(d.seller.details,300,6.8)){draw(line,L,sy,6.8,font,grey);sy-=11.2;}}
 const lw=192,lh=logo.height*(lw/logo.width);page.drawImage(logo,{x:R-lw,y:top+8-lh,width:lw,height:lh});
 y=Math.min(sy,top-lh)-30;

 // ---- Title + INVOICE TO + meta grid
 draw(TITLES[d.kind]||'DOCUMENT',L,y,11.5);y-=17;
 const blockTop=y;
 draw(d.kind==='quote'?'QUOTE FOR':'INVOICE TO',L,y,7.5,font,grey);let cy=y-12;
 const cust=[d.customer?.name,d.customer?.artist&&d.customer.artist!==d.customer?.name?d.customer.artist:null,...(d.customer?.addressLines||[]),d.customer?.email].filter(Boolean);
 for(const line of cust){for(const w of wrap(line,300,7.5)){draw(w,L,cy,7.5);cy-=12.2;}}
 const meta=[[d.kind==='quote'?'QUOTE':d.kind==='receipt'?'RECEIPT':d.kind==='statement'?'STATEMENT':'INVOICE',doc.number||''],['DATE',ukDate(issued)]];
 if(d.kind==='quote'){if(d.revision)meta.push(['VERSION',String(d.revision)]);}
 else{meta.push(['TERMS',d.terms||(d.kind==='receipt'?'Paid':d.kind==='statement'?'No payment due':'Due on receipt')]);if(d.kind==='invoice')meta.push(['DUE DATE',ukDate(d.dueDate||issued)]);}
 let my=blockTop;for(const [k,v] of meta){draw(k,390,my,7.5,font,grey);draw(v,475,my,7.5);my-=12.2;}
 y=Math.min(cy,my)-20;

 // ---- Line items
 ensure(60);tableHeader();
 for(const r of rowsFor(d,issued)){
  const svc=wrap(r.service||'',105,8),desc=wrap(r.description||'',190,8),h=Math.max(svc.length,desc.length,1)*11+8;
  ensure(h,true);
  if(r.date)draw(ukDate(r.date),COLS.date,y,8);
  svc.forEach((l,i)=>draw(l,COLS.service,y-i*11,8));desc.forEach((l,i)=>draw(l,COLS.desc,y-i*11,8));
  right(String(r.qty??1),COLS.qtyR,y,8);right(num(r.rate??r.amount),COLS.rateR,y,8);right(num(r.amount),COLS.amountR,y,8);
  y-=h;
 }
 ensure(70);
 // dashed separator
 for(let x=L;x<R;x+=5)page.drawLine({start:{x,y:y+6},end:{x:Math.min(x+2.4,R),y:y+6},thickness:.6,color:rule});
 y-=14;

 // ---- Totals (right) + reference / payment details (left)
 const totals=[];
 if(d.kind==='quote')totals.push(['TOTAL',d.total,true]);
 else{
  if(d.received||d.refund||d.kind==='receipt')totals.push(['TOTAL',d.total,false]);
  if(d.received)totals.push(['PAYMENTS RECEIVED',-d.received,false]);
  if(d.refund)totals.push(['REFUNDED',d.refund,false]);
  totals.push([d.kind==='statement'?'AMOUNT DUE':'BALANCE DUE',d.due,true]);
 }
 const leftTop=y;let ty=y;
 for(const [label,value,strong] of totals){
  draw(label,290,ty,strong?8.5:7.5,font,grey);
  const v=value<0?`-${cash(-value)}`:cash(value);
  right(v,COLS.amountR,ty+(strong?-1:0),strong?11.5:8,strong?bold:font);
  ty-=strong?20:14;
 }
 let ly=leftTop;
 const refText=d.invoiceRef||(d.reference?`Ref ${String(d.reference).slice(0,8).toUpperCase()}`:'');
 if(refText){draw(refText,L,ly,6.5,font,grey);ly-=19;}
 const pay=d.payTo;
 if(pay&&d.due>0){
  draw('Please make payment to:',L,ly,6.5,font,grey);ly-=10;
  for(const line of [pay.name,pay.accountNumber,pay.sortCode,pay.reference?`Reference: ${pay.reference}`:null].filter(Boolean)){draw(line,L,ly,6.5,font,grey);ly-=10;}
 }
 if(d.paymentUrl&&d.due>0){
  ly-=6;const label=d.paymentLabel||'Pay online by card';draw(label,L,ly,8,bold,purple);
  const annot=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[L,ly-3,L+width(label,8,bold),ly+9],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(d.paymentUrl)}});
  page.node.set(PDFName.of('Annots'),pdf.context.obj([pdf.context.register(annot)]));ly-=12;
 }
 y=Math.min(ly,ty)-22;

 // ---- Notes (quote scope, booking terms, project summary…)
 for(const s of d.sections||[]){
  if(!s?.text)continue;
  const lines=wrap(s.text,R-L,7.2);
  ensure(26);
  draw(String(s.title||'').toUpperCase(),L,y,7,font,grey);y-=11;
  for(const line of lines){ensure(11);draw(line,L,y,7.2,font,soft);y-=10.4;}
  y-=9;
 }

 // ---- Footer
 pages.forEach((p,i)=>{const t=`Page ${i+1} of ${pages.length}`;p.drawText(t,{x:(W-font.widthOfTextAtSize(t,7.5))/2,y:24,size:7.5,font,color:grey});});
 pdf.setTitle(`${TITLES[d.kind]||'Document'} ${doc.number||''}`.trim());pdf.setAuthor(d.seller?.name||'Silkcrayon Studios');
 return Buffer.from(await pdf.save());
}
