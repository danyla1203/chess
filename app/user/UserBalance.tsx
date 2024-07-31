import { Button } from '@nextui-org/react';
import { Profile } from '../lib/context/UserContext';
import { stripeCheckout } from '../lib/request/stripeCheckout';

export function UserBalance({ profile }: { profile: Profile }) {
  const topUpRedirect = () => {
    stripeCheckout()?.then(({ url }) => {
      window.location.href = url;
    });
  };
  return (
    <div>
      <h1>Balance: {profile.balance / 100} USD</h1>
      <Button onClick={topUpRedirect}>Top up</Button>
    </div>
  );
}
