import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Chip,
} from '@nextui-org/react';
import { useConfigContext } from '../context';
import { usePlayerConnection } from '../context/PlayerConnection';
import { useStrikedFigures } from '../context/Striked';
import { TimersController } from './Timers.controller';

function Striked({ figure, side }: { figure: string; side: 'w' | 'b' }) {
  return (
    <div
      className={`w-7 h-7 bg-center bg-cover ${figure.replace(
        /\d/,
        '',
      )} ${side}`}
      key={`${figure}-b`}
    />
  );
}

export function RightMenu() {
  const strikedFigures = useStrikedFigures();
  const { side } = useConfigContext();
  const online = usePlayerConnection()[side];

  const strikedW = strikedFigures.w.map((f) => (
    <Striked side="w" key={f} figure={f} />
  ));
  const strikeB = strikedFigures.b.map((f) => (
    <Striked side="b" key={f} figure={f} />
  ));

  const onlineSymb = (
    <div
      className={`mr-1 w-4 h-4 ${
        online ? 'bg-blue-500' : 'bg-red-500'
      } rounded-full`}
    ></div>
  );

  return (
    <div className="ml-3 flex flex-col h-full">
      <Card className="mb-3">
        <CardHeader className="flex justify-center">
          <h5 className="mr-2">Anonymous</h5>
          <Chip startContent={onlineSymb}>
            {online ? 'Online' : 'User offline'}
          </Chip>
        </CardHeader>
      </Card>
      <Card className="mb-3">
        <CardBody className={side === 'b' ? `bg-slate-100` : ''}>
          {side === 'w' ? <div>{strikedW}</div> : <div>{strikeB}</div>}
        </CardBody>
      </Card>
      <Card className="flex flex-col rounded-b-none border-b-0">
        <CardBody>
          <TimersController />
        </CardBody>
      </Card>
      <Card className="rounded-t-none border-0 mb-3">
        <CardBody className="border-t-0">
          <ButtonGroup>
            <Button size="sm">Surrender</Button>
            <Button size="sm">Draw</Button>
            <Button size="sm">Revert</Button>
          </ButtonGroup>
        </CardBody>
      </Card>
      <Card>
        <CardBody className={side === 'w' ? `bg-slate-100` : ''}>
          {side === 'w' ? <div>{strikeB}</div> : <div>{strikedW}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
