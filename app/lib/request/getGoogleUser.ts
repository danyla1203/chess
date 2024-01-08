export const getGoogleProfile = async (code: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return (
      await fetch(`${host}/auth/google/oauth`, {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
  } catch (e) {
    console.error('Login failed');
  }
};
