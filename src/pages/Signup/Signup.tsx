import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { signUpRequest } from '../../store/slices/user';

import './Signup.scss';

export const Signup = () => {
  const [ email, setEmail ] = React.useState('');
  const [ name, setName ] = React.useState('');
  const [ password, setPassword ] = React.useState('');
  const err = useSelector((state: any) => state.user.error);
  const isLoaded = useSelector((state: any) => !!state.user.accessToken);
  const dispatch = useDispatch<any>();

  const signup = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = JSON.stringify({ email, password, deviceId, name });
    dispatch(signUpRequest(payload));
  };

  if (isLoaded) return <Navigate to='/' />;
  return (
    <div className="signup">
      <div className="signup__container">
        <input placeholder={'Name:'} type="text" value={name} onChange={(e: any) => setName(e.target.value)}/>
        <input placeholder={'Email:'} type="text" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <input placeholder={'Password:'} type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
        <button onClick={signup}>Sign up</button>
      </div>
      {err.text}
    </div>
  );
};