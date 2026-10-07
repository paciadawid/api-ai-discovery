/** The only module allowed to read `process.env`. This slice needs no credentials. */
export const env = {
  get baseUrl(): string {
    return process.env.BASE_URL ?? 'https://bearstore-testsite.smartbear.com';
  },
};
