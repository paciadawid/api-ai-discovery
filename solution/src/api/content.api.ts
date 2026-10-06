import type { HttpClient, Reply } from './http-client';

export interface ContactFormFields {
  readonly fullName: string;
  readonly email: string;
  readonly enquiry: string;
}

export class ContentApi {
  constructor(private readonly http: HttpClient) {}

  sendContactForm(fields: ContactFormFields): Promise<Reply<string>> {
    return this.http.postForm('/contactus', { FullName: fields.fullName, Email: fields.email, Enquiry: fields.enquiry });
  }
}
