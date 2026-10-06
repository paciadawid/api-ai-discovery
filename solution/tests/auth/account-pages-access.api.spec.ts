import { test, expect } from '@/fixtures';
import { accountPages } from '@/domain/account-pages';

test.describe('An anonymous visitor', () => {
  for (const path of accountPages) {
    test(`UC-AUTH-22: opening ${path} sends them to the login page and back afterwards`, async ({ visitor }) => {
      const page = await visitor.opensAccountPage(path);

      expect(page).toRedirectToLoginThenBackTo(path);
    });
  }
});
