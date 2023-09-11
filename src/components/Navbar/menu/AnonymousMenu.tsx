import * as React from 'react';
import { Button, ClickAwayListener, Menu, MenuItem } from '@mui/material';
import { Link } from 'react-router-dom';

export function AnonymousMenu({ anchor, handleClick, handleClose }: any) {
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
      <ClickAwayListener onClickAway={handleClose}>
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
      </ClickAwayListener>
    </>
  );
}
