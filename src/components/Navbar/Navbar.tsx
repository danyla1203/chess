import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import './Navbar.scss';

export const Navbar = () => {
  const user = useSelector((state: any) => state.user);
  return (
    <div className='navbar'>
      <ul className='navbar__navigation'>
        <li className='navbar__navigation-item'>
          <Link to="/">Home</Link>
        </li>
        <li className='navbar__navigation-item'>
          <Link to="/login">Login</Link>
        </li>
      </ul>
      <div className='navbar__user'>
        <h3 className='navbar__user-name'>{user.name}</h3>
      </div>
    </div>
  );
};