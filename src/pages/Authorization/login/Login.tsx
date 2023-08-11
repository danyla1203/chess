import * as React from 'react';
import { useDispatch } from 'react-redux';
import './Login.scss';
import { Button, TextField } from '@mui/material';
import { loginAction } from '../../../store/user';

export function Login() {
  const dispatch = useDispatch<any>();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const login = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = { email, password, deviceId };
    dispatch(loginAction(payload));
  };
  return (
    <div className="login__container">
      <TextField
        label="Email"
        variant="filled"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        variant="filled"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
      />
      <Button variant="contained" onClick={login}>
        Login
      </Button>
    </div>
  );
}
