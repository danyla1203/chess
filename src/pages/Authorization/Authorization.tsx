import * as React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';

import { Login } from './login/Login';
import { EmailConfirmation } from './signup/EmailConfirmation';

import './Authorization.scss';

export function LoginPage() {
  const [value, setValue] = React.useState(1);

  const isLoaded = useSelector(
    (state: any) => !!state.user.accessToken,
  );

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ) => {
    setValue(newValue);
  };

  if (isLoaded) return <Navigate to="/" />;
  return (
    <div className="authorization">
      <TabContext value={`${value}`}>
        <TabList
          onChange={handleChange}
          aria-label="lab API tabs example"
        >
          <Tab label="Login" value="1" />
          <Tab label="Sign up" value="2" />
        </TabList>
        <TabPanel value="1">
          <Login />
        </TabPanel>
        <TabPanel value="2">
          <EmailConfirmation />
        </TabPanel>
      </TabContext>
    </div>
  );
}
