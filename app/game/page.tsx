'use client';
import { useWebSocket } from '@/context/SocketContext';

export default function Page() {
  const socket = useWebSocket();
  return <p>Game page</p>;
}
