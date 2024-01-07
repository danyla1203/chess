'use client';
import React, { createContext, useContext, useState } from 'react';

type Notification = {
  id: number;
  type: 'error' | 'info';
  message: string;
};

type NotificationsState = {
  notifications: Notification[];
  addNotification: (type: 'error' | 'info', message: string) => void;
};

export const NotificationContext = createContext<NotificationsState>({
  notifications: [],
  addNotification: () => {
    throw new Error('Notifications context is not set');
  },
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsState: NotificationsState = {
    notifications: [...notifications],
    addNotification: (type: 'error' | 'info', message: string) => {
      const id = Math.floor(Math.random() * 10000);
      setNotifications([...notifications, { id, type, message }]);
      setTimeout(() => {
        setNotifications((prevNotifications) =>
          prevNotifications.filter((n) => n.id !== id),
        );
      }, 3000);
    },
  };

  return (
    <NotificationContext.Provider value={notificationsState}>
      {children}
    </NotificationContext.Provider>
  );
};
