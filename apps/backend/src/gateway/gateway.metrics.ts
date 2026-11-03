import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

@Injectable()
export class GatewayMetrics {
  private readonly meter = metrics.getMeter('chess.gateway');
  private readonly connections = this.meter.createUpDownCounter(
    'chess.ws.connections',
    { description: 'Open Socket.IO connections on the /game namespace' },
  );

  public connectionOpened(): void {
    this.connections.add(1);
  }

  public connectionClosed(): void {
    this.connections.add(-1);
  }
}
