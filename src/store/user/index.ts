import user, { setUserData } from './user.slice';
import {
  getUserByRefreshAction,
  loginAction,
  signUpAction,
  logoutAction,
  userGameListAction,
  sendVerificationEmailAction,
  confirmCodeAction,
  googleAuthAction,
} from './user.thunks';

export {
  setUserData,
  getUserByRefreshAction,
  loginAction,
  signUpAction,
  logoutAction,
  userGameListAction,
  sendVerificationEmailAction,
  confirmCodeAction,
  googleAuthAction,
};

export default user;
