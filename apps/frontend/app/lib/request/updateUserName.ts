import axios from 'axios';
import type { UpdateUserRequest } from '@chess/contract';

export const updateUserName = (newName: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  console.log(host);
  const body: UpdateUserRequest = { name: newName };
  return axios.patch(`${host}/user`, body, {
    headers: { Authorization: `Bearer ${access}` },
  });
};
