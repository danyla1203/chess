import * as React from 'react';
import { Alert } from '@mui/material';
import { clearError } from '../../store/slices/errors';
import { useAppDispatch, useAppSelector } from '../../store';
import './Notifications.scss';

function Notification({ code, text }: any) {
  return (
    <div className="notifications__item">
      <h3 className="notifications__item__text">
        {code} {text}
      </h3>
    </div>
  );
}

export function Notifications(): any {
  const errors: any[] = useAppSelector((state) => state.errors.errors);
  const dispatch = useAppDispatch();

  const renderedErrors = [];
  for (const error of errors) {
    renderedErrors.push(<Notification text={error.error} code={error.code} />);
    setTimeout(() => {
      dispatch(clearError(error));
    }, 3500);
  }
  return (
    <div className="notifications">
      {errors.map(({ code, error }) => (
        <Alert severity="error">
          {code} - {error}
        </Alert>
      ))}
    </div>
  );
}
