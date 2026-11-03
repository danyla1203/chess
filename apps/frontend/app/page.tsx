import { GameList, CreateGame } from '@/components';

export default function Page() {
  return (
    <main className="flex p-10">
      <GameList />
      <CreateGame />
    </main>
  );
}
