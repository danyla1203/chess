import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { ServerUnaryCall } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';

const deadlineOf = (call: ServerUnaryCall<unknown, unknown>): number => {
  const deadline = call?.getDeadline?.();
  if (deadline === undefined) return Infinity;
  return deadline instanceof Date ? deadline.getTime() : deadline;
};

@Injectable()
export class DeadlineInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const call = context.getArgByIndex<ServerUnaryCall<unknown, unknown>>(2);
    if (deadlineOf(call) <= Date.now() || call?.cancelled) {
      throw new HttpException(
        'Deadline passed before the command started',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }
    return next.handle();
  }
}
