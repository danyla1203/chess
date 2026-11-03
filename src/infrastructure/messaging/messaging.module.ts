import { Global, Module } from '@nestjs/common';
import { EventStream } from './event-stream';

@Global()
@Module({
  providers: [EventStream],
  exports: [EventStream],
})
export class MessagingModule {}
