import { GameList, CreateGame } from '@/ui';

export default function Page() {
  return (
    <main className="flex w-full p-10">
      <GameList />
      <CreateGame />
    </main>
  );
}
