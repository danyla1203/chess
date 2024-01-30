'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUser } from '@/requests';
import { useUserState } from '@/context/UserContext';
import { useNotification } from '@/context/NotificationContext';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Input,
} from '@nextui-org/react';

export function SignupForm() {
  const [userName, setName] = useState('');
  const [password, setPassword] = useState('');
  const { updateUser } = useUserState();
  const { addNotification } = useNotification();

  const email = useSearchParams().get('email');
  const router = useRouter();

  const signUp = async () => {
    const res = await createUser(email || '', userName, password);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      const { profile, access, refresh } = res;
      updateUser(profile);
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      router.push('/');
    }
  };

  return (
    <Card className="z-10">
      <CardHeader>
        <h1 className="w-full text-4xl">Sign up for an account</h1>
      </CardHeader>
      <CardBody>
        <Chip>{email}</Chip>
        <div className="w-full mt-6 mr-0 mb-0 ml-0 relative space-y-4">
          <Input
            placeholder="Username"
            size="sm"
            value={userName}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Password"
            size="sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </CardBody>
      <CardFooter>
        <Button onClick={signUp} fullWidth color="primary" variant="ghost">
          Submit
        </Button>
      </CardFooter>
    </Card>
  );
}
