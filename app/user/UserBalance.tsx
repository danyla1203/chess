import { Button, Chip } from '@nextui-org/react';
import { Profile } from '../lib/context/UserContext';
import { stripeCheckout } from '../lib/request/stripeCheckout';

export function UserBalance({ profile }: { profile: Profile }) {
  const topUpRedirect = () => {
    stripeCheckout()?.then(({ url }) => {
      window.location.href = url;
    });
  };
  const int = Math.floor(profile.winningBalance / 100);
  const remaining = profile.winningBalance - int * 100;
  const renderedRem = remaining < 10 ? `0${remaining}` : remaining;

  const intB = Math.floor(profile.balance / 100);
  const remainingB = profile.balance - intB * 100;
  const renderedRemB = remainingB < 10 ? `0${remainingB}` : remainingB;

  return (
    <div className="mb-4">
      <div className="flex align-center mb-2">
        <div className="mr-3 flex flex-col justify-between">
          <h1 className="text-green-500">Income: </h1>
          <h1 className="mb-1 text-yellow-500">Balance: </h1>
        </div>
        <div className="mr-3 flex flex-col justify-between">
          <Chip className="mb-1">
            {int}.{renderedRem}$
          </Chip>
          <Chip className="mt-1">
            {intB}.{renderedRemB}$
          </Chip>
        </div>
      </div>
      <Button onClick={topUpRedirect} size="sm" className="w-full">
        Top up
      </Button>
    </div>
  );
}
