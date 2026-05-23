import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('*/auth/login', () => {
    return HttpResponse.json({
      access_token: 'fake-access-token',
      refresh_token: 'fake-refresh-token',
      expires_in: 3600,
    });
  }),
  http.post('*/auth/register', () => {
    return HttpResponse.json({
      id: '123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'USER',
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),
  http.post('*/auth/refresh', () => {
    return HttpResponse.json({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    });
  }),
  http.post('*/auth/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const server = setupServer(...handlers);
