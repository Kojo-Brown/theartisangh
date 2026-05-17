import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: Record<string, unknown> = {
      error: 'InternalServerError',
      message: 'Something went wrong',
    };

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      payload = {
        error: 'ValidationError',
        message: 'Request validation failed',
        issues: exception.issues,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      payload =
        typeof response === 'string'
          ? { error: exception.name, message: response }
          : { error: exception.name, ...(response as object) };
    } else if (exception instanceof Error) {
      payload = { error: exception.name, message: exception.message };
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `${req.method} ${req.url} → ${status} ${String(payload['error'])}`,
      stack,
    );

    res.status(status).json({ statusCode: status, ...payload });
  }
}
