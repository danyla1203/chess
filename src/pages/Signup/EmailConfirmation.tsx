import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { sendVerificationEmail } from '../../store/slices/user';
import { EmailConfirmed } from './CodeConfirm';
import { getGoogleUrl } from '../../utils/getGoogleUrl';

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
    <div>
      <input 
        placeholder={'Email:'} 
        type="text" value={email} 
        onChange={(e: any) => setEmail(e.target.value)} 
      />
      <button onClick={submitEmail}>Submit</button>
      <a  href={getGoogleUrl('')}>Google Signup</a>
    </div>
  );
};