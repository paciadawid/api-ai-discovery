import { test, expect } from '@/fixtures';
import { serverMessages } from '@/domain/server-messages';

test.describe('A visitor using the contact form', () => {
  test('UC-CONTENT-16: sending it with every field empty is refused and names the required fields', async ({ visitor }) => {
    const result = await visitor.sendsContactForm({ fullName: '', email: '', enquiry: '' });

    expect(result.page, 'the form is shown again, not a redirect').toBeAnHtmlPage();
    expect(result.errors).toContain(serverMessages.contactEmailRequired);
    expect(result.errors).toContain(serverMessages.contactEnquiryRequired);
    expect(result.confirmsDelivery, 'nothing is reported as sent').toBe(false);
    expect(result.formShownAgain).toBe(true);
  });
});
