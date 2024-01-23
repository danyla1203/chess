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
