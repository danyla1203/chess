'use client';

import { useWebSocket, Emit } from '@/context/SocketContext';
import { useState } from 'react';
import { GameListItem } from './GameListItem';
import { useRouter } from 'next/navigation';

type PlayerData = {
  id: string;
  name: string;
};

export type GameData = {
  id: string;
  spectators: number;
  players: PlayerData[];
  isActive: boolean;
  config: {
    time: number;
    timeIncrement: number;
    side: 'w' | 'b' | 'rand';
  };
};

export function GameList() {
  const socket = useWebSocket();
  const router = useRouter();
  const [games, setGames] = useState<GameData[]>([]);

  socket.on('lobby:update', (payload: GameData[]) => setGames(payload));

  const connect = (gameId: string) => {
    socket.emit(Emit.gameJoin, { gameId });
    router.push('/game');
  };

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
