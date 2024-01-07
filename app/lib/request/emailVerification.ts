export const emailVerification = async (email: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return (
      await fetch(`${host}/auth/send-verification-mail`, {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
  } catch (e) {
    console.error('Login failed');
  }
};
