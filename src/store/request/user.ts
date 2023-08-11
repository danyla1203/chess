import { config } from '../../config';
import { GetRequest } from '../tools';
import { responseCheck } from '../tools/responseCheck';

export const userGameList = async (token: string) => {
  const req = await fetch(
    `${config.apiHost}/user/games`,
    GetRequest(token),
  );
  return responseCheck(req);
};

export const getProfile = async (token: string) => {
  const req = await fetch(
    `${config.apiHost}/user`,
    GetRequest(token),
  );
  return responseCheck(req);
};
