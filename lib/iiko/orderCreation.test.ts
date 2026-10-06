import { afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('./client',()=>({iikoPost:mocks.post}));
vi.mock('./auth',()=>({getToken:async()=>'fixture'}));
vi.mock('./config',()=>({getIikoConfig:()=>({organizationId:'fixture'})}));
vi.mock('./orgSettings',()=>({getAddressFormat:async()=>'legacy'}));
import { createSiteOrder } from './orders';
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
it('does not report successful creation when the terminal is still offline after polling',async()=>{
  vi.useFakeTimers();vi.stubEnv('IIKO_TERMINAL_GROUP_ID','fixture');
  mocks.post.mockResolvedValueOnce({orderInfo:{id:'10236bd8-014b-4020-97e8-92a0b5b507e9',creationStatus:'InProgress'}}).mockResolvedValue({orders:[{creationStatus:'InProgress'}]});
  const pending=createSiteOrder({fulfillmentType:'pickup',phone:'fixture',customerName:'fixture',comment:'fixture',items:[]});
  await vi.runAllTimersAsync();
  expect(await pending).toMatchObject({creationStatus:'InProgress'});
});
