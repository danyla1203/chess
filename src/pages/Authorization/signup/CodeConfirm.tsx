import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import { confirmCode } from '../../../store/slices/user';
import { Button, TextField, Typography } from '@mui/material';
import './CodeConfirm.scss';

export const EmailConfirmed = ({ email }: any) => {
  const [ code, setCode ] = React.useState('');
  const isEmailConfirmed = useSelector((state: any) => state.user.emailConfirmed);
  const dispatch = useDispatch<any>();

  const submitCode = () => {
    dispatch(confirmCode({ code, email }));
  };

  if (isEmailConfirmed) return <Navigate to='/signup' />;

  return (
    <div className='code-confirm'>
      <Typography gutterBottom variant='h5'>
        Check email and input code
      </Typography>
      <TextField 
        label="Email"
        variant="filled" 
        value={email} 
        onChange={(e: any) => setCode(e.target.value)}
      />
      <Button variant="contained" onClick={submitCode}>Confirm</Button>
    </div>
  );
};