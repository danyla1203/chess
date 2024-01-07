export const getProfile = async (accessToken: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return (
      await fetch(`${host}/user`, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
    ).json();
  } catch (e) {
    console.error(e);
    return e;
  }
};
