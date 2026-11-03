'use client';

import { NotificationStack } from '@chess/ui';
import { useNotification } from '@/context/NotificationContext';

export function Notifications() {
  const { notifications } = useNotification();

  return <NotificationStack notifications={notifications} />;
}
