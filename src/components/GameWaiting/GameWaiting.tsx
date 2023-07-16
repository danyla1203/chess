import * as React from 'react';
import { CircularProgress, Typography } from '@mui/material';
import { useSelector } from 'react-redux';

import './GameWaiting.scss';

export const GameWaiting = () => {
  const isWaiting = useSelector((state: any) => state.game.isWaiting);
  return isWaiting && (
    <div className="game-waiting">
      <Typography variant="h5" component='h3'>Waiting for game</Typography>
      <CircularProgress size={65} />
    </div>
  );
};