import React from 'react';

import { Navbar, Notifications } from '@/ui';
import { UserProvider } from '@/context/UserContext';
import { WebSocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';

import './globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <NotificationProvider>
          <UserProvider>
            <Navbar />
            <Notifications />
            <WebSocketProvider>{children}</WebSocketProvider>
          </UserProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
