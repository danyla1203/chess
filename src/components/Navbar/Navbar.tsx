import * as React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Profile } from './Profile';
import './Navbar.scss';

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
