'use client';
import { Emit, useWebSocket } from '@/app/lib/context/SocketContext';
import {
  Button,
  ButtonGroup,
  Slider,
  Typography,
  Input,
  Box,
  Grid,
} from '@mui/material';
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
    socket.emit(Emit.createGame, { ...body });
    router.push('/game');
  };

  return (
    <div className="basis-2/5">
      <Box sx={{ width: 400 }}>
        <Typography gutterBottom variant="h6">
          Minutes per side
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              defaultValue={10}
              max={180}
              min={1}
              onChange={(e: any) => setMinutes(e.target.value)}
              value={minutes}
            />
          </Grid>
          <Grid item>
            <Input
              value={minutes}
              size="medium"
              onChange={(e: any) => setMinutes(e.target.value)}
              inputProps={{
                step: 1,
                min: 1,
                max: 38,
                type: 'number',
                'aria-labelledby': 'input-slider',
              }}
            />
          </Grid>
        </Grid>

        <Typography gutterBottom variant="h6">
          Increment in seconds
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              defaultValue={10}
              max={180}
              min={0}
              onChange={(e: any) => setTimeAdd(e.target.value)}
              value={timeAdd}
            />
          </Grid>
          <Grid item>
            <Input
              value={timeAdd}
              size="medium"
              onChange={(e: any) => setTimeAdd(e.target.value)}
              inputProps={{
                step: 1,
                min: 1,
                max: 38,
                type: 'number',
                'aria-labelledby': 'input-slider',
              }}
            />
          </Grid>
        </Grid>
      </Box>
      <ButtonGroup
        variant="outlined"
        aria-label="outlined primary button group"
        size="large"
        sx={{ marginTop: 5 }}
      >
        <Button onClick={() => create('w')}>White</Button>
        <Button onClick={() => create('b')}>Black</Button>
        <Button onClick={() => create('rand')}>Random</Button>
      </ButtonGroup>
    </div>
  );
}
