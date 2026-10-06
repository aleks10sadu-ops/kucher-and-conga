import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks=vi.hoisted(()=>({db:vi.fn(),telegram:vi.fn()}));
vi.mock('@/lib/delivery/orderNotifications.mjs',async original=>({...await original<typeof import('@/lib/delivery/orderNotifications.mjs')>(),createOrderNotifications:()=>mocks}));
import { GET, POST } from './route';
const id='10236bd8-014b-4020-97e8-92a0b5b507e9';
const req=(auth:string,payload:unknown)=>new NextRequest('https://example.com/api/order-notifications/telegram',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(payload)});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('checks Telegram connectivity without sending a message',async()=>{
  vi.stubEnv('IIKO_ADMIN_SECRET','fixture');
  mocks.telegram.mockResolvedValue({ok:true,result:{id:123}});
  expect((await GET(new NextRequest('https://example.com/api/order-notifications/telegram',{headers:{Authorization:'Bearer fixture'}}))).status).toBe(200);
  expect(mocks.telegram).toHaveBeenCalledWith('getMe',{});
});
it('requires the existing server secret before reading or sending anything',async()=>{
  vi.stubEnv('IIKO_ADMIN_SECRET','fixture');
  expect((await POST(req('Bearer wrong',{}))).status).toBe(401);
  expect(mocks.db).not.toHaveBeenCalled();expect(mocks.telegram).not.toHaveBeenCalled();
});
it('relays only the claimed stored card to the configured chat',async()=>{
  vi.stubEnv('IIKO_ADMIN_SECRET','fixture');
  mocks.db.mockResolvedValue([{orig_text:'validated card',status:'SiteSending',tg_message_id:null}]);
  mocks.telegram.mockResolvedValue({ok:true,result:{message_id:700}});
  expect((await POST(req('Bearer fixture',{method:'sendMessage',orderId:id,payload:{text:'validated card\n\nterminal offline',chat_id:'wrong-chat'}}))).status).toBe(200);
  expect(mocks.telegram).toHaveBeenCalledWith('sendMessage',{text:'validated card\n\nterminal offline',disable_web_page_preview:true});
});
it('rejects a card already sent and an attempt to edit a different message',async()=>{
  vi.stubEnv('IIKO_ADMIN_SECRET','fixture');
  mocks.db.mockResolvedValue([{orig_text:'validated card',status:'SiteNotified',tg_message_id:700}]);
  expect((await POST(req('Bearer fixture',{method:'sendMessage',orderId:id,payload:{text:'validated card\n\nfooter'}}))).status).toBe(409);
  expect((await POST(req('Bearer fixture',{method:'editMessageText',orderId:id,payload:{text:'validated card\n\nfooter',message_id:701}}))).status).toBe(409);
  expect(mocks.telegram).not.toHaveBeenCalled();
});
