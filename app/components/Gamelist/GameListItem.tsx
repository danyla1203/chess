import { GameData } from './GameList';

export function GameListItem({
  game,
  joinGame,
}: {
  game: GameData;
  joinGame: (gameId: string) => void;
}) {
  console.log(game);
  const playerName = game.players[0].name;
  const beautyMaxTime = Math.floor(game.config.time / (1000 * 60));
  const beautyTimeIncrement = Math.floor(game.config.timeIncrement / 1000);
  return (
    <tr onClick={() => joinGame(game.id)}>
      <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left text-blueGray-700 ">
        {playerName}
      </th>
      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 ">
        {beautyMaxTime} - {beautyTimeIncrement}
      </td>
      <td className="border-t-0 px-6 align-center border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
        {game.config.side}
      </td>
    </tr>
  );
}
