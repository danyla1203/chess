import * as React from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import './Navbar.scss';
import { logoutAction } from '../../store/user';

function AnonymousMenu({ anchor, handleClick, handleClose }: any) {
  return (
    <>
      <Button
        aria-owns={anchor ? 'simple-menu' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        onMouseOver={handleClick}
      >
        Anonymous
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        MenuListProps={{ onMouseLeave: handleClose }}
        id="navbar__user__dropdown"
      >
        <MenuItem onClick={handleClose}>
          <Link to="/signup">Login</Link>
        </MenuItem>
      </Menu>
    </>
  );
}
function AuthorizedMenu({ anchor, setAnchor, handleClick, handleClose }: any) {
  const userName = useAppSelector(({ user }) => user.name);
  const dispatch = useAppDispatch();

  const logout = () => {
    dispatch(logoutAction());
    setAnchor(null);
  };
  return (
    <>
      <Button
        aria-owns={anchor ? 'simple-menu' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        onMouseOver={handleClick}
      >
        {userName}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        MenuListProps={{ onMouseLeave: handleClose }}
        id="navbar__user__dropdown"
      >
        <MenuItem onClick={handleClose}>
          <Link to="/user">Profile</Link>
        </MenuItem>
        <MenuItem onClick={logout}>Logout</MenuItem>
      </Menu>
    </>
  );
}

function Profile() {
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

export function Navbar() {
  const isAuthorized = useAppSelector(({ user }) => user.authorized);
  return (
    <div className="navbar">
      <ul className="navbar__navigation">
        <li className="navbar__navigation-item">👾</li>
        <li className="navbar__navigation-item">
          <Link to="/">Home</Link>
        </li>
        {!isAuthorized && (
          <li className="navbar__navigation-item">
            <Link to="/login">Authorization</Link>
          </li>
        )}
      </ul>
      <Profile />
    </div>
  );
}
