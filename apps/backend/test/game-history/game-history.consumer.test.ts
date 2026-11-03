import { Test } from '@nestjs/testing';
import {
  GameHistoryConsumer,
  HISTORY_GROUP,
} from '../../src/game-history/game-history.consumer';
import { GameHistoryModel } from '../../src/game-history/game-history.model';
import { EventStream, EventType } from '../../src/infrastructure/messaging';
import { LoggerService } from '../../src/infrastructure/logger';
import { generateGameEndedEvent } from './generators';

describe('GameHistoryConsumer (unit)', () => {
  let consumer: GameHistoryConsumer;
  let model: { save: jest.Mock };
  let events: { subscribe: jest.Mock };
  let logger: { warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    model = { save: jest.fn().mockResolvedValue('saved') };
    events = { subscribe: jest.fn() };
    logger = { warn: jest.fn(), error: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameHistoryConsumer,
        { provide: GameHistoryModel, useValue: model },
        { provide: EventStream, useValue: events },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    consumer = moduleRef.get(GameHistoryConsumer);
  });

  it('should subscribe its group to game.ended on bootstrap', () => {
    consumer.onApplicationBootstrap();
    expect(events.subscribe).toHaveBeenCalledWith(
      HISTORY_GROUP,
      EventType.GameEnded,
      expect.any(Function),
    );
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
