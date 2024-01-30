import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { emailVerification } from '@/requests';
import { Button, Divider, Input } from '@nextui-org/react';
import { GoogleIcon } from '@/app/components/icons/Google';

export function EmailInput() {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const { addNotification } = useNotification();

  const verifyEmail = async () => {
    const res = await emailVerification(email);

    if (res.message === 'ok') {
      router.push(
        `/authorization/signup/confirm-code?code=${res.code}&email=${res.email}`,
      );
    } else addNotification('error', res.message);
  };
  return (
    <div className="flex flex-col space-y-5">
      <Input
        type="text"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button color="primary" onClick={verifyEmail} type="button">
        Confirm email
      </Button>
      <Divider />
      <Button color="primary" variant="ghost" startContent={<GoogleIcon />}>
        Sign in with Google
      </Button>
    </div>
  );
}
