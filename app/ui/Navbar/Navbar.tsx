import Link from 'next/link';

import { Profile } from './Profile';
import './Navbar.scss';

export function Navbar() {
  return (
    <div className="navbar">
      <ul className="navbar__navigation">
        <li className="navbar__navigation-item">👾</li>
        <li className="navbar__navigation-item">
          <Link href="/">Home</Link>
        </li>
      </ul>
      <Profile />
    </div>
  );
}
