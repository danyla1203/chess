'use client';

import { useUserState } from '@/context/UserContext';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
} from '@nextui-org/react';
import { GamesTable } from './GamesTable';
import { Loader } from '@/components';

export default function UserProfile() {
  const { profile } = useUserState();

  if (!profile) {
    return <Loader />;
  }

  const authorized = profile.isAuthorized;

  return (
    <div className="flex container mx-auto mt-8">
      <Card className="mr-4 w-1/4">
        <CardHeader className="pb-1">
          <h1>{profile.name}</h1>
        </CardHeader>
        <CardBody className="pb-0 pt-2">
          <h3 className="text-xs font-semibold">
            Authorize first to see Rating
          </h3>
          <div className="flex flex-col xl:flex-row space-y-2 xl:space-y-0 mt-3 h-full">
            <Chip>Wins: {profile.wins}</Chip>
            <Chip>Looses: {profile.looses}</Chip>
            <Chip>Draws: {profile.draws}</Chip>
          </div>
        </CardBody>
        <CardFooter className="pt-1">
          <div className="w-full flex flex-col place-items-stretch justify-between">
            <Button size="sm" disabled={!authorized}>
              Change name
            </Button>
            <Button className="mt-1" size="sm" disabled={!authorized}>
              Logout
            </Button>
          </div>
        </CardFooter>
      </Card>
      <GamesTable profile={profile} />
    </div>
  );
}
