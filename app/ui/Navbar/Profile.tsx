'use client';

import { useState } from 'react';
import { AnonymousMenu } from './menu/AnonymousMenu';
import { AuthorizedMenu } from './menu/AuthorizedMenu';
import { useUserState } from '@/context/UserContext';

export function Profile() {
  const [anchorEl, setAnchorEl] = useState(null);

  const { profile } = useUserState();
  const click = (event: any) => {
    if (anchorEl !== event.currentTarget) {
      setAnchorEl(event.currentTarget);
    }
  };
  const close = () => setAnchorEl(null);

  return (
    <div className="navbar__user">
      {profile ? (
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
