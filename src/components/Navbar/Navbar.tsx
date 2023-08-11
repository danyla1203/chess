import * as React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store';
import './Navbar.scss';

export function Navbar() {
  const userName = useAppSelector((state) =>
    state.user.authorized ? state.user.name : 'Anonymous',
  );
  return (
    <div className="navbar">
      <ul className="navbar__navigation">
        <li className="navbar__navigation-item">👾</li>
        <li className="navbar__navigation-item">
          <Link to="/">Home</Link>
        </li>
        <li className="navbar__navigation-item">
          <Link to="/login">Authorization</Link>
        </li>
      </ul>
      <div className="navbar__user">
        <Link to="/user">
          <h3 className="navbar__user-name">{userName}</h3>
        </Link>
      </div>
    </div>
  );
}
