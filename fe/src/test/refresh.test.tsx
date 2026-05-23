import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axiosInstance, updateAccessToken } from '@/lib/axios';
import { server } from './server';
import { http, HttpResponse } from 'msw';

describe('Axios Interceptor Refresh Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    updateAccessToken(null, false);
    vi.clearAllMocks();
  });

  it('should refresh token on 401 and retry request', async () => {
    localStorage.setItem('refresh_token', 'valid-refresh-token');
    
    let callCount = 0;

    // Mock a protected endpoint that fails once with 401 then succeeds
    server.use(
      http.get('*/protected-resource', () => {
        callCount++;
        if (callCount === 1) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ data: 'success' });
      })
    );

    const result = await axiosInstance({ url: '/protected-resource', method: 'GET' });

    expect(result).toEqual({ data: 'success' });
    expect(callCount).toBe(2);
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
  });

  it('should redirect to login if refresh fails', async () => {
    localStorage.setItem('refresh_token', 'invalid-refresh-token');
    
    // Mock refresh endpoint to fail
    server.use(
      http.post('*/auth/refresh', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    server.use(
      http.get('*/protected-resource', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    // Mock window.location.href
    const mockLocation = { href: 'http://localhost' };
    vi.stubGlobal('location', mockLocation);

    try {
      await axiosInstance({ url: '/protected-resource', method: 'GET' });
    } catch {
      // Expected to fail
    }

    expect(mockLocation.href).toBe('/login');
    expect(localStorage.getItem('refresh_token')).toBeNull();
    
    vi.unstubAllGlobals();
  });
});
