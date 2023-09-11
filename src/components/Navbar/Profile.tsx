import * as React from 'react';
import { useAppSelector } from '../../store';
import { AnonymousMenu } from './menu/AnonymousMenu';
import { AuthorizedMenu } from './menu/AuthorizedMenu';

export function Profile() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const isAuthorized = useAppSelector(({ user }) => user.authorized);

  const click = (event) => {
    if (anchorEl !== event.currentTarget) {
      setAnchorEl(event.currentTarget);
    }
  };
  const close = () => setAnchorEl(null);

  return (
    <div className="navbar__user">
      {isAuthorized ? (
        <AuthorizedMenu
          handleClick={click}
          handleClose={close}
          anchor={anchorEl}
          setAnchor={setAnchorEl}
        />
      ) : (
        <AnonymousMenu
          handleClick={click}
          handleClose={close}
          anchor={anchorEl}
          setAnchor={setAnchorEl}
        />
      )}
    </div>
  );
}
