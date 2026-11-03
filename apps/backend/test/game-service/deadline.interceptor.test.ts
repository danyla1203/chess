import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { DeadlineInterceptor } from '../../src/game-service/deadline.interceptor';

const context = (call: unknown) =>
  ({ getArgByIndex: () => call }) as unknown as ExecutionContext;

describe('DeadlineInterceptor (unit)', () => {
  const interceptor = new DeadlineInterceptor();
  const next = { handle: jest.fn(() => of('done')) };

  beforeEach(() => next.handle.mockClear());

  it('should run a command whose deadline is still ahead', () => {
    interceptor.intercept(
      context({ getDeadline: () => Date.now() + 1000, cancelled: false }),
      next,
    );
    expect(next.handle).toHaveBeenCalled();
  });

  it('should run a command without a deadline', () => {
    interceptor.intercept(
      context({ getDeadline: () => Infinity, cancelled: false }),
      next,
    );
    expect(next.handle).toHaveBeenCalled();
  });

  it.each([
    [
      'passed',
      { getDeadline: () => new Date(Date.now() - 1), cancelled: false },
    ],
    ['cancelled', { getDeadline: () => Infinity, cancelled: true }],
  ])('should refuse a command whose caller %s', (_name, call) => {
    expect(() => interceptor.intercept(context(call), next)).toThrow(
      HttpException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });
});
