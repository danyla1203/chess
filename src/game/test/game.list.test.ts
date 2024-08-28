import { Game, GameData } from '../entities/game';
import { GameList } from '../game.list';
import { generateClient, generateConfig } from './generators';

describe('GameList (unit)', () => {
  let list: GameList;
  beforeEach(() => {
    list = new GameList();
    for (let i = 0; i < 10; i++) {
      const config = generateConfig();
      const fClient = generateClient();
      const game = new Game(fClient, config, jest.fn());
      list.lobby.push(game);
    }
  });

  it('addGameToLobby', () => {
    const config = generateConfig();
    const fClient = generateClient();
    const game = new Game(fClient, config, jest.fn());
    list.addGameToLobby(game);
    expect(list.lobby).toHaveLength(11);
  });
  describe('find in lobby', () => {
    const cases = [[0], [1], [2], [3], [4]];
    it.each(cases)('find game in lobby', (index: number) => {
      const game = list.lobby[index];
      expect(list.findInLobby(game.id)).toStrictEqual(game);
    });
  });
  it('should remove games from lobby', () => {
    const len = list.lobby.length;
    const cl = list.lobby[6].players[0];
    list.removeInitedGames(cl.client);
    expect(list.lobby).toHaveLength(len - 1);
  });
  it('should remove a game from the lobby by ID', () => {
    const gameToAdd: Game = { id: 1, players: [] } as Game;
    list.addGameToLobby(gameToAdd);
    list.pushToStartedGames(1);
    const foundGame = list.findInLobby(1);
    expect(foundGame).toBeNull();
  });
  it('should move the removed game to the games array', () => {
    const gameToAdd: Game = { id: 1, players: [] } as Game;
    const gmLen = list.games.length;
    list.addGameToLobby(gameToAdd);
    list.pushToStartedGames(1);
    expect(list.games.length).toBe(gmLen + 1);
    expect(list.games[0]).toEqual(gameToAdd);
  });
  describe('getLobby', () => {
    beforeEach(() => {
      list.lobby = [];
      list.games = [];
    });
    it('should return an empty array when the lobby is empty', () => {
      const result: GameData[] = list.getLobby();
      expect(result).toEqual([]);
    });

    it('should return the correct data structure when the lobby has games', () => {
      const config = generateConfig();
      const game: any = {
        id: 1,
        players: [
          { userId: 1, name: 'Player1', side: 'w' },
          { userId: 2, name: 'Player2', side: 'b' },
        ],
        config,
        isActive: true,
      };

      list.addGameToLobby(game);

      const result: GameData[] = list.getLobby();

      expect(result).toEqual([
        {
          id: 1,
          players: [
            { userId: 1, name: 'Player1', side: 'w' },
            { userId: 2, name: 'Player2', side: 'b' },
          ],
          config,
        },
      ]);
    });
  });
});
