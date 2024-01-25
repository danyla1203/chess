export const getProfile = async (accessToken: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    const user = await (
      await fetch(`${host}/user`, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
    ).json();
    const games = await (
      await fetch(`${host}/user/games`, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
        },
      })
    ).json();
    return { ...user, ...games, isAuthorized: true };
  } catch (e) {
    console.error(e);
    return e;
  }
};
