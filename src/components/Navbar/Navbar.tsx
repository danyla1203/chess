import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const user = useSelector((state: any) => state.user);
  return (
    <div id='navbar'>
      <h3>{ user.name }</h3>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
      </ul>
    </div>
  );
};