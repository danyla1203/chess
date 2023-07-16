import * as React from 'react';
import { useSelector } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { EmailConfirmation } from './pages/Authorization/signup/EmailConfirmation';
import { GoogleConfirm } from './pages/Authorization/signup/GoogleConfirm';
import { Signup } from './pages/Authorization/signup/Signup';
import { LoginPage } from './pages/Authorization/Authorization';
import { MainPage } from './pages/Main/Main';
import { Navbar } from './components/Navbar/Navbar';
import { UserPage } from './pages/User/User';

export const Router = () => {
  const wsStatus = useSelector((state: any) => state.wsConnection);
  if (wsStatus) {
    return (
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/complete-registration" element={<GoogleConfirm />}/>
          <Route path='/user' element={<UserPage />} />
        </Routes>
      </BrowserRouter>
    );
  }
};