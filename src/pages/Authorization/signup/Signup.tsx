import * as React from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, TextField, Typography } from '@mui/material';
import { signUpAction } from '../../../store/user';
import { useAppDispatch, useAppSelector } from '../../../store';
import './Signup.scss';

export function Signup() {
  const [password, setPassword] = useState('');
  const [name, setName] = useState(useAppSelector((state) => state.user.name));
  const email = useAppSelector((state) => state.user.email);
  const isLoaded = useAppSelector((state) => !!state.user.accessToken);
  const isEmailConfirmed = useAppSelector((state) => state.user.emailConfirmed);
  const dispatch = useAppDispatch();

  if (!isEmailConfirmed) return <Navigate to="/login" />;

  const signup = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = { email, password, deviceId, name };
    dispatch(signUpAction(payload));
  };

  if (isLoaded) return <Navigate to="/" />;
  return (
    <div className="signup__container">
      <Typography gutterBottom variant="h5">
        {email}
      </Typography>
      <TextField
        label="Name"
        variant="filled"
        value={name}
        onChange={(e: any) => setName(e.target.value)}
      />
      <TextField
        label="Password"
        variant="filled"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
      />
      <Button variant="contained" onClick={signup}>
        Create account
      </Button>
    </div>
  );
}
