import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { GrpcError, toGrpcError } from '../infrastructure/grpc';
import { LoggerService } from '../infrastructure/logger';

@Catch()
export class HttpToGrpcFilter implements RpcExceptionFilter<unknown> {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): Observable<GrpcError> {
    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      const handler = host.getArgByIndex<{ getPath?: () => string }>(2);
      this.logger.error(
        `Command ${handler?.getPath?.() ?? 'unknown'} failed: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
        HttpToGrpcFilter.name,
      );
    }
    return throwError(() => toGrpcError(exception));
  }
}
