import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** Únicos campos extra que la app agrega a sus excepciones (p. ej. PLAN_LIMIT); el resto no sale. */
const EXPOSED_KEYS = ['code', 'resource', 'limit'] as const;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Ha ocurrido un error interno en el servidor';
    let error = 'Internal Server Error';
    // Campos propios de la app (p. ej. code: PLAN_LIMIT) para que el cliente distinga el caso sin parsear el texto.
    const extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | object) ?? exception.message;
        error = (body.error as string) ?? exception.name;
        for (const key of EXPOSED_KEYS) {
          if (body[key] !== undefined) extra[key] = body[key];
        }
      } else {
        message = res;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Excepción no controlada en ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      // No exponer detalles de base de datos o stack interno al cliente en 500 no controlados
      message = 'Ha ocurrido un error interno en el servidor';
      error = 'Internal Server Error';
    } else {
      this.logger.error(
        `Error desconocido en ${request.method} ${request.url}: ${String(exception)}`,
      );
      message = 'Ha ocurrido un error interno en el servidor';
      error = 'Internal Server Error';
    }

    response.status(status).json({
      ...extra,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
