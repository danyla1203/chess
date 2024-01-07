export const userLogout = async () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  try {
    return (
      await fetch(`${host}/auth/logout`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + access,
          'Content-Type': 'application/json',
        },
      })
    ).json();
  } catch (e) {
    console.error('Logout failed');
  }
};
