'use client';

import { useSearchParams } from 'next/navigation';
import { Success } from './Success';
import { Failed } from './Failed';

export function PaymentResultNotification() {
  const searchParams = useSearchParams();

  const search = searchParams.get('success');
  return search === 'true' ? <Success /> : <Failed />;
}
