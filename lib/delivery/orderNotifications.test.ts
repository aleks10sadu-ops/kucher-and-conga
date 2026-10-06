import { describe, expect, it, vi } from 'vitest';
import { createOrderNotifications, formatSiteOrder, reconciliationUpdate } from './orderNotifications.mjs';
const id = '10236bd8-014b-4020-97e8-92a0b5b507e9';
const env = {NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture',TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_CHAT_ID:'fixture'};
const response = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
describe('durable order notification',()=>{
  it('preserves delivery address details in the fallback card',()=>{
    const text=formatSiteOrder({phone:'fixture',address:'Улица',house:'20',building:'Б',flat:'4',entrance:'2',floor:'3',intercom:'код',items:[],total:0},id);
    for(const detail of ['Дом: 20','Корпус: Б','Квартира: 4','Подъезд: 2','Этаж: 3','Домофон: код']) expect(text).toContain(detail);
  });
  it('links late terminal confirmation to the existing card without another send',()=>{
    const row={id,orig_text:'order',last_status:'CreationError',tg_message_id:700};
    const result={id,creationStatus:'Success',order:{number:123,status:'Unconfirmed'}};
    const update=reconciliationUpdate(row,result);
    expect(update?.text).toContain('№123');
    expect(update?.patch).toMatchObject({number:123,last_status:'Unconfirmed',finalized:false});
    expect(update?.patch).not.toHaveProperty('tg_message_id');
    expect(reconciliationUpdate(row,{...result,id:'different'})).toBeNull();
    expect(reconciliationUpdate(row,{id,creationStatus:'InProgress'})).toBeNull();
  });
  it('keeps a validated full order before the terminal can fail',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response([{id}]));
    const text=formatSiteOrder({fulfillmentType:'pickup',phone:'fixture',items:[{name:'Блюдо',qty:2,price:100,modifiers:[{group:'Соус',option:'Острый'}]}],total:200,allergy:'Орехи'},id);
    const saved=await createOrderNotifications(env,fetcher).reserve(id,text);
    expect(saved.created).toBe(true);expect(text).toContain('Орехи');expect(text).toContain('Острый');
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({id,status:'SitePending',orig_text:text});
  });
  it('does not send again when another worker or webhook has claimed it',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response([]));
    expect(await createOrderNotifications(env,fetcher).notify({id,status:'SitePending',notified_at:'2026-10-06T13:00:00Z',orig_text:'order'})).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('stores the Telegram ID on the same iiko ID for later reconciliation',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response([{id}])).mockResolvedValueOnce(response({ok:true,result:{message_id:700}})).mockResolvedValueOnce(response([{id}]));
    expect(await createOrderNotifications(env,fetcher).notify({id,status:'SitePending',last_status:'CreationError',notified_at:'2026-10-06T13:00:00Z',orig_text:'order'})).toBe(true);
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).text).toContain('НЕ СОЗДАНО');
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toMatchObject({tg_message_id:700,status:'SiteNotified'});
  });
  it('rejects changed payloads reusing the same request ID',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response({code:'23505'},409)).mockResolvedValueOnce(response([{id,orig_text:'old'}]));
    await expect(createOrderNotifications(env,fetcher).reserve(id,'different')).rejects.toThrow('другой заявкой');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
