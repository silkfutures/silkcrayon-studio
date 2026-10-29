import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as community from '../lib/community.js';
assert.equal(community.normalizeCommunityPhone('07700 900123'),'+447700900123');
assert.equal(community.normalizeCommunityPhone('0034 612 345 678'),'+34612345678');
for(const value of ['',null,'123','javascript:1234567','++447700900123'])assert.equal(community.normalizeCommunityPhone(value),null);
assert.equal(community.filterCommunity([{name:'Artist',phone:'+447700900123',genres:['Pop'],interests:['Silk Sessions'],availability:['Weekday evenings']}],{query:'900123',genre:'Pop',availability:'Weekday evenings',status:'new'}).length,1);
let staff=null,saved=null,dbError=null,limited=false;
const db={from(){const q={insert:async row=>{saved=row;return {error:dbError}},update:row=>{saved=row;return q},eq:()=>q,select:()=>q,maybeSingle:async()=>({data:{id:'12345678-1234-1234-1234-123456789abc',...saved},error:dbError})};return q}};
async function route(path){const context=vm.createContext({console,URL,Date});const mod=new vm.SourceTextModule(readFileSync(path,'utf8'),{context});await mod.link(async spec=>{const bindings=spec==='next/server'?{NextResponse:{json:(data,opts={})=>({data,status:opts.status||200})}}:spec.endsWith('/auth')?{getStaffContext:async()=>staff}:spec.endsWith('/supabase')?{getAdminDb:()=>db}:spec.endsWith('/rateLimit')?{rateLimit:async()=>!limited}:community;const m=new vm.SyntheticModule(Object.keys(bindings),function(){for(const[k,v]of Object.entries(bindings))this.setExport(k,v)},{context});await m.link(()=>{});await m.evaluate();return m});await mod.evaluate();return mod.namespace;}
const pub=await route('app/api/community-interest/route.js');
const body={name:'Test',email:'TEST@example.com',phone:'07700 900123',role:'Producer',genres:['Pop'],interests:['Silk Sessions'],availability:['Weekday evenings'],consent:false};
const req=b=>({text:async()=>JSON.stringify(b),json:async()=>b,headers:new Headers({origin:'https://studio.test'}),url:'https://studio.test/api/admin/community'});
assert.equal((await pub.POST(req({...body,phone:'123'}))).status,400);assert.equal(saved,null);
assert.equal((await pub.POST(req({name:'Test',email:'test@example.com',interests:['Silk Sessions']}))).status,200);assert.equal(saved.phone,null);assert.equal(saved.role,null);assert.equal(saved.genres.length,0);assert.equal(saved.availability.length,0);
for(const role of ['Instrumentalist / Musician','Videographer / Filmmaker','Photographer','Content creator']){assert.equal((await pub.POST(req({...body,role,instruments:'Guitar',pronouns:'they/them'}))).status,200);assert.equal(saved.role,role);assert.equal(saved.instruments,'Guitar');assert.equal(saved.pronouns,'they/them');}
assert.equal((await pub.POST(req({...body,accessNeeds:'Quiet space'}))).status,400);
assert.equal((await pub.POST(req({...body,accessNeeds:'Quiet space',accessConsent:true}))).status,200);assert.equal(saved.access_needs,'Quiet space');assert.ok(saved.access_consent_at);
assert.equal((await pub.POST(req({...body,interests:[]}))).status,400);
assert.equal((await pub.POST(req({...body,musicLink:'javascript:alert(1)'}))).status,400);
assert.equal((await pub.POST(req(body))).status,200);assert.equal(saved.phone,'+447700900123');assert.equal(saved.email,'test@example.com');assert.equal(saved.marketing_consent,false);
limited=true;assert.equal((await pub.POST(req(body))).status,429);limited=false;
dbError={code:'test'};assert.equal((await pub.POST(req(body))).status,500);dbError=null;
const admin=await route('app/api/admin/community/route.js');const update={id:'12345678-1234-1234-1234-123456789abc',status:'contacted',notes:'Call next week'};
assert.equal((await admin.PATCH(req(update))).status,403);staff={profile:{role:'engineer'}};assert.equal((await admin.PATCH(req(update))).status,403);staff={profile:{role:'owner'}};
assert.equal((await admin.PATCH(req({...update,status:'bad'}))).status,400);assert.equal((await admin.PATCH(req(update))).status,200);assert.equal(saved.status,'contacted');assert.equal(saved.notes,'Call next week');
console.log('Community: phone validation, filtering, persisted fields, opt-in, rate limits, DB errors and owner-only updates passed.');
