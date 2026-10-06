import { test, expect } from '@/fixtures';
import { unknownUser, withWrongPassword } from '@/domain/credentials';
import { cookieNames } from '@/domain/cookies';

test.describe('A visitor with a customer account', () => {
  test('UC-AUTH-02: signing in with valid credentials lands on the requested page with a protected session cookie @needs-account', async ({ visitor, customer }) => {
    const login = await visitor.signsIn(customer, { thenGoTo: '/customer/info' });

    expect(login).toHaveSignedIn();
    expect(login.page.location, 'the visitor is sent where they were heading').toBe('/customer/info');
    expect(login.sessionCookie?.name).toBe(cookieNames.session);
    expect(login.sessionCookie, 'the session cookie is hidden from scripts, lax, and ends with the browser session').toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      persistent: false,
    });

    const account = await visitor.opensAccountPage('/customer/info');

    expect(account.status).toBe(200);
    expect(account.title, 'the account page opens for the signed-in customer').toMatch(/Account/i);
  });

  test('UC-AUTH-07: an unknown user and a wrong password are refused with the same message @needs-account', async ({ visitor, customer }) => {
    const unknownUserAttempt = await visitor.signsIn(unknownUser());
    const wrongPasswordAttempt = await visitor.signsIn(withWrongPassword(customer));

    expect(unknownUserAttempt).toBeRejectedLogin();
    expect(wrongPasswordAttempt).toBeRejectedLogin();
    expect(unknownUserAttempt.errors, 'the store does not reveal which accounts exist').toBe(wrongPasswordAttempt.errors);
  });
});
