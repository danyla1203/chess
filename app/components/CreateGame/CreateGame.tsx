'use client';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  ButtonGroup,
  Button,
} from '@nextui-org/react';
import { Emit, useWebSocket } from '@/context/SocketContext';
import { Slider } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateGame() {
  const [minutes, setMinutes] = useState(6);
  const [timeAdd, setTimeAdd] = useState(15);

  const socket = useWebSocket();
  const router = useRouter();

  const create = (side: string) => {
    const body = {
      side,
      time: minutes * 60 * 1000,
      timeIncrement: timeAdd * 1000,
    };
    socket.volatile.emit(Emit.createGame, { ...body });
    router.push('/game');
  };

  return (
    <div className="basis-2/5 ml-2">
      <Card>
        <CardHeader>
          <h1>Create game</h1>
        </CardHeader>
        <Divider />
        <CardBody className="mt-2">
          <Slider
            label="Max Time - minutes"
            size="md"
            color="warning"
            step={0.5}
            maxValue={15}
            minValue={0.5}
            aria-label="Max time"
            className="max-w-md"
            value={minutes}
            onChange={setMinutes}
          />
          <Slider
            label="Time increment - seconds"
            size="md"
            color="warning"
            step={1}
            maxValue={60}
            minValue={0}
            aria-label="Time increment"
            className="max-w-md mt-5"
            value={timeAdd}
            onChange={setTimeAdd}
          />
        </CardBody>
        <Divider />
        <CardFooter>
          <ButtonGroup fullWidth={true} variant="bordered" className="mt-0.5">
            <Button onPress={() => create('w')}>W</Button>
            <Button onPress={() => create('b')}>B</Button>
            <Button onPress={() => create('rand')}>Rand</Button>
          </ButtonGroup>
        </CardFooter>
      </Card>
    </div>
  );
}
