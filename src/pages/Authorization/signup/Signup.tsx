import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import './Signup.scss';
import { signUpRequest } from '../../../store/slices/user';
import { Button, TextField, Typography } from '@mui/material';

export const Signup = () => {
  const [ password, setPassword ] = React.useState('');
  const [ name, setName ] = React.useState(useSelector((state: any) => state.user.name));
  const email = useSelector((state: any) => state.user.email);
  const isLoaded = useSelector((state: any) => !!state.user.accessToken);
  const isEmailConfirmed = useSelector((state: any) => state.user.emailConfirmed);
  const dispatch = useDispatch<any>();

  if (!isEmailConfirmed) return <Navigate to='/login' />;

  const signup = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = JSON.stringify({ email, password, deviceId, name });
    dispatch(signUpRequest(payload));
  };

  if (isLoaded) return <Navigate to='/' />;
  return (
    <div className="signup__container">
      <Typography gutterBottom variant='h5'>
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
      <Button variant="contained" onClick={signup}>Create account</Button>
    </div>
  );
};