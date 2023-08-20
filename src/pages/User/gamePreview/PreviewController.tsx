import * as React from 'react';
import { Button } from '@mui/material';
import { useAppDispatch } from '../../../store';
import { nextFrame, prevFrame } from '../../../store/game';

export function PreviewController() {
  const dispatch = useAppDispatch();
  return (
    <div className="game-preview__right-menu">
      <Button onClick={() => dispatch(nextFrame())}>Next</Button>
      <Button onClick={() => dispatch(prevFrame())}>Back</Button>
    </div>
  );
}
