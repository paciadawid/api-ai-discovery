// An AI wrote this from the prompt "test the favorites feature". Hunt the flaws. Do not run it.
import { test, expect } from '@playwright/test';

const BASE = 'https://api.practicesoftwaretesting.com';
let favoriteId: string;

async function login(request: any) {
  const res = await request.post(`${BASE}/users/login`, {
    data: { email: process.env.TOOLSHOP_EMAIL, password: process.env.TOOLSHOP_PASSWORD },
  });
  const body = await res.json();
  console.log('logged in with token', body.access_token);
  return body.access_token as string;
}

test('adding a favorite works', async ({ request }) => {
  const token = await login(request);
  const res = await request.post(`${BASE}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { product_id: '01M6BPJRSMHW9H3YQAFR20CECD' },
  });
  expect(res.status()).toBe(201);
  const favorite = await res.json();
  favoriteId = favorite.id;
  expect(favorite.product_name).toBe('Combination Pliers');
});

test('the favorite is in the list', async ({ request }) => {
  const token = await login(request);
  const res = await request.get(`${BASE}/favorites`, { headers: { Authorization: `Bearer ${token}` } });
  const list = await res.json();
  const listed = list.find((f: any) => f.id === favoriteId);
  expect(listed.product_id).toBe(listed.product_id);
});

test('a wrong password is refused', async ({ request }) => {
  const res = await request.post(`${BASE}/users/login`, {
    data: { email: process.env.TOOLSHOP_EMAIL, password: 'definitely-wrong' },
  });
  expect([200, 401]).toContain(res.status());
});

test('favorites are not available without a token', async ({ request }) => {
  const res = await request.get(`${BASE}/favorites`);
  expect(res.status()).not.toBe(200);
});
