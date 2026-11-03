import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Get('/checkout-session')
  async checkoutSession(@Request() req) {
    const session = await this.service.getCheckoutSession(req.user.id);
    return { url: session.url };
  }

  @Post('/webhook')
  async stripeWebhook(@Req() request, @Res() response) {
    const sig = request.headers['stripe-signature'];
    await this.service.handleStripeWebhook(sig, request.rawBody);
    response.send();
  }
}
