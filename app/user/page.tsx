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
} from '@nextui-org/react';
import { GamesTable } from './GamesTable';

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
      <GamesTable profile={profile} />
    </div>
  );
}
