import queryString from 'query-string';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { googleAuthAction } from '../../../store/slices/user';

export const GoogleConfirm = () => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const isEmailConfirmed = useSelector((state: any) => state.user.emailConfirmed);

  React.useEffect(() => {
    dispatch(googleAuthAction(code as string));
  }, []);

  if (isEmailConfirmed) return <Navigate to='/signup' />;

  const { code } = queryString.parse(location.search);
  if (!code) return <Navigate to="/" />;
  
  return (
    <div>Loading...</div>
  );
};