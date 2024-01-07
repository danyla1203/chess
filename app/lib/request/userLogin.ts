type LoginData = {
  email: string;
  password: string;
};

export const userLogin = async (data: LoginData) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const randomString =
    Math.random().toString(20).substring(2, 14) +
    Math.random().toString(20).substring(2, 14);
  const deviceId = `${userAgent}-${platform}-${randomString}`;
  try {
    return (
      await fetch(`${host}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ ...data, deviceId }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
  } catch (e) {
    console.error(e);
    return e;
  }
};
