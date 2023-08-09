import * as React from 'react';
import { Typography } from '@mui/material';
import { ConfiguratorMenu } from './Configurator';

import './GameConfiguration.scss';

function ConfigPanel({ time, increment, name, createGame }: any) {
  return (
    <div
      onClick={() => createGame('rand', time, increment)}
      className="configuration__item"
    >
      <Typography variant="h6" component="h3">
        {time}-{increment}
      </Typography>
      <Typography variant="h6" component="h3">
        {name}
      </Typography>
    </div>
  );
}

export function GameConfiguration({ createGame }: any) {
  return (
    <div className="configuration">
      <ConfigPanel
        time={1}
        increment={0}
        name="Bullet"
        createGame={createGame}
      />
      <ConfigPanel
        time={2}
        increment={1}
        name="Bullet"
        createGame={createGame}
      />
      <ConfigPanel
        time={3}
        increment={0}
        name="Blitz"
        createGame={createGame}
      />
      <ConfigPanel
        time={3}
        increment={2}
        name="Blitz"
        createGame={createGame}
      />
      <ConfigPanel
        time={5}
        increment={0}
        name="Blitz"
        createGame={createGame}
      />
      <ConfigPanel
        time={5}
        increment={3}
        name="Blitz"
        createGame={createGame}
      />
      <ConfigPanel
        time={10}
        increment={0}
        name="Rapid"
        createGame={createGame}
      />
      <ConfigPanel
        time={10}
        increment={5}
        name="Rapid"
        createGame={createGame}
      />
      <ConfigPanel
        time={15}
        increment={10}
        name="Rapid"
        createGame={createGame}
      />
      <ConfigPanel
        time={30}
        increment={0}
        name="Classical"
        createGame={createGame}
      />
      <ConfigPanel
        time={30}
        increment={20}
        name="Classical"
        createGame={createGame}
      />
      <ConfiguratorMenu createGame={createGame} />
    </div>
  );
}
