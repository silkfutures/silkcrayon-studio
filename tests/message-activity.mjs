import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
let inserts=[],updates=[],insertFails=false,updateFails=false,sends=0;
const db={from(table){
 assert.equal(table,'message_activity');
 return {
  insert(row){inserts.push(row);return {select(){return {single:async()=>({data:{id:'audit'},error:insertFails?new Error('offline'):null})};}};},
  update(row){updates.push(row);return {eq:async()=>({error:updateFails?new Error('offline'):null})};}
 };
}};
const context=vm.createContext({console,Date});
const mod=new vm.SourceTextModule(await fs.readFile(new URL('../lib/messageActivity.js',import.meta.url),'utf8'),{context});
await mod.link(async spec=>{const values=spec.endsWith('/auth')?{getStaffContext:async()=>({user:{id:'engineer'},profile:{full_name:'Test Engineer',role:'engineer'}})}:{getAdminDb:()=>db};return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v)},{context})});await mod.evaluate();
const send=mod.namespace.deliverWithActivity;
let r=await send({to:'test@example.com',subject:'Quote',source:'Customer quote'},async()=>{sends++;return {ok:true,id:'provider'}});
assert.equal(r.ok,true);assert.equal(inserts[0].actor_role,'engineer');assert.equal(updates.at(-1).status,'sent');
await send({to:'test@example.com'},async()=>({ok:false,error:'provider error'}));assert.equal(updates.at(-1).status,'failed');
await send({to:'test@example.com'},async()=>({ok:false,skipped:true}));assert.equal(updates.at(-1).status,'skipped');
await send({to:'Marketing subscribers'},async()=>({ok:true,scheduled:true}));assert.equal(updates.at(-1).status,'scheduled');
insertFails=true;r=await send({to:'test@example.com'},async()=>{sends++;return {ok:true}});assert.equal(r.ok,false);assert.equal(sends,1);
insertFails=false;updateFails=true;r=await send({to:'test@example.com'},async()=>{sends++;return {ok:true}});assert.equal(r.ok,true);assert.ok(r.auditWarning);assert.equal(sends,2);
for(const file of ['notifications','sms','marketing'])assert.match(await fs.readFile(new URL(`../lib/${file}.js`,import.meta.url),'utf8'),/deliverWithActivity/);
console.log('Message audit tests passed: engineer identity, statuses, audit outages and no resend after provider acceptance.');
