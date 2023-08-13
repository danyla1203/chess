import * as React from 'react';
import { Button } from '@mui/material';
import {
  acceptDrawPurpose,
  rejectDrawPurpose,
  sendDrawPurpose,
  surrenderAction,
} from '../../../store/game';
import { useAppDispatch, useAppSelector } from '../../../store';

function BaseState({
  surrender,
  drawPurpose,
}: {
  surrender: () => void;
  drawPurpose: () => void;
}) {
  return (
    <>
      <Button variant="contained" onClick={surrender}>
        Surrender
      </Button>
      <Button variant="contained" onClick={drawPurpose}>
        Draw
      </Button>
    </>
  );
}
function PurposeSent({ reject }: { reject: () => void }) {
  return (
    <>
      <Button variant="contained" onClick={reject}>
        Reject Draw
      </Button>
      <h3>Waiting for player</h3>
    </>
  );
}
function AcceptDraw({
  accept,
  reject,
}: {
  accept: () => void;
  reject: () => void;
}) {
  return (
    <>
      <Button variant="contained" onClick={accept}>
        Accept Draw
      </Button>
      <Button variant="contained" onClick={reject}>
        Reject Draw
      </Button>
    </>
  );
}

export function GameButtons() {
  const purposeReceived = useAppSelector(
    (state) => state.game.draw.purposeReceived,
  );
  const purposeSent = useAppSelector(({ game }) => game.draw.purposeSent);
  const dispatch = useAppDispatch();

  const drawPurpose = () => dispatch(sendDrawPurpose());
  const surrender = () => dispatch(surrenderAction());
  const acceptDraw = () => dispatch(acceptDrawPurpose());
  const reject = () => dispatch(rejectDrawPurpose());

  if (purposeReceived) {
    return (
      <div className="game__right-menu__buttons">
        <AcceptDraw reject={reject} accept={acceptDraw} />
      </div>
    );
  }

  if (purposeSent) {
    return (
      <div className="game__right-menu__buttons">
        <PurposeSent reject={reject} />
      </div>
    );
  }

  return (
    <div className="game__right-menu__buttons">
      <BaseState surrender={surrender} drawPurpose={drawPurpose} />
    </div>
  );
}
