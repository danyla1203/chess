import { Button, ButtonGroup } from '@nextui-org/react';
import { useInteractions } from '../context/PlayersGameInteraction';

export function Controllers() {
  const { surrender, drawState, drawAccept, drawPurpose, drawReject } =
    useInteractions();

  let drawBtn;
  switch (drawState) {
    case 'waiting':
      drawBtn = <Button size="sm">Waiting...</Button>;
      break;
    case 'incoming':
      drawBtn = (
        <>
          <Button size="sm" onClick={drawAccept}>
            Accept draw
          </Button>
          <Button size="sm" onClick={drawReject}>
            Reject
          </Button>
        </>
      );
      break;
    default:
      drawBtn = (
        <Button size="sm" onClick={drawPurpose}>
          Draw
        </Button>
      );
  }
  return (
    <ButtonGroup>
      <Button size="sm" onClick={surrender}>
        Surrender
      </Button>
      {drawBtn}
      <Button size="sm">Revert</Button>
    </ButtonGroup>
  );
}
