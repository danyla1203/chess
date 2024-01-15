import Link from 'next/link';
import { useUserState } from '@/context/UserContext';
import { userLogout } from '@/app/lib/request';
import { Dropdown } from '@/ui/Dropdown';

export function AuthorizedMenu() {
  const { profile, removeUser } = useUserState();

  if (!profile) throw Error('No profile in User context');

  const logout = async () => {
    await userLogout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    removeUser();
  };
  return (
    <Dropdown label={profile.name}>
      <Link
        className="block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        href="/user"
      >
        Profile
      </Link>
      <button
        onClick={logout}
        className="block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Logout
      </button>
    </Dropdown>
  );
}
