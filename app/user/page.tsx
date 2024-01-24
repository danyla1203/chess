'use client';

import { useUserState } from '@/context/UserContext';
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from '@nextui-org/react';

export default function UserProfile() {
  const { profile } = useUserState();

  if (!profile) {
    return <div>Loading...</div>;
  }

  const authorized = profile.isAuthorized;
  const renderCells = (game, columnKey) => {
    const cellValue = game[columnKey];
    switch (columnKey) {
      case 'result':
        if (cellValue.winner) {
          return (
            <div>
              <User
                description={cellValue.winner.name}
                name={cellValue.winner.name}
              >
                {cellValue.winner.name}
              </User>
              <User
                description={cellValue.looser.name}
                name={cellValue.looser.name}
              >
                {cellValue.looser.name}
              </User>
            </div>
          );
        }
        return <div>-</div>;
      case 'cnf':
        return (
          <Chip>
            {game.cnf.time}-{game.cnf.inc}
          </Chip>
        );
      default:
        return cellValue;
    }
  };
  return (
    <div className="flex container mx-auto mt-8">
      <Card className="mr-4 w-1/4">
        <CardHeader>
          <h1>{profile.name}</h1>
        </CardHeader>
        <CardBody>
          <h3>Authorize first to see Rating</h3>
          <div className="flex justify-between mt-3">
            <Chip>Wins: 0</Chip>
            <Chip>Looses: 0</Chip>
            <Chip>Draws: 0</Chip>
          </div>
        </CardBody>
        <CardFooter>
          <ButtonGroup fullWidth>
            <Button disabled={!authorized}>Change name</Button>
            <Button disabled={!authorized}>Logout</Button>
          </ButtonGroup>
        </CardFooter>
      </Card>
      <Table topContent={<h1>Games</h1>}>
        <TableHeader className="border-0">
          <TableColumn key="id">ID</TableColumn>
          <TableColumn key="cnf">Max time - Time increment</TableColumn>
          <TableColumn key="sidepick">Side picking</TableColumn>
          <TableColumn key="result">Winner - Looser</TableColumn>
        </TableHeader>
        <TableBody items={profile.games} emptyContent={'No games played.'}>
          {(item) => (
            <TableRow key={item.key}>
              {(columnKey) => (
                <TableCell>{renderCells(item, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
