import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { loginRequest } from '../../store/slices/tokens';

export const LoginPage = () => {
  const [ email, setEmail ] = React.useState('');
  const [ password, setPassword ] = React.useState('');
  const err = useSelector((state: any) => state.tokens.error);
  const isLoaded = useSelector((state: any) => !!state.tokens.accessToken);
  const dispatch = useDispatch<any>();

  const login = () => {
    const deviceId: string = (Math.random() + 1).toString(36).substring(7);
    const payload = JSON.stringify({ email, password, deviceId });
    dispatch(loginRequest(payload));
  };
  
  if (isLoaded) return <Navigate to='/'/>;
  return (
    <div className='login'>
      <div className="login__container">
        <input value={email} onChange={(e: any) => setEmail(e.target.value)}/>
        <input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
        <button onClick={login}>Login</button>
      </div>
      { err.text }
    </div>
  );
};