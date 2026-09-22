import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | object) ?? exception.message;
        error = (resObj.error as string) ?? exception.name;
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
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
