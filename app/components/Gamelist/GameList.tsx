'use client';

import {
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  getKeyValue,
  TableRow,
  TableCell,
} from '@nextui-org/react';
import { useGameList } from '@/context/GameListContext';

export function GameList() {
  const { connect, games } = useGameList();

  const topContent = (
    <div>
      <h1 className="mb-2">Lobby</h1>
      <Divider />
    </div>
  );
  return (
    <Table topContent={topContent} isStriped>
      <TableHeader className="border-0">
        <TableColumn key="opponent">Player name</TableColumn>
        <TableColumn key="time">Max time - minutes</TableColumn>
        <TableColumn key="inc">Time increment - seconds</TableColumn>
        <TableColumn key="sidepick">Side picking</TableColumn>
      </TableHeader>
      <TableBody items={games} emptyContent={'No games in lobby.'}>
        {(item) => (
          <TableRow onClick={() => connect(item.id)} key={item.key}>
            {(columnKey) => (
              <TableCell>{getKeyValue(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
