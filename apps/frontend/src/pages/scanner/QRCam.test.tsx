import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { QRCam } from './QRCam';

const { MockHtml5Qrcode } = vi.hoisted(() => {
  class MockHtml5Qrcode {
    static instances: MockHtml5Qrcode[] = [];
    isScanning = false;

    constructor() {
      MockHtml5Qrcode.instances.push(this);
    }

    async start() {
      this.isScanning = true;
      return Promise.resolve();
    }

    async stop() {
      this.isScanning = false;
      return Promise.resolve();
    }

    clear() {}
  }
  return { MockHtml5Qrcode };
});

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: MockHtml5Qrcode,
  Html5QrcodeSupportedFormats: { QR_CODE: 'QR_CODE' }
}));

describe('QRCam', () => {
  beforeEach(() => {
    MockHtml5Qrcode.instances = [];
  });
  afterEach(cleanup);

  it('respeta la cola de ciclo de vida (start/stop) de la cámara', async () => {
    const { unmount } = render(<QRCam isActive={true} onScanSuccess={() => {}} />);
    
    await waitFor(() => {
      expect(MockHtml5Qrcode.instances.length).toBe(1);
      expect(MockHtml5Qrcode.instances[0].isScanning).toBe(true);
    });

    unmount();

    await waitFor(() => {
      expect(MockHtml5Qrcode.instances[0].isScanning).toBe(false);
    });
  });

  it('muestra error si la cámara falla al iniciar', async () => {
    const originalStart = MockHtml5Qrcode.prototype.start;
    MockHtml5Qrcode.prototype.start = async function() { throw new Error('Fail'); };
    
    render(<QRCam isActive={true} onScanSuccess={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error de cámara')).toBeInTheDocument();
    });

    MockHtml5Qrcode.prototype.start = originalStart;
  });
});
