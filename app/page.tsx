import { GameList, CreateGame } from '@/components';

export default function Page() {
  return (
    <main className="flex w-full p-10">
      <GameList />
      <CreateGame />
    </main>
  );
}
