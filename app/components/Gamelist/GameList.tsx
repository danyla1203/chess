'use client';

import { useGameList } from '@/context/GameListContext';
import { GameListItem } from './GameListItem';

export function GameList() {
  const { connect, games } = useGameList();

  return (
    <div className="block overflow-x-auto basis-3/4">
      <table className="w-full items-center bg-transparent border-collapse ">
        <thead>
          <tr>
            <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
              Player name
            </th>
            <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
              Max time - Time increment
            </th>
            <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
              Side picking
            </th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <GameListItem key={g.id} game={g} joinGame={connect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
