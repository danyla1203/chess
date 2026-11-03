import Stripe from 'stripe';
import { BadRequestException, Injectable } from '@nestjs/common';
import { StripeService } from '../infrastructure/stripe/stripe.service';
import { LoggerService } from '../infrastructure/logger';
import { UserService } from '../user';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly stripe: StripeService,
    private readonly logger: LoggerService,
    private readonly userService: UserService,
  ) {}

  private async fullfillBalanceTopUp(sessionId: string) {
    const session = await this.stripe.retreiveSession(sessionId);
    if (session.payment_status === 'paid') {
      await this.userService.topUpBalance(
        parseInt(session.metadata.clientId),
        session.amount_total,
      );
      this.logger.log(
        `Balance for user id: ${session.metadata.clientId} top up on: ${session.amount_total}`,
        'PaymentsService',
      );
    } else {
      throw new BadRequestException(`Payment isnt completed. Id: ${sessionId}`);
    }
  }

  public async getCheckoutSession(clientId: number) {
    try {
      const session = await this.stripe.updateBalanceCheckoutSession(clientId);
      this.logger.log(
        `Stripe session created: Id = ${session.id}`,
        'PaymentsService',
      );
      return session;
    } catch (e) {
      this.logger.error(e.message, e.trace, 'PaymentsService');
      throw new BadRequestException('Something  wrong with request');
    }
  }

  public async handleStripeWebhook(signature: string, body): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.constructEventFromWebhook(signature, body);
    } catch (err) {
      this.logger.error(err.message, err.trace, 'PaymentsService');
      throw new BadRequestException(err.message);
    }
    switch (event.type) {
      case 'checkout.session.completed': {
        const completedSession = event.data.object;
        await this.fullfillBalanceTopUp(completedSession.id);
        this.logger.log(
          `Completed session id: ${completedSession.id}`,
          'PaymentsService',
        );
        break;
      }
      default:
        this.logger.warn(
          `Unhandled event type: ${event.type}`,
          'PaymentsService',
        );
        throw new BadRequestException(`Unhandled event type: ${event.type}`);
    }
  }
}
