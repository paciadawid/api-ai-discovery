import { test, expect } from '../../src/fixtures';

test.describe('auth', () => {
  test('a shopper who logs in gets a bearer token that identifies them on /users/me', async ({ guest, account }) => {
    const login = await guest.users.login(account.email, account.password);

    expect(login.status, 'login with the right password succeeds').toBe(200);
    expect(login.body.token_type.toLowerCase(), 'the token is a bearer token').toBe('bearer');
    expect(login.body.expires_in, 'the token has a positive lifetime').toBeGreaterThan(0);

    const me = await guest.users.withToken(login.body.access_token).me();
    expect(me.status, '/users/me accepts the fresh token').toBe(200);
    // Expected value comes from our input, not from the reply.
    expect(me.body.email, '/users/me returns the user who logged in').toBe(account.email.toLowerCase());

    await guest.users.withToken(login.body.access_token).logout();
  });

  test('login is refused for credentials that do not exist while the real ones are accepted', async ({ guest, account }) => {
    // Never send a wrong password for the REAL account: repeated failures lock it (HTTP 423) and tests cannot undo that.
    const refused = await guest.users.login('nobody-' + Date.now() + '@example.invalid', account.password);
    expect(refused.status, 'login with an unknown e-mail is refused').toBe(401);
    // Undocumented shape: login errors use "error", the rest of the API uses "message".
    expect(refused.body, 'the refusal says why, without a token').toEqual({ error: 'Unauthorized' });

    // Positive control: same call, real account.
    const right = await guest.users.login(account.email, account.password);
    expect(right.status, 'the real account logs in with the same password').toBe(200);
    await guest.users.withToken(right.body.access_token).logout();
  });

  test('after logout the same token no longer opens /users/me', async ({ guest, account }) => {
    const login = await guest.users.login(account.email, account.password);
    const client = guest.users.withToken(login.body.access_token);
    expect((await client.me()).status, 'precondition: the token works before logout').toBe(200);

    const logout = await client.logout();
    expect(logout.status, 'logout succeeds').toBe(200);
    expect(logout.body.message, 'logout confirms it').toBe('Successfully logged out');

    expect((await client.me()).status, 'the logged-out token is rejected').toBe(401);
  });

  test('refreshing issues a working token and revokes the old one', async ({ guest, account }) => {
    const login = await guest.users.login(account.email, account.password);
    const oldClient = guest.users.withToken(login.body.access_token);
    expect((await oldClient.me()).status, 'precondition: the original token works').toBe(200);

    const refreshed = await oldClient.refresh();
    expect(refreshed.status, 'refresh succeeds with a valid token').toBe(200);
    expect(refreshed.body.access_token, 'refresh returns a different token').not.toBe(login.body.access_token);

    const newClient = guest.users.withToken(refreshed.body.access_token);
    const me = await newClient.me();
    expect(me.status, 'the new token works').toBe(200);
    expect(me.body.email, 'the new token belongs to the same user').toBe(account.email.toLowerCase());
    expect((await oldClient.me()).status, 'the old token is revoked by the refresh').toBe(401);

    await newClient.logout();
  });
});
