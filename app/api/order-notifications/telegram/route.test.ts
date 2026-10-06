import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks=vi.hoisted(()=>({db:vi.fn(),telegram:vi.fn()}));
vi.mock('@/lib/delivery/orderNotifications.mjs',async original=>({...await original<typeof import('@/lib/delivery/orderNotifications.mjs')>(),createOrderNotifications:()=>mocks}));
import { GET, POST } from './route';
import { relayCredential } from '@/lib/delivery/orderNotifications.mjs';
const id='10236bd8-014b-4020-97e8-92a0b5b507e9';
const req=(auth:string,payload:unknown)=>new NextRequest('https://example.com/api/order-notifications/telegram',{method:'POST',headers:{Authorization:auth==='Bearer fixture'?'Bearer '+relayCredential({SUPABASE_SERVICE_ROLE_KEY:'fixture'}):auth,'Content-Type':'application/json'},body:JSON.stringify(payload)});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('checks Telegram connectivity without sending a message',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  mocks.telegram.mockResolvedValue({ok:true,result:{id:123}});
  expect((await GET(new NextRequest('https://example.com/api/order-notifications/telegram',{headers:{Authorization:'Bearer '+relayCredential({SUPABASE_SERVICE_ROLE_KEY:'fixture'})}}))).status).toBe(200);
  expect(mocks.telegram).toHaveBeenCalledWith('getMe',{});
});
it('relays the bounded pending queue query',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  mocks.db.mockResolvedValue([{id,status:'SitePending'}]);
  const query='?select=*&finalized=eq.false&orig_text=like.'+encodeURIComponent('🟦 Заявка с сайта:*')+'&order=notified_at.desc&limit=200';
  const response=await POST(req('Bearer fixture',{method:'storage',query,operation:'GET'}));
  expect(response.status).toBe(200);
  expect(mocks.db).toHaveBeenCalledWith(query,'GET',undefined);
});
it('rejects unrestricted storage operations and message text rewrites',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  expect((await POST(req('Bearer fixture',{method:'storage',query:'?select=*',operation:'GET'}))).status).toBe(400);
  expect((await POST(req('Bearer fixture',{method:'storage',query:'?id=eq.'+id,operation:'DELETE'}))).status).toBe(400);
  expect((await POST(req('Bearer fixture',{method:'storage',query:'?id=eq.'+id,operation:'PATCH',body:{orig_text:'tampered'}}))).status).toBe(400);
  expect(mocks.db).not.toHaveBeenCalled();
});
it('updates only metadata for an existing website card',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  mocks.db.mockResolvedValueOnce([{orig_text:'🟦 Заявка с сайта: Доставка'}]).mockResolvedValueOnce([{id}]);
  const query='?id=eq.'+id+'&status=eq.SitePending';
  const body={status:'SiteSending'};
  expect((await POST(req('Bearer fixture',{method:'storage',query,operation:'PATCH',body}))).status).toBe(200);
  expect(mocks.db).toHaveBeenLastCalledWith(query,'PATCH',body);
});
it('requires the existing server secret before reading or sending anything',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  expect((await POST(req('Bearer wrong',{}))).status).toBe(401);
  expect(mocks.db).not.toHaveBeenCalled();expect(mocks.telegram).not.toHaveBeenCalled();
});
it('relays only the claimed stored card to the configured chat',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  mocks.db.mockResolvedValue([{orig_text:'validated card',status:'SiteSending',tg_message_id:null}]);
  mocks.telegram.mockResolvedValue({ok:true,result:{message_id:700}});
  expect((await POST(req('Bearer fixture',{method:'sendMessage',orderId:id,payload:{text:'validated card\n\nterminal offline',chat_id:'wrong-chat'}}))).status).toBe(200);
  expect(mocks.telegram).toHaveBeenCalledWith('sendMessage',{text:'validated card\n\nterminal offline',disable_web_page_preview:true});
});
it('rejects a card already sent and an attempt to edit a different message',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');
  mocks.db.mockResolvedValue([{orig_text:'validated card',status:'SiteNotified',tg_message_id:700}]);
  expect((await POST(req('Bearer fixture',{method:'sendMessage',orderId:id,payload:{text:'validated card\n\nfooter'}}))).status).toBe(409);
  expect((await POST(req('Bearer fixture',{method:'editMessageText',orderId:id,payload:{text:'validated card\n\nfooter',message_id:701}}))).status).toBe(409);
  expect(mocks.telegram).not.toHaveBeenCalled();
});
