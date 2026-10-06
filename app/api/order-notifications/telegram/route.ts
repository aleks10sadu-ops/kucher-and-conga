import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createOrderNotifications, UUID } from '@/lib/delivery/orderNotifications.mjs';

function authorized(req: NextRequest) {
  const secret=process.env.IIKO_ADMIN_SECRET;
  const provided=req.headers.get('authorization') || '';
  const expected=`Bearer ${secret || ''}`;
  const providedBytes=Buffer.from(provided), expectedBytes=Buffer.from(expected);
  return Boolean(secret && providedBytes.length===expectedBytes.length && timingSafeEqual(providedBytes,expectedBytes));
}

export async function GET(req: NextRequest) {
  if(!authorized(req))return NextResponse.json({ok:false},{status:401});
  try {
    const channel=createOrderNotifications({...process.env,ORDER_TELEGRAM_RELAY_URL:undefined});
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
    const {method,orderId,payload}=await req.json();
    if(!UUID.test(orderId) || !['sendMessage','editMessageText'].includes(method) || typeof payload?.text!=='string') {
      return NextResponse.json({ok:false},{status:400});
    }
    const channel=createOrderNotifications({...process.env,ORDER_TELEGRAM_RELAY_URL:undefined});
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
  } catch {
    return NextResponse.json({ok:false,error:'notification_relay_failed'},{status:502});
  }
}
