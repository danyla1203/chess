import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import {
  GameServiceUnavailableError,
  HTTP_ERROR_KEY,
  fromGrpcError,
  toGrpcError,
} from '../../src/infrastructure/grpc';

const roundTrip = (err: unknown) => {
  const grpc = toGrpcError(err);
  return {
    grpc,
    http: fromGrpcError({ ...grpc, details: grpc.message }, 'move'),
  };
};

describe('gRPC error mapping (unit)', () => {
  it.each([
    [
      new BadRequestException('bad'),
      status.INVALID_ARGUMENT,
      BadRequestException,
    ],
    [new ForbiddenException(), status.PERMISSION_DENIED, ForbiddenException],
    [
      new NotFoundException('Game not found'),
      status.NOT_FOUND,
      NotFoundException,
    ],
    [new ConflictException('Not your turn'), status.ABORTED, ConflictException],
  ])(
    'should carry %p as code %p and rebuild the same class',
    (err, code, type) => {
      const { grpc, http } = roundTrip(err);
      expect(grpc.code).toBe(code);
      expect(http).toBeInstanceOf(type);
      expect(http.getResponse()).toStrictEqual(err.getResponse());
    },
  );

  it('should hide unexpected errors behind a 500 response', () => {
    const { grpc, http } = roundTrip(new Error('redis exploded'));
    expect(grpc.code).toBe(status.INTERNAL);
    expect(http.getStatus()).toBe(500);
    expect(http.getResponse()).toStrictEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it.each([status.UNAVAILABLE, status.DEADLINE_EXCEEDED, status.CANCELLED])(
    'should report transport failure %p as the game service being unavailable',
    (code) => {
      const http = fromGrpcError(
        { code, details: 'no connection', metadata: new Metadata() },
        'move',
      );
      expect(http).toBeInstanceOf(GameServiceUnavailableError);
      expect(http.message).toBe(
        'Game service did not answer move: no connection',
      );
    },
  );

  it('should keep the HTTP status when the error was not mapped to a known code', () => {
    const { grpc, http } = roundTrip(new HttpException('teapot', 418));
    expect(grpc.code).toBe(status.INTERNAL);
    expect(grpc.metadata.get(HTTP_ERROR_KEY)).toHaveLength(1);
    expect(http.getStatus()).toBe(418);
  });
});
