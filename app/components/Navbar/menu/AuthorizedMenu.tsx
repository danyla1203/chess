import { useUserState } from '@/context/UserContext';
import { userLogout } from '@/app/lib/request';
import { DropdownUi } from '@/ui/Dropdown';

export function AuthorizedMenu() {
  const { profile, removeUser } = useUserState();

  if (!profile) throw Error('No profile in User context');

  const logout = async () => {
    await userLogout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    removeUser();
  };
  const contents = [
    { href: '/user', name: 'Profile' },
    { href: 'logout', name: 'Logout', onclick: logout },
  ];
  return <DropdownUi label={profile.name} contents={contents} />;
}
