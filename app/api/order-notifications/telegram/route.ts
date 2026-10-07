import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createOrderNotifications, relayCredential, UUID, SITE_ORDER_QUEUE_FILTER, isSiteOrderCard, withOrderNumber } from '@/lib/delivery/orderNotifications.mjs';

function authorized(req: NextRequest) {
  const secret=relayCredential(process.env);
  const provided=req.headers.get('authorization') || '';
  const expected=`Bearer ${secret || ''}`;
  const providedBytes=Buffer.from(provided), expectedBytes=Buffer.from(expected);
  return Boolean(secret && providedBytes.length===expectedBytes.length && timingSafeEqual(providedBytes,expectedBytes));
}

export async function GET(req: NextRequest) {
  if(!authorized(req))return NextResponse.json({ok:false},{status:401});
  try {
    const channel=createOrderNotifications({...process.env,ORDER_TELEGRAM_RELAY_URL:undefined,ORDER_STORAGE_RELAY_URL:undefined});
    await channel.telegram('getMe',{});
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({ok:false},{status:502});
  }
}

export async function POST(req: NextRequest) {
  if(!authorized(req)) {
    return NextResponse.json({ok:false},{status:401});
  }
  try {
    const input=await req.json();
    const {method,orderId,payload}=input;
    const channel=createOrderNotifications({...process.env,ORDER_TELEGRAM_RELAY_URL:undefined,ORDER_STORAGE_RELAY_URL:undefined});
    if(method==='storage') {
      const {query,operation,body}=input;
      if(typeof query!=='string' || !query.startsWith('?') || !['GET','PATCH'].includes(operation)) return NextResponse.json({ok:false},{status:400});
      const params=new URLSearchParams(query.slice(1));
      const allowed=['id','select','finalized','orig_text','or','order','limit','tg_message_id','status','notified_at','last_status','number'];
      if(Array.from(params.keys()).some(key=>!allowed.includes(key))) return NextResponse.json({ok:false},{status:400});
      const id=params.get('id');
      const oneOrder=id?.startsWith('eq.') && UUID.test(id.slice(3));
      const queueRead=operation==='GET' && !id && params.get('limit')==='200' && (params.get('or')===SITE_ORDER_QUEUE_FILTER || params.get('finalized')==='eq.false' && params.get('orig_text')==='like.🟦 Заявка с сайта:*');
      if(!oneOrder && !queueRead) return NextResponse.json({ok:false},{status:400});
      if(operation==='PATCH') {
        const keys=['tg_message_id','status','notified_at','last_status','number','finalized','orig_text'];
        if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(key=>!keys.includes(key))) return NextResponse.json({ok:false},{status:400});
        if('orig_text' in body && (!Number.isSafeInteger(body.number) || body.number<=0 || typeof body.orig_text!=='string')) return NextResponse.json({ok:false},{status:400});
        const [row]=await channel.db(`?id=eq.${id!.slice(3)}&select=orig_text`);
        if(!isSiteOrderCard(row?.orig_text)) return NextResponse.json({ok:false},{status:409});
        if('orig_text' in body && body.orig_text!==withOrderNumber(row.orig_text,body.number)) return NextResponse.json({ok:false},{status:400});
      }
      return NextResponse.json(await channel.db(query,operation,body),{headers:{'Cache-Control':'no-store'}});
    }
    if(!UUID.test(orderId) || !['sendMessage','editMessageText'].includes(method) || typeof payload?.text!=='string') {
      return NextResponse.json({ok:false},{status:400});
    }
    const [row]=await channel.db(`?id=eq.${orderId}&select=*`);
    // This endpoint can only send or edit an already validated, durable order
    // card in the configured delivery chat. It cannot target arbitrary chats.
    if(!row?.orig_text || !payload.text.startsWith(`${row.orig_text}\n\n`) || payload.text.length>4000 ||
      (method==='sendMessage' && (row.status!=='SiteSending' || row.tg_message_id)) ||
      (method==='editMessageText' && (!row.tg_message_id || payload.message_id!==row.tg_message_id))) {
      return NextResponse.json({ok:false},{status:409});
    }
    const result=await channel.telegram(method,{text:payload.text,disable_web_page_preview:true,...(method==='editMessageText'?{message_id:row.tg_message_id}:{})});
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    return NextResponse.json({ok:false,error:'notification_relay_failed',...(error instanceof Error && 'code' in error ? {code:error.code} : {})},{status:502});
  }
}
