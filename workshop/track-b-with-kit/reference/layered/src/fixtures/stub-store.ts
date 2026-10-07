import { Shopper } from '@/actors/shopper';
import type { Reply } from '@/api/http-client';
import type { StoreApi } from '@/api/store-api';
import type { CartActionBody, Counters } from '@/api/types';

/** A cartsummary reply as the store would send it. */
export interface CounterReply {
  status: number;
  body: Counters;
}

/** What else the stubbed store can be told, for the actor behaviours that read the cart page or delete lines. */
export interface StubScene {
  /** The reply of GET /cart (status and HTML body). */
  cartPage?: Reply<string>;
  /** Every line id passed to `deleteLine` is pushed here, so a test can see what the store was asked to delete. */
  deletedLines?: number[];
}

/**
 * A Shopper wired to a store that only answers what it is told: no network, for offline unit tests of the actor.
 * `reply` answers cartsummary; `scene` adds the cart page reply and a recording `deleteLine` (which always answers success).
 */
export function shopperSeeing(reply: CounterReply, scene: StubScene = {}): Shopper {
  const store = {
    cart: {
      counters: async () => reply,
      cartPage: async () => scene.cartPage ?? { status: 404, body: '' },
      deleteLine: async (lineId: number): Promise<Reply<CartActionBody>> => {
        scene.deletedLines?.push(lineId);
        return { status: 200, body: { success: true } };
      },
    },
  };
  return new Shopper(store as unknown as StoreApi);
}
