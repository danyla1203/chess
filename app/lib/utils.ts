import { GameData } from './context/GameListContext';

export const deviceId = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const randomString =
    Math.random().toString(20).substring(2, 14) +
    Math.random().toString(20).substring(2, 14);
  return `${userAgent}-${platform}-${randomString}`;
};

export const getAnonymousGames = (): GameData[] => {
  const games = localStorage.getItem('anon-games');
  if (!games) return [];
  return JSON.parse(games);
};

export const restructGameResult = (g: any) => {
  const beautyMaxTime = Math.floor(g.config.time / (1000 * 60));
  const beautyTimeIncrement = Math.floor(g.config.timeIncrement / 1000);

  const base = {
    id: g.id,
    key: g.id,
    inc: beautyTimeIncrement,
    time: beautyMaxTime,
    sidepick: g.config.side,
  };
  if (g.winner) {
    return {
      ...base,
      winner: g.winner,
      looser: g.looser,
    };
  } else {
    return {
      ...base,
      pl1: g.pl1,
      pl2: g.pl2,
    };
  }
};
