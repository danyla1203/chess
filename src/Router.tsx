import * as React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { EmailConfirmation } from './pages/Authorization/signup/EmailConfirmation';
import { GoogleConfirm } from './pages/Authorization/signup/GoogleConfirm';
import { Signup } from './pages/Authorization/signup/Signup';
import { LoginPage } from './pages/Authorization/Authorization';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { UserPage } from './pages/User/User';
import { GameList } from './pages/User/gamelist/GameList';

export function Router() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/complete-registration" element={<GoogleConfirm />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/user/games" element={<GameList />} />
      </Routes>
    </BrowserRouter>
  );
}
