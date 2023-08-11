import * as React from 'react';
import { Button, Link, SvgIcon, TextField } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { EmailConfirmed } from './CodeConfirm';
import { getGoogleUrl } from '../../../utils/getGoogleUrl';
import { sendVerificationEmailAction } from '../../../store/user';
import { useAppDispatch, useAppSelector } from '../../../store';
import './EmailConfirmation.scss';

export function EmailConfirmation() {
  const [email, setEmail] = React.useState('');
  const mailSended = useAppSelector(
    (state) => state.user.confirmationEmailSended,
  );
  const dispatch = useAppDispatch();

  if (mailSended) {
    return <EmailConfirmed email={email} />;
  }

  const submitEmail = () => {
    dispatch(sendVerificationEmailAction(email));
  };

  return (
    <div className="confirmation">
      <TextField
        label="Email"
        variant="filled"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
      />
      <Button variant="contained" onClick={submitEmail}>
        Confirm
      </Button>
      <div className="oauth">
        <SvgIcon component={GoogleIcon} color="primary" />
        <Link href={getGoogleUrl('')}>Google OAuth</Link>
      </div>
    </div>
  );
}
