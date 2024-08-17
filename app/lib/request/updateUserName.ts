import axios from 'axios';

export const updateUserName = (newName: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  console.log(host);
  try {
    return axios.patch(
      `${host}/user`,
      { name: newName },
      { headers: { Authorization: `Bearer ${access}` } },
    );
  } catch (e) {
    console.error(e);
  }
};
