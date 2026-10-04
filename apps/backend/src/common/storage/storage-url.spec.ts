import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { internalStorageUrl, publicStorageUrl } from './storage-url.js';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService;
const local = 'http://127.0.0.1:54321/storage/v1/object/public/card-assets/b/logo.png';
const tunnel = 'https://x.trycloudflare.com/storage/v1/object/public/card-assets/b/logo.png';

describe('storage urls', () => {
  const both = config({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_PUBLIC_URL: 'https://x.trycloudflare.com/' });

  it('publishes internal URLs with the public origin, and back', () => {
    expect(publicStorageUrl(local, both)).toBe(tunnel);
    expect(internalStorageUrl(tunnel, both)).toBe(local);
  });

  it('leaves URLs alone without SUPABASE_PUBLIC_URL or from another origin', () => {
    expect(publicStorageUrl(local, config({ SUPABASE_URL: 'http://127.0.0.1:54321' }))).toBe(local);
    expect(publicStorageUrl('https://evil.example/x.png', both)).toBe('https://evil.example/x.png');
  });
});
