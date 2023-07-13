import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import './Navbar.scss';

export const Navbar = () => {
  const user = useSelector((state: any) => state.isAuthorized ? state.user : { name: 'Anonymous' });
  return (
    <div className='navbar'>
      <ul className='navbar__navigation'>
        <li className='navbar__navigation-item'>
          👾
        </li>
        <li className='navbar__navigation-item'>
          <Link to="/">Home</Link>
        </li>
        <li className='navbar__navigation-item'>
          <Link to="/login">Authorization</Link>
        </li>
      </ul>
      <div className='navbar__user'>
        <Link to={'/user'}><h3 className='navbar__user-name'>{user.name}</h3></Link>
      </div>
    </div>
  );
};