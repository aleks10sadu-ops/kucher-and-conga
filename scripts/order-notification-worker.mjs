import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import net from 'node:net';
import dns from 'node:dns';
import { createOrderNotifications, formatSiteOrder, reconciliationUpdate } from '../lib/delivery/orderNotifications.mjs';
if (process.env.ORDER_ENV_FILE) process.loadEnvFile(process.env.ORDER_ENV_FILE);
net.setDefaultAutoSelectFamily(false);
dns.setDefaultResultOrder('ipv4first');
const channel=createOrderNotifications(process.env);
const journalPath=process.env.ORDER_RECEIPTS_FILE || '.codex-tmp/order-notification-receipts.json';
const receipts=existsSync(journalPath)?JSON.parse(readFileSync(journalPath,'utf8')):{};
let cachedToken='', tokenExpires=0, reconciledAt=0;
function saveReceipt(id,messageId){receipts[id]=messageId;writeFileSync(journalPath+'.tmp',JSON.stringify(receipts),{mode:0o600});renameSync(journalPath+'.tmp',journalPath);}
async function notify(row){
  if(receipts[row.id] && !row.tg_message_id){await channel.db(`?id=eq.${row.id}&tg_message_id=is.null`,'PATCH',{tg_message_id:receipts[row.id],status:'SiteNotified'});return;}
  await channel.notify(row,(messageId)=>saveReceipt(row.id,messageId));
}
async function iiko(path,body,token){
  let r;
  try {r=await fetch('https://api-ru.iiko.services'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}
  catch {throw new Error(`iiko ${path}: connection failed`);}
  if(!r.ok)throw new Error(`iiko ${path}: ${r.status}`);return r.json();
}
async function reconcile(rows){
  if(!rows.length)return;
  const appId=process.env.IIKO_APP_ID,secret=process.env.IIKO_APP_SECRET;
  if(Date.now()>=tokenExpires){const auth=await iiko(appId&&secret?'/api/v2/access_token':'/api/1/access_token',appId&&secret?{apiKey:process.env.IIKO_API_LOGIN,appId,clientSecret:secret}:{apiLogin:process.env.IIKO_API_LOGIN});cachedToken=auth.token;tokenExpires=Date.now()+300000;}
  const token=cachedToken;
  for(let i=0;i<rows.length;i+=100){
    const page=rows.slice(i,i+100);
    const data=await iiko('/api/1/deliveries/by_id',{organizationId:process.env.IIKO_ORGANIZATION_ID,orderIds:page.map(r=>r.id)},token);
    for(const result of data.orders||[]){
      const row=page.find(r=>r.id===result.id);if(!row)continue;
      const update=reconciliationUpdate(row,result);
      if(!update)continue;
      if(update.text)await channel.telegram('editMessageText',{order_id:row.id,message_id:row.tg_message_id,text:update.text,disable_web_page_preview:true});
      await channel.db(`?id=eq.${row.id}&last_status=eq.${row.last_status}`,'PATCH',update.patch);
    }
  }
}
async function tick(){
  const rows=await channel.db(`?select=*&finalized=eq.false&orig_text=like.${encodeURIComponent('🟦 Заявка с сайта:*')}&order=notified_at.desc&limit=200`);
  for(const row of rows.filter(r=>!r.tg_message_id)){try{await notify(row);}catch(e){console.error(`notification ${row.id}: ${e.message}`);}}
  if(Date.now()-reconciledAt>=60000){await reconcile(rows.filter(r=>r.tg_message_id&&(['CreationPending','CreationError'].includes(r.last_status)||!r.number)));reconciledAt=Date.now();}
}
if(process.argv[2]==='--recover'){
  process.loadEnvFile('.env.local');
  // Only the two orders explicitly approved by the user, not a broad replay.
  for(const logId of [235,236]){
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r=await fetch(`${base}/rest/v1/site_order_log?id=eq.${logId}&select=*`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('Cannot read approved request');const [log]=await r.json();
    const text=formatSiteOrder({...log,fulfillmentType:/^Самовывоз:/i.test(log.address||'')?'pickup':'delivery',comment:'Восстановлена пропущенная заявка. Данные времени, оплаты и модификаторов в старом журнале не сохранены — уточнить у гостя.'},log.detail);
    const saved=await channel.reserve(log.detail,text);
    if(!saved.row.tg_message_id){await channel.db(`?id=eq.${log.detail}`,'PATCH',{last_status:'CreationError'});await notify({...saved.row,last_status:'CreationError'});}
    const [confirmed]=await channel.db(`?id=eq.${log.detail}&select=id,tg_message_id`);
    console.log(JSON.stringify({logId,orderId:log.detail,messageId:confirmed.tg_message_id}));
  }
}else if(process.argv[2]==='--once'){await tick();console.log('Notification tick completed');}
else {while(true){try{await tick();}catch(e){console.error(`notification tick: ${e.message}`);}await new Promise(r=>setTimeout(r,10000));}}
