import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private client?: Stripe;
  webhookSecret: string;
  success_url: string;
  cancel_url: string;
  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    this.success_url = this.configService.get(
      'STRIPE_CHECKOUT_SESSION_SUCCESS_URL',
    );
    this.cancel_url = this.configService.get(
      'STRIPE_CHECKOUT_SESSION_CANCEL_URL',
    );
  }

  get stripe(): Stripe {
    this.client ??= new Stripe(this.configService.get('STRIPE_SECRET'), {
      apiVersion: '2022-11-15' as Stripe.LatestApiVersion,
    });
    return this.client;
  }

  public updateBalanceCheckoutSession(clientId: number) {
    return this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1NZzaUEmpALKGC8P2iLihLrD',
          quantity: 1,
        },
      ],
      metadata: {
        clientId,
      },
      mode: 'payment',
      success_url: this.success_url,
      cancel_url: this.cancel_url,
    });
  }
  public constructEventFromWebhook(signature, body) {
    return this.stripe.webhooks.constructEvent(
      body,
      signature,
      this.webhookSecret,
    );
  }

  public retreiveSession(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
