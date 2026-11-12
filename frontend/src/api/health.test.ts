import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './health';

afterEach(() => vi.unstubAllGlobals());

describe('fetchHealth', () => {
  it('returns the parsed payload on success', async () => {
    const payload = { status: 'ok', version: '0.1.0', cache_backend: 'LocMemCache' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    await expect(fetchHealth()).resolves.toEqual(payload);
  });

  it('throws a readable error on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(fetchHealth()).rejects.toThrow('status 503');
  });
});
