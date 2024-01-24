import { GameData } from './context/GameListContext';

export const deviceId = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const randomString =
    Math.random().toString(20).substring(2, 14) +
    Math.random().toString(20).substring(2, 14);
  return `${userAgent}-${platform}-${randomString}`;
};

export const getAnonymousGames = (
  id: number,
): { games: GameData[]; wins: number; looses: number; draws: number } => {
  const games = localStorage.getItem('anon-games');
  let wins = 0;
  let looses = 0;
  let draws = 0;
  if (!games) return { games: [], wins, looses, draws };
  const parsed = JSON.parse(games);

  for (const game of parsed) {
    const r = game.result;
    if (r.winner) {
      if (r.winner.userId === id) wins++;
      else looses++;
    } else draws++;
  }
  return { games: parsed, wins, looses, draws };
};

export const restructGameResult = (g: any) => {
  const beautyMaxTime = Math.floor(g.config.time / (1000 * 60));
  const beautyTimeIncrement = Math.floor(g.config.timeIncrement / 1000);

  const base = {
    id: g.id,
    key: g.id,
    cnf: {
      inc: beautyTimeIncrement,
      time: beautyMaxTime,
    },
    sidepick: g.config.side,
  };
  if (g.winner) {
    return {
      ...base,
      result: {
        winner: g.winner,
        looser: g.looser,
      },
    };
  } else {
    return {
      ...base,
      result: {
        pl1: g.pl1,
        pl2: g.pl2,
      },
    };
  }
};
