import {
  User,
  Table,
  TableBody,
  TableHeader,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
} from '@nextui-org/react';
import { Profile } from '@/context/UserContext';
import { RestructedGameResult } from '../game/types';

export function GamesTable({ profile }: { profile: Profile }) {
  const renderCells = (game: RestructedGameResult, columnKey: string) => {
    const cellValue = game[columnKey];
    switch (columnKey) {
      case 'result':
        if (cellValue.winner) {
          return (
            <div className="flex items-center justify-center">
              <User
                classNames={{ base: 'w-36 justify-start' }}
                name={
                  cellValue.winner.userId === profile.userId
                    ? 'You'
                    : cellValue.winner.name
                }
                description={cellValue.winner.name}
              >
                {cellValue.winner.userId === profile.userId
                  ? 'You'
                  : cellValue.winner.name}
              </User>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>

              <User
                classNames={{ base: 'w-36 justify-start' }}
                name={
                  cellValue.looser.userId === profile.userId
                    ? 'You'
                    : cellValue.looser.name
                }
                description={cellValue.looser.name}
              ></User>
            </div>
          );
        }
        return <div className="flex justify-center">Draw</div>;
      case 'cnf':
        return (
          <div className="flex justify-center">
            <Chip>
              {game.cnf.time}-{game.cnf.inc}
            </Chip>
          </div>
        );
      case 'bet':
        return (
          <div className="flex justify-center">
            <Chip>{cellValue / 100} $</Chip>
          </div>
        );
      default:
        return <div className="flex justify-center">{cellValue}</div>;
    }
  };
  return (
    <Table topContent={<h1>Games</h1>}>
      <TableHeader className="border-0">
        <TableColumn className="text-center" key="id">
          ID
        </TableColumn>
        <TableColumn className="text-center" key="cnf">
          Max time - Time increment
        </TableColumn>
        <TableColumn className="text-center" key="bet">
          Game bet
        </TableColumn>
        <TableColumn className="text-center" key="sidepick">
          Side picking
        </TableColumn>
        <TableColumn className="flex justify-center items-center" key="result">
          Winner - Looser
        </TableColumn>
      </TableHeader>
      <TableBody items={profile.games} emptyContent={'No games played.'}>
        {(item: RestructedGameResult) => (
          <TableRow key={item.key}>
            {(columnKey) => (
              <TableCell>{renderCells(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
