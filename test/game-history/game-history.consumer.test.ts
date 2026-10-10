import { Test } from '@nestjs/testing';
import { GameHistoryConsumer } from '../../src/game-history/game-history.consumer';
import { GameHistoryModel } from '../../src/game-history/game-history.model';
import { Queue, RabbitMQService } from '../../src/messaging';
import { LoggerService } from '../../src/tools/logger';
import { generateGameEndedEvent } from './generators';

describe('GameHistoryConsumer (unit)', () => {
  let consumer: GameHistoryConsumer;
  let model: { save: jest.Mock };
  let rabbit: { subscribe: jest.Mock };
  let logger: { warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    model = { save: jest.fn().mockResolvedValue('saved') };
    rabbit = { subscribe: jest.fn().mockResolvedValue(undefined) };
    logger = { warn: jest.fn(), error: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameHistoryConsumer,
        { provide: GameHistoryModel, useValue: model },
        { provide: RabbitMQService, useValue: rabbit },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    consumer = moduleRef.get(GameHistoryConsumer);
  });

  it('should subscribe to the game-ended queue on bootstrap', () => {
    consumer.onApplicationBootstrap();
    expect(rabbit.subscribe).toHaveBeenCalledWith(
      Queue.GameEndedPersist,
      expect.any(Function),
    );
  });

  it('should log when subscribing fails', async () => {
    rabbit.subscribe.mockRejectedValueOnce(new Error('no channel'));
    consumer.onApplicationBootstrap();
    await new Promise(process.nextTick);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should save a game when both players are authorized', async () => {
    const event = generateGameEndedEvent();
    await consumer.handleGameEnded(event);
    expect(model.save).toHaveBeenCalledWith(event);
  });

  it('should skip a game with an anonymous player', async () => {
    const event = generateGameEndedEvent();
    event.players[1].authorized = false;
    await consumer.handleGameEnded(event);
    expect(model.save).not.toHaveBeenCalled();
  });

  it('should treat a duplicate match as handled', async () => {
    model.save.mockResolvedValueOnce('duplicate');
    await expect(
      consumer.handleGameEnded(generateGameEndedEvent()),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should rethrow persistence errors so the message is redelivered', async () => {
    model.save.mockRejectedValueOnce(new Error('serialization failure'));
    await expect(
      consumer.handleGameEnded(generateGameEndedEvent()),
    ).rejects.toThrow('serialization failure');
  });
});
