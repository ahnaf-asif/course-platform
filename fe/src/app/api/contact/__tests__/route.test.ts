import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('/api/contact Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  it('validates name length (< 2 chars)', async () => {
    const req = createRequest({
      name: 'A',
      email: 'valid@example.com',
      subject: 'Question',
      message: 'This is a long enough message.',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('নাম কমপক্ষে ২ অক্ষরের');
  });

  it('validates invalid email format', async () => {
    const req = createRequest({
      name: 'Rahim',
      email: 'not-an-email',
      subject: 'Question',
      message: 'This is a long enough message.',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('সঠিক ইমেইল');
  });

  it('validates subject length (< 3 chars)', async () => {
    const req = createRequest({
      name: 'Rahim',
      email: 'rahim@example.com',
      subject: 'Hi',
      message: 'This is a long enough message.',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('বিষয় কমপক্ষে ৩ অক্ষরের');
  });

  it('validates message length (< 10 chars)', async () => {
    const req = createRequest({
      name: 'Rahim',
      email: 'rahim@example.com',
      subject: 'Question',
      message: 'Short',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain('বার্তা কমপক্ষে ১০ অক্ষরের');
  });

  it('operates in simulation mode when webhook URL is placeholder', async () => {
    process.env.DISCORD_WEBHOOK_URL =
      'https://discord.com/api/webhooks/placeholder_id/placeholder_token';

    const req = createRequest({
      name: 'Rahim Khan',
      email: 'rahim@example.com',
      subject: 'Course inquiry',
      message: 'I would like to know more about the 47th BCS preparation batch.',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('সিমুলেশন মোড');
  });

  it('dispatches to real Discord webhook when valid URL is set', async () => {
    process.env.DISCORD_WEBHOOK_URL =
      'https://discord.com/api/webhooks/1122334455/real_token_secret';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    });
    global.fetch = mockFetch;

    const req = createRequest({
      name: 'Rahim Khan',
      email: 'rahim@example.com',
      subject: 'Course inquiry',
      message: 'I would like to know more about the 47th BCS preparation batch.',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/1122334455/real_token_secret',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('includes optional phone number in Discord payload when provided', async () => {
    process.env.DISCORD_WEBHOOK_URL =
      'https://discord.com/api/webhooks/1122334455/real_token_secret';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    });
    global.fetch = mockFetch;

    const req = createRequest({
      name: 'Rahim Khan',
      email: 'rahim@example.com',
      phone: '+880 1711 000000',
      subject: 'Course inquiry',
      message: 'I would like to know more about the 47th BCS preparation batch.',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/1122334455/real_token_secret',
      expect.objectContaining({
        body: expect.stringContaining('+880 1711 000000'),
      })
    );
  });

  it('returns 502 when Discord webhook returns error', async () => {
    process.env.DISCORD_WEBHOOK_URL =
      'https://discord.com/api/webhooks/1122334455/real_token_secret';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Discord Internal Server Error',
    });
    global.fetch = mockFetch;

    const req = createRequest({
      name: 'Rahim Khan',
      email: 'rahim@example.com',
      subject: 'Course inquiry',
      message: 'I would like to know more about the 47th BCS preparation batch.',
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.message).toContain('ডিসকর্ড নোটিফিকেশন পাঠাতে ব্যর্থ');
  });
});
