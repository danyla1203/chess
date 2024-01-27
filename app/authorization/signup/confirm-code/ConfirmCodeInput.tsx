'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { codeConfirm } from '@/requests';
import { useNotification } from '@/context/NotificationContext';
import { Button, Input } from '@nextui-org/react';

export function ConfirmCodeInput() {
  const [code, setCode] = useState('');
  const router = useRouter();
  const { addNotification } = useNotification();

  const email = useSearchParams().get('email');

  const verifyCode = async () => {
    const res = await codeConfirm(code, email || '');
    if (res.message === 'ok') {
      router.push(`/authorization/signup/complete-signup?email=${email}`);
    } else addNotification('error', res.message);
  };
  return (
    <div className="flex flex-col max-w-md space-y-5">
      <Input
        type="text"
        placeholder="Code"
        value={code}
        size="sm"
        onChange={(e) => setCode(e.target.value)}
      />
      <Button onClick={verifyCode} variant="ghost" color="primary">
        Confirm email address
      </Button>
      <div className="flex justify-center items-center">
        <span className="w-full border border-black"></span>
      </div>
    </div>
  );
}
