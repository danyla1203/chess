import { GameChat } from '../../src/domain/game/entities/game/game.chat';
import { Client } from '../../src/domain/game/entities';
import { generateClient } from '../game/generators';

describe('GameChat (unit)', () => {
  let chat: GameChat;
  let cl: Client;
  beforeEach(() => {
    chat = new GameChat();
    cl = generateClient();
  });
  describe('addMessage', () => {
    it('should add message', () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01'));
      jest.spyOn(Math, 'random').mockImplementationOnce(() => 0.12345);
      const expected = {
        id: 12345,
        text: 'test',
        author: {
          id: cl.userId,
          name: cl.name,
        },
        date: new Date(),
      };
      expect(chat.addMessage('test', cl)).toStrictEqual(expected);
      expect(chat.messages[0]).toStrictEqual(expected);
    });
  });
});
