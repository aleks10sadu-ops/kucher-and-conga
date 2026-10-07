import { describe, expect, it, vi } from 'vitest';
import { createOrderNotifications, formatSiteOrder, reconciliationUpdate } from './orderNotifications.mjs';
const id = '10236bd8-014b-4020-97e8-92a0b5b507e9';
const env = {NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture',TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_CHAT_ID:'fixture'};
const response = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
describe('durable order notification',()=>{
  it('restores the compact delivery card and keeps the terminal comment verbatim',()=>{
    const comment='ЗАКАЗ С САЙТА\nСпособ получения: Доставка\nОплата: картой при получении\nКомментарий гостя: Позвонить\n⚠️ Орехи';
    const text=formatSiteOrder({name:'Гость',phone:'+79990000000',address:'Улица, д. 31',house:'31',entrance:'2',floor:'3',deliveryTime:'custom',deliveryTimeCustom:'2026-10-07T19:30',orderComment:comment,items:[{name:'Блюдо',qty:2,price:100,modifiers:[{group:'Соус',option:'Острый'},{group:'Хлеб',option:'Без хлеба'}]}],deliveryPrice:300,total:500},id);
    expect(text).toBe('🚚 Новая доставка\nИмя: Гость\nТелефон: +79990000000\nАдрес: Улица, д. 31, подъезд 2, этаж 3\nКо времени: 07.10.2026 в 19:30\nИсточник: Сайт\n\nПозиции:\n• Блюдо × 2 = 200 ₽\n    – Острый\nДоставка: 300 ₽\nИтого: 500 ₽\n\nКомментарий:\n'+comment);
    expect(text).not.toContain(id);
  });
  it('distinguishes pickup and keeps cash change and guest instructions in the comment',()=>{
    const text=formatSiteOrder({fulfillmentType:'pickup',name:'Гость',phone:'fixture',orderComment:'ЗАКАЗ С САЙТА\nСпособ получения: Самовывоз\nОплата: наличными (сдача с 1000 ₽)\nКомментарий гостя: Без лука',items:[],total:900},id);
    expect(text).toMatch(/^🛍 Новый самовывоз\n/);
    expect(text).toContain('Забрать: Дмитров, Промышленная улица, 20Б');
    expect(text).toContain('сдача с 1000 ₽');expect(text).toContain('Без лука');
    expect(text).not.toContain('ID:');
  });
  it('adds the terminal number to the same card and retains comments after a late closed order',()=>{
    const orig_text='🚚 Новая доставка\nИсточник: Сайт\n\nКомментарий:\nНе звонить';
    const update=reconciliationUpdate({id,orig_text,last_status:'Closed',number:0,tg_message_id:700},{id,creationStatus:'Success',order:{number:123,status:'Closed'}});
    expect(update?.patch.orig_text).toBe(orig_text.replace('Новая доставка','Новая доставка №123'));
    expect(update?.text).toBe(update?.patch.orig_text+'\n\n✅ ЗАКРЫТ');
  });
  it('uses the authenticated storage relay when the worker network cannot reach the database',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response([{id}]));
    await createOrderNotifications({...env,ORDER_STORAGE_RELAY_URL:'https://example.com/relay',IIKO_ADMIN_SECRET:'fixture'},fetcher).db('?id=eq.'+id);
    expect(fetcher.mock.calls[0][0]).toBe('https://example.com/relay');
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({method:'storage',operation:'GET',query:'?id=eq.'+id});
  });
  it('allows reconciliation to finish when Telegram already has the same edit',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response({ok:false,description:'Bad Request: message is not modified'},400));
    await expect(createOrderNotifications(env,fetcher).telegram('editMessageText',{message_id:700,text:'same'})).resolves.toMatchObject({ok:true});
  });
  it('preserves delivery address details in the fallback card',()=>{
    const text=formatSiteOrder({phone:'fixture',address:'Улица',house:'20',building:'Б',flat:'4',entrance:'2',floor:'3',intercom:'код',items:[],total:0},id);
    for(const detail of ['д. 20','корп. Б','кв. 4','подъезд 2','этаж 3','домофон код']) expect(text).toContain(detail);
  });
  it('links late terminal confirmation to the existing card without another send',()=>{
    const row={id,orig_text:'🟦 Заявка с сайта: Доставка\nID: '+id,last_status:'CreationError',tg_message_id:700};
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
