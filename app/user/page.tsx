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
import moment from 'moment';
import { GamesTable } from './GamesTable';
import { Loader } from '@/components';
import { UserBalance } from './UserBalance';
import InvoiceHistory from './InvoiceHistory';
import ChangeName from './ChangeName';

export default function UserProfile() {
  const { profile } = useUserState();

  if (!profile) {
    return <Loader />;
  }

  const authorized = profile.isAuthorized;

  return (
    <div className="flex justify-center mt-5 p-9">
      <Card className="mr-4 h-fit">
        <CardHeader className="pb-1 flex-col items-start">
          <h1>{profile.name}</h1>
          {authorized ? (
            <h5 className="text-xs">
              Become player {moment(profile.createdAt).fromNow()}
            </h5>
          ) : null}
        </CardHeader>
        <CardBody className="pb-0 pt-2">
          {/* Wait for backend */}
          {!authorized ? (
            <h3 className="text-xs font-semibold">
              Authorize first to see Rating
            </h3>
          ) : null}
          <div className="flex flex-col xl:flex-row space-y-2 xl:space-y-0 mt-4 mb-4 h-full">
            <Chip className="mr-1">Wins: {profile.wins}</Chip>
            <Chip className="mr-1">Looses: {profile.looses}</Chip>
            <Chip>Draws: {profile.draws}</Chip>
          </div>
          {authorized ? <UserBalance profile={profile} /> : null}
        </CardBody>
        <CardFooter className="pt-1">
          <div className="w-full flex flex-col place-items-stretch justify-between">
            <ChangeName profile={profile} />
            <Button className="mt-1" size="sm" disabled={!authorized}>
              Logout
            </Button>
          </div>
        </CardFooter>
      </Card>
      <div className="w-3/4 2xl:flex">
        <GamesTable profile={profile} />
        {authorized ? <InvoiceHistory profile={profile} /> : null}
      </div>
    </div>
  );
}
