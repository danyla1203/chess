export const getGooguleOauthLink = async () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return (
      await fetch(`${host}/auth/google/oauth/link`, {
        method: 'GET',
      })
    ).json();
  } catch (e) {
    console.error('Login failed');
  }
};
