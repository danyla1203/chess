import React from 'react';

import { NavbarMenu, Notifications, PendingGame } from '@/components';
import { UserProvider } from '@/context/UserContext';
import { WebSocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { GameListProvider } from '@/context/GameListContext';

import './globals.css';
import { NextuiProviders } from './nextui.provider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <script async src="http://localhost:8097"></script>
      <body>
        <NextuiProviders>
          <NotificationProvider>
            <UserProvider>
              <NavbarMenu />
              <Notifications />
              <WebSocketProvider>
                <GameListProvider>
                  <PendingGame />
                  {children}
                </GameListProvider>
              </WebSocketProvider>
            </UserProvider>
          </NotificationProvider>
        </NextuiProviders>
      </body>
    </html>
  );
}
