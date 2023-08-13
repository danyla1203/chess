import * as React from 'react';
import { CircularProgress, Typography } from '@mui/material';
import { useAppSelector } from '../../store';
import './GameWaiting.scss';

export function GameWaiting() {
  const isWaiting = useAppSelector(
    ({ gameList }) => gameList.isWaitingForPlayer,
  );
  return (
    isWaiting && (
      <div className="game-waiting">
        <Typography variant="h5" component="h3">
          Waiting for game
        </Typography>
        <CircularProgress size={65} />
      </div>
    )
  );
}
