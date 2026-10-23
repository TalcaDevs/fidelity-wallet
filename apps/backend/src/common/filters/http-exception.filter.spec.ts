import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  const mockHost = () => {
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const response = { status: statusMock };
    const request = { method: 'POST', url: '/api/customers' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, statusMock, jsonMock };
  };

  it('translates real ThrottlerException (string response) to friendly Spanish message', () => {
    const { host, statusMock, jsonMock } = mockHost();
    const exception = new ThrottlerException();

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
        path: '/api/customers',
      }),
    );
  });

  it('preserves business specific 429 messages in Spanish (e.g. ManualLookupLimiter)', () => {
    const { host, statusMock, jsonMock } = mockHost();
    const customMessage = 'Demasiadas búsquedas manuales seguidas. Espera un minuto o escanea el QR del cliente.';
    const exception = new HttpException(customMessage, HttpStatus.TOO_MANY_REQUESTS);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        message: customMessage,
      }),
    );
  });

  it('handles standard BadRequestException and validation arrays correctly', () => {
    const { host, statusMock, jsonMock } = mockHost();
    const exception = new BadRequestException(['El correo es inválido', 'El teléfono es requerido']);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['El correo es inválido', 'El teléfono es requerido'],
      }),
    );
  });
});
