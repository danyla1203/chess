import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service';
import { UserService } from '../../src/user/user.service';
import { LoggerService } from '../../src/tools/logger';
import { LoggerServiceStub } from '../utils/LoggerServiceStub';
import { StripeService } from '../../src/payments/stripe/stripe.service';

describe('PaymentsService (unit)', () => {
  let service: PaymentsService;
  let stripeService: StripeService;
  let userService: UserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PaymentsService, UserService, StripeService, LoggerService],
    })
      .overrideProvider(UserService)
      .useValue({
        topUpBalance: jest.fn(),
      })
      .overrideProvider(LoggerService)
      .useClass(LoggerServiceStub)
      .compile();

    service = moduleRef.get<PaymentsService>(PaymentsService);
    userService = moduleRef.get<UserService>(UserService);
    stripeService = moduleRef.get<StripeService>(StripeService);
  });
  describe('getCheckoutSession', () => {
    it('throw Error', () => {
      jest
        .spyOn(stripeService, 'updateBalanceCheckoutSession')
        .mockRejectedValueOnce(new Error());
      expect(service.getCheckoutSession(-1)).rejects.toThrow(
        BadRequestException,
      );
    });
    it('create and return created session', () => {
      jest
        .spyOn(stripeService, 'updateBalanceCheckoutSession')
        .mockResolvedValueOnce({ url: 'https://example.checkout' } as any);
      expect(service.getCheckoutSession(1)).resolves.toStrictEqual({
        url: 'https://example.checkout',
      });
    });
  });
  describe('handleStripeWebhook', () => {
    it('construct event from webhook is failed', () => {
      jest
        .spyOn(stripeService, 'constructEventFromWebhook')
        .mockImplementationOnce(() => {
          throw new Error();
        });
      expect(service.handleStripeWebhook('t_sign', {})).rejects.toThrow(
        BadRequestException,
      );
    });
    it('Unhandled event type in webhook call', async () => {
      jest
        .spyOn(stripeService, 'constructEventFromWebhook')
        .mockReturnValueOnce({
          type: 'unhandled.event.type',
        } as unknown as Stripe.Event);
      expect(service.handleStripeWebhook('t_sign', {})).rejects.toThrow(
        BadRequestException,
      );
    });
    it('Checkout session completed', async () => {
      jest
        .spyOn(stripeService, 'constructEventFromWebhook')
        .mockReturnValueOnce({
          type: 'checkout.session.completed',
          data: { object: { id: 't_id' } },
        } as any);
      jest
        .spyOn(service as any, 'fullfillBalanceTopUp')
        .mockImplementationOnce(jest.fn());
      await service.handleStripeWebhook('t_sign', {});
      expect(service['fullfillBalanceTopUp']).toHaveBeenCalledWith('t_id');
    });
  });
  describe('fullfillBalanceTopUp', () => {
    it('Incompleted payment error', async () => {
      jest
        .spyOn(stripeService, 'retreiveSession')
        .mockResolvedValueOnce({ payment_status: 'unpaid' } as any);
      expect(service['fullfillBalanceTopUp']('s_id')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('top up user balance', async () => {
      jest.spyOn(stripeService, 'retreiveSession').mockResolvedValueOnce({
        payment_status: 'paid',
        metadata: { clientId: 1 },
        amount_total: 500,
      } as any);
      await service['fullfillBalanceTopUp']('s_test');
      expect(userService.topUpBalance).toHaveBeenCalledWith(1, 500);
    });
  });
});
