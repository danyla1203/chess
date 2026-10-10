import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export type RpcError = { status: HttpStatus; response: string | object };

export type RpcReply =
  { ok: true; data: unknown } | { ok: false; error: RpcError };

export function toRpcError(err: unknown): RpcError {
  if (err instanceof HttpException) {
    return { status: err.getStatus(), response: err.getResponse() };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    response: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    },
  };
}

export function fromRpcError({ status, response }: RpcError): HttpException {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return new BadRequestException(response);
    case HttpStatus.FORBIDDEN:
      return new ForbiddenException(response);
    case HttpStatus.NOT_FOUND:
      return new NotFoundException(response);
    case HttpStatus.CONFLICT:
      return new ConflictException(response);
    default:
      return new HttpException(response, status);
  }
}

export class RpcTimeoutError extends ServiceUnavailableException {
  constructor(type: string) {
    super(`No reply to ${type} in time`);
  }
}
