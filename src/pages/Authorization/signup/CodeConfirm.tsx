import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import { confirmCode } from '../../../store/slices/user';

export const EmailConfirmed = ({ email }: any) => {
  const [ code, setCode ] = React.useState('');
  const isEmailConfirmed = useSelector((state: any) => state.user.emailConfirmed);
  const dispatch = useDispatch<any>();

  const submitCode = () => {
    dispatch(confirmCode({ code, email }));
  };

  if (isEmailConfirmed) return <Navigate to='/signup' />;

  return (
    <div>
      Check email and input code
      <input 
        placeholder={'Code:'} 
        type="text" value={code} 
        onChange={(e: any) => setCode(e.target.value)} 
      />
      <button onClick={submitCode}>Submit code</button>
    </div>
  );
};