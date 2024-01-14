import React from 'react';

import { Navbar, Notifications } from '@/app/components';
import { UserProvider } from '@/context/UserContext';
import { WebSocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { GameListProvider } from '@/context/GameListContext';

import './globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <script async src="http://localhost:8097"></script>
      <body>
        <NotificationProvider>
          <UserProvider>
            <Navbar />
            <Notifications />
            <WebSocketProvider>
              <GameListProvider>{children}</GameListProvider>
            </WebSocketProvider>
          </UserProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
