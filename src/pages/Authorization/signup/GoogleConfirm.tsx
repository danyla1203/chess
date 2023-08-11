import queryString from 'query-string';
import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { googleAuthAction } from '../../../store/user';
import { useAppDispatch, useAppSelector } from '../../../store';

export function GoogleConfirm() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isEmailConfirmed = useAppSelector((state) => state.user.emailConfirmed);

  const { code } = queryString.parse(location.search);
  if (!code) return <Navigate to="/" />;

  React.useEffect(() => {
    dispatch(googleAuthAction(code as string));
  }, []);

  if (isEmailConfirmed) return <Navigate to="/signup" />;

  return <div>Loading...</div>;
}
