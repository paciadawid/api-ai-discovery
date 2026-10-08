// The ONLY module that reads process.env. Secrets are lazy getters: a slice that needs none never touches them.
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: copy .env.example to .env and fill it in`);
  return value;
};

export const env = {
  get baseUrl(): string {
    return process.env.BASE_URL ?? 'https://bearstore-testsite.smartbear.com';
  },
  get email(): string {
    return required('BEARSTORE_EMAIL');
  },
  get password(): string {
    return required('BEARSTORE_PASSWORD');
  },
};
