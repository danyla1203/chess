type Properties = Record<string, unknown>;
type Delivery = {
  content: Buffer;
  properties: Properties;
  fields: { routingKey: string; exchange: string; redelivered: boolean };
};
type Handler = (message: Delivery) => unknown;

const REPLY_TO = 'amq.rabbitmq.reply-to';

export class FakeBroker {
  readonly bindings: { exchange: string; key: string; queue: string }[] = [];
  readonly consumers = new Map<string, Handler[]>();
  readonly published: { exchange: string; key: string; body: unknown }[] = [];
  readonly nacked: { message: Delivery; requeue: boolean }[] = [];
  private readonly cursors = new Map<string, number>();
  private channelSeq = 0;

  nextChannelId(): number {
    return ++this.channelSeq;
  }

  bind(exchange: string, key: string, queue: string): void {
    if (
      !this.bindings.some(
        (b) => b.exchange === exchange && b.key === key && b.queue === queue,
      )
    ) {
      this.bindings.push({ exchange, key, queue });
    }
  }

  consume(queue: string, handler: Handler): void {
    this.consumers.set(queue, [...(this.consumers.get(queue) ?? []), handler]);
  }

  route(exchange: string, key: string, content: Buffer, props: Properties) {
    this.published.push({
      exchange,
      key,
      body: JSON.parse(content.toString()),
    });
    const queues =
      exchange === ''
        ? [key]
        : this.bindings
            .filter((b) => b.exchange === exchange && b.key === key)
            .map((b) => b.queue);
    for (const queue of queues) {
      this.deliver(queue, exchange, key, content, props);
    }
  }

  deliver(
    queue: string,
    exchange: string,
    routingKey: string,
    content: Buffer,
    properties: Properties,
  ) {
    const handlers = this.consumers.get(queue) ?? [];
    if (handlers.length === 0) return;
    const cursor = this.cursors.get(queue) ?? 0;
    this.cursors.set(queue, cursor + 1);
    const handler = handlers[cursor % handlers.length];
    setImmediate(() =>
      handler({
        content,
        properties,
        fields: { routingKey, exchange, redelivered: false },
      }),
    );
  }
}

class FakeRawChannel {
  constructor(
    private readonly broker: FakeBroker,
    private readonly id: number,
  ) {}

  async assertExchange() {
    return {};
  }
  async assertQueue() {
    return {};
  }
  async bindQueue(queue: string, exchange: string, key: string) {
    this.broker.bind(exchange, key, queue);
  }
  async consume(queue: string, handler: Handler) {
    this.broker.consume(
      queue === REPLY_TO ? `reply:${this.id}` : queue,
      handler,
    );
    return { consumerTag: `${queue}:${this.id}` };
  }
}

class FakeChannelWrapper {
  private readonly id: number;
  private readonly ready: Promise<void>;
  readonly ack = jest.fn();
  readonly nack = jest.fn(
    (message: Delivery, _allUpTo: boolean, requeue: boolean) =>
      this.broker.nacked.push({ message, requeue }),
  );

  constructor(
    private readonly broker: FakeBroker,
    opts: {
      json?: boolean;
      setup?: (channel: unknown) => Promise<void>;
    },
  ) {
    this.id = broker.nextChannelId();
    const raw = new FakeRawChannel(broker, this.id);
    this.ready = opts.setup ? opts.setup(raw) : Promise.resolve();
  }

  private encode(content: unknown): Buffer {
    return Buffer.isBuffer(content)
      ? content
      : Buffer.from(JSON.stringify(content));
  }

  async publish(
    exchange: string,
    key: string,
    content: unknown,
    props: Properties = {},
  ) {
    await this.ready;
    const properties =
      props.replyTo === REPLY_TO
        ? { ...props, replyTo: `reply:${this.id}` }
        : props;
    this.broker.route(exchange, key, this.encode(content), properties);
    return true;
  }

  async sendToQueue(queue: string, content: unknown, props: Properties = {}) {
    return this.publish('', queue, content, props);
  }

  async consume(queue: string, handler: Handler) {
    await this.ready;
    this.broker.consume(queue, handler);
    return { consumerTag: `${queue}:${this.id}` };
  }

  async close() {}
}

export const fakeConnection = (broker: FakeBroker) => ({
  on: jest.fn(),
  isConnected: () => true,
  close: async () => undefined,
  createChannel: (opts: ConstructorParameters<typeof FakeChannelWrapper>[1]) =>
    new FakeChannelWrapper(broker, opts),
});

export const flush = () => new Promise((r) => setImmediate(r));
