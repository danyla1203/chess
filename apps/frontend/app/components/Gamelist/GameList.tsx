'use client';

import type { Key } from 'react';
import {
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import { type GameData, useGameList } from '@/context/GameListContext';

export function GameList() {
  const { connect, games } = useGameList();

  const renderCells = (game: GameData, columnKey: Key) => {
    switch (columnKey) {
      case 'cnf':
        return (
          <div>
            {game.cnf.time}-{game.cnf.inc}
          </div>
        );
      default:
        return game[columnKey as Exclude<keyof GameData, 'cnf'>];
    }
  };

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
        <TableColumn key="cnf">Max time - Time increment</TableColumn>
        <TableColumn key="sidepick">Side picking</TableColumn>
      </TableHeader>
      <TableBody items={games} emptyContent="No games in lobby.">
        {(item) => (
          <TableRow onClick={() => connect(item.id)} key={item.key}>
            {(columnKey) => (
              <TableCell>{renderCells(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
