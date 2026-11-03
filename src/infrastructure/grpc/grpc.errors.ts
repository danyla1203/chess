import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import type { ServiceError } from '@grpc/grpc-js';

export const HTTP_ERROR_KEY = 'x-http-error-bin';

type HttpError = { status: HttpStatus; response: string | object };

export type GrpcError = { code: status; message: string; metadata: Metadata };

const GRPC_BY_HTTP: Partial<Record<HttpStatus, status>> = {
  [HttpStatus.BAD_REQUEST]: status.INVALID_ARGUMENT,
  [HttpStatus.UNAUTHORIZED]: status.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: status.PERMISSION_DENIED,
  [HttpStatus.NOT_FOUND]: status.NOT_FOUND,
  [HttpStatus.CONFLICT]: status.ABORTED,
  [HttpStatus.TOO_MANY_REQUESTS]: status.RESOURCE_EXHAUSTED,
  [HttpStatus.SERVICE_UNAVAILABLE]: status.UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: status.DEADLINE_EXCEEDED,
};

export function toGrpcError(err: unknown): GrpcError {
  const http =
    err instanceof HttpException
      ? { status: err.getStatus(), response: err.getResponse() }
      : {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          response: {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          },
        };
  const metadata = new Metadata();
  metadata.set(HTTP_ERROR_KEY, Buffer.from(JSON.stringify(http)));
  return {
    code: GRPC_BY_HTTP[http.status] ?? status.INTERNAL,
    message: err instanceof Error ? err.message : 'Internal server error',
    metadata,
  };
}

function fromHttpError({ status: code, response }: HttpError): HttpException {
  switch (code) {
    case HttpStatus.BAD_REQUEST:
      return new BadRequestException(response);
    case HttpStatus.FORBIDDEN:
      return new ForbiddenException(response);
    case HttpStatus.NOT_FOUND:
      return new NotFoundException(response);
    case HttpStatus.CONFLICT:
      return new ConflictException(response);
    default:
      return new HttpException(response, code);
  }
}

export class GameServiceUnavailableError extends ServiceUnavailableException {
  constructor(method: string, reason: string) {
    super(`Game service did not answer ${method}: ${reason}`);
  }
}

export function fromGrpcError(err: unknown, method: string): HttpException {
  const error = err as Partial<ServiceError>;
  const [raw] = error.metadata?.get(HTTP_ERROR_KEY) ?? [];
  if (raw) {
    return fromHttpError(JSON.parse(raw.toString()) as HttpError);
  }
  if (
    error.code === status.UNAVAILABLE ||
    error.code === status.DEADLINE_EXCEEDED ||
    error.code === status.CANCELLED
  ) {
    return new GameServiceUnavailableError(method, error.details ?? 'no reply');
  }
  return new HttpException(
    error.details ?? 'Game service error',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
