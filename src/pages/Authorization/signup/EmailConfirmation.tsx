import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Link, SvgIcon, TextField } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

import { EmailConfirmed } from './CodeConfirm';
import { getGoogleUrl } from '../../../utils/getGoogleUrl';
import { sendVerificationEmail } from '../../../store/slices/user';

import './EmailConfirmation.scss';

export const EmailConfirmation = () => {
  const [ email, setEmail ] = React.useState('');
  const mailSended = useSelector((state: any) => state.user.confirmationEmailSended);
  const dispatch = useDispatch<any>();
  
  if (mailSended) {
    return <EmailConfirmed email={email}/>; 
  }

  const submitEmail = () => {
    dispatch(sendVerificationEmail(email));
  };

  return (
    <div className='confirmation'>
      <TextField 
        label="Email"
        variant="filled" 
        value={email} 
        onChange={(e: any) => setEmail(e.target.value)}
      />
      <Button variant="contained" onClick={submitEmail}>Confirm</Button>
      <div className='oauth'>
        <SvgIcon component={GoogleIcon} color='primary'/>
        <Link href={getGoogleUrl('')}>Google OAuth</Link>
      </div>
    </div>
  );
};