import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '../../store/slices/errors';
//import { clearError } from '../../store/slices/errors';

import './Notifications.scss';
import { Alert } from '@mui/material';

const Notification = ({ code, text }: any) => {
  return (
    <div className='notifications__item'>
      <h3 className='notifications__item__text'>{code} {text}</h3>
    </div>
  );
};

export const Notifications = (): any => {
  const errors: any[] = useSelector((state: any) => state.errors.errors);
  const dispatch = useDispatch();
  
  const renderedErrors = [];
  for (const error of errors) {
    renderedErrors.push(<Notification text={error.error} code={error.code} />);
    setTimeout(() => {
      dispatch(clearError(error));
    }, 3500);
  }
  return (
    <div className='notifications'>
      { errors.map(({ code, error }) => <Alert severity="error">{code} - {error}</Alert>) }
    </div>
  );
};