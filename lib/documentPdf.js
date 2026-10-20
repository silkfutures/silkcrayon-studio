import {PDFDocument,rgb,PDFName,PDFString} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {regularFont,boldFont} from './documentFonts.js';
import {logoBase64} from './documentLogo.js';
const cash=n=>`£${(Number(n||0)/100).toFixed(2)}`;
// Built-in PDF fonts use WinAnsi; preserve supported accents and replace unsupported glyphs safely.
const clean=v=>String(v??'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/→|↗/g,'>').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'?');
export async function renderDocumentPdf(doc){
 const d=doc.snapshot,pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(Buffer.from(regularFont,'base64')),bold=await pdf.embedFont(Buffer.from(boldFont,'base64')),logo=await pdf.embedPng(logoBase64);
 const ink=rgb(.10,.08,.14),muted=rgb(.37,.34,.42),purple=rgb(.40,.23,.61);let page,y;
 const add=()=>{page=pdf.addPage([595.28,841.89]);y=785;};
 const ensure=h=>{if(y-h<65){add();text('SILKCRAYON / '+doc.number,10,bold,purple);y-=12;}};
 function text(value,size=10,f=font,color=ink,width=495){
  const chunks=clean(value).split('\n');
  for(const chunk of chunks){let line='';for(const word of chunk.split(/\s+/)){for(const part of splitWord(word,width,size,f)){const next=line?line+' '+part:part;if(f.widthOfTextAtSize(next,size)>width&&line){ensure(size*1.45);page.drawText(line,{x:50,y,size,font:f,color});y-=size*1.45;line=part;}else line=next;}}ensure(size*1.45);page.drawText(line,{x:50,y,size,font:f,color});y-=size*1.45;}
 }
 function splitWord(word,width,size,f){const parts=[];let part='';for(const ch of word){if(f.widthOfTextAtSize(part+ch,size)>width){parts.push(part);part='';}part+=ch;}parts.push(part);return parts;}
 function row(label,value,strong=false){ensure(28);page.drawText(clean(label),{x:50,y,size:11,font:strong?bold:font,color:ink});const v=cash(value);page.drawText(v,{x:545-bold.widthOfTextAtSize(v,12),y,size:12,font:bold,color:strong?purple:ink});y-=26;}
 add();page.drawRectangle({x:0,y:742,width:595.28,height:100,color:rgb(.06,.04,.09)});const scale=165/logo.width;page.drawImage(logo,{x:50,y:770,width:165,height:logo.height*scale});y=714;
 const titles={quote:'QUOTE',invoice:'INVOICE',receipt:'PAID INVOICE / RECEIPT',statement:'SESSION STATEMENT'};
 text(titles[d.kind]||'DOCUMENT',23,bold,purple);text(doc.number,10,bold);text(`Issued: ${new Date(doc.created_at).toISOString().slice(0,10)}${d.revision?` | Quote version ${d.revision}`:''}`,10,font,muted);y-=16;
 text(d.seller.name,11,bold);text(d.seller.address);text(d.seller.email);if(d.seller.details)text(d.seller.details);y-=18;
 text('PREPARED FOR',9,bold,purple);text(d.customer.name,12,bold);if(d.customer.artist&&d.customer.artist!==d.customer.name)text(d.customer.artist);text(d.customer.email);y-=18;
 text(d.title,16,bold);if(d.session)text(d.session,10,font,muted);if(d.status==='cancelled')text('Booking cancelled - payment history shown below.',10,bold);y-=18;
 for(const line of d.lines){ensure(55);text(line.label,11,font,ink,390);const v=cash(line.pence);page.drawText(v,{x:545-bold.widthOfTextAtSize(v,11),y:y+15.95,size:11,font:bold,color:ink});y-=12;}
 ensure(125);page.drawLine({start:{x:50,y},end:{x:545,y},thickness:1,color:rgb(.83,.79,.89)});y-=24;row(d.kind==='quote'?'Total quoted':'Session total',d.total,true);
 if(d.kind!=='quote'){row('Payments received',d.received);if(d.refund){row('Refunded',d.refund);row('Net retained',d.received-d.refund);}row('Balance due',d.due,true);}
 y-=12;
 for(const section of d.sections||[]){ensure(55);text(section.title.toUpperCase(),9,bold,purple);text(section.text,10,font,muted);y-=16;}
 if(d.paymentUrl&&d.due>0){ensure(40);const top=y;text('Pay remaining balance online',11,bold,purple);const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[50,top-4,260,top+13],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(d.paymentUrl)}});page.node.set(PDFName.of('Annots'),pdf.context.obj([pdf.context.register(annotation)]));}
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawText(`Silkcrayon Studios | ${doc.number} | ${i+1} / ${pages.length}`,{x:50,y:32,size:8,font,color:muted});});
 pdf.setTitle(`${titles[d.kind]} ${doc.number}`);pdf.setAuthor(d.seller.name);return Buffer.from(await pdf.save());
}
