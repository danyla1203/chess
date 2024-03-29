import user, {
  setUserData,
  viewGame,
  closeGame,
  closeGameAction,
} from './user.slice';
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
  viewGame,
  closeGame,
  closeGameAction,
};

export default user;
