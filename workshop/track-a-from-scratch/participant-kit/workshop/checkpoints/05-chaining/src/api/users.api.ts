import { Api, reply } from './reply';
import type { Token, User } from '../domain/types';

export class UsersApi extends Api {
  withToken(token: string) {
    return new UsersApi(this.http, token);
  }

  login(email: string, password: string) {
    return this.http.post('/users/login', { data: { email, password } }).then((r) => reply<Token & { error?: string }>(r));
  }

  me() {
    return this.http.get('/users/me', { headers: this.auth() }).then((r) => reply<User>(r));
  }

  refresh() {
    return this.http.get('/users/refresh', { headers: this.auth() }).then((r) => reply<Token>(r));
  }

  logout() {
    return this.http.get('/users/logout', { headers: this.auth() }).then((r) => reply<{ message: string }>(r));
  }
}
