'use client';
import { Emit, useWebSocket } from '@/context/SocketContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateGame() {
  const [minutes, setMinutes] = useState(6);
  const [timeAdd, setTimeAdd] = useState(15);

  const socket = useWebSocket();
  const router = useRouter();

  const create = (side: string) => {
    const body = {
      side,
      time: minutes * 60 * 1000,
      timeIncrement: timeAdd * 1000,
    };
    socket.volatile.emit(Emit.createGame, { ...body });
    router.push('/game');
  };

  return <div className="basis-2/5"></div>;
}
