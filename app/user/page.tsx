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
            <div className="gap-5 flex items-center justify-center">
              <User
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
            <Chip>Wins: {profile.wins}</Chip>
            <Chip>Looses: {profile.looses}</Chip>
            <Chip>Draws: {profile.draws}</Chip>
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
          <TableColumn
            className="flex justify-center items-center"
            key="result"
          >
            Winner - Looser
          </TableColumn>
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
