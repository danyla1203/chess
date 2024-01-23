'use client';

import { useUserState } from '@/context/UserContext';
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
} from '@nextui-org/react';

export default function UserProfile() {
  const { profile } = useUserState();

  if (!profile) {
    return <div>Loading...</div>;
  }
  const authorized = profile.isAuthorized;
  return (
    <div className="flex container mx-auto mt-8">
      <Card className="mr-4 w-1/4">
        <CardHeader>
          <h1>{profile.name}</h1>
        </CardHeader>
        <CardBody>
          <h3>Authorize first to see Rating</h3>
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
          <TableColumn key="opponent">Player name</TableColumn>
          <TableColumn key="time">Max time - minutes</TableColumn>
          <TableColumn key="inc">Time increment - seconds</TableColumn>
          <TableColumn key="sidepick">Side picking</TableColumn>
        </TableHeader>
        <TableBody items={profile.games} emptyContent={'No games played.'}>
          {(item) => (
            <TableRow key={item.key}>
              {(columnKey) => (
                <TableCell>{getKeyValue(item, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
