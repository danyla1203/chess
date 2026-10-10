import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { OutboxRelay } from './outbox.relay';

@Global()
@Module({
  providers: [RabbitMQService, OutboxRelay],
  exports: [RabbitMQService],
})
export class MessagingModule {}
