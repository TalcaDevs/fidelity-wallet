import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from './compressImage';

const photo = (bytes: number, type = 'image/png') => new File([new Uint8Array(bytes)], 'boleta.png', { type });

function stubCanvas(outputBytes: number) {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
    callback(new Blob([new Uint8Array(outputBytes)], { type: 'image/jpeg' }));
  });
  return drawImage;
}

describe('compressImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('leaves small photos alone', async () => {
    const file = photo(100_000);
    expect(await compressImage(file)).toBe(file);
  });

  it('falls back to the original when the browser cannot decode it', async () => {
    const file = photo(2_000_000);
    expect(await compressImage(file)).toBe(file);
  });

  it('scales a big photo down to 1600 px and sends it as JPEG', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }));
    const drawImage = stubCanvas(300_000);

    const result = await compressImage(photo(6_000_000));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('boleta.jpg');
    expect(result.size).toBe(300_000);
  });

  it('keeps the original if compressing does not make it smaller', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }));
    stubCanvas(900_000);
    const file = photo(800_000);
    expect(await compressImage(file)).toBe(file);
  });
});
