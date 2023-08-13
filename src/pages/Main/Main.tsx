import * as React from 'react';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Tab } from '@mui/material';
import { GameConfiguration } from './gameConfiguration/GameConfiguration';
import { GameList } from './GameList';
import { Game } from '../Game/Game';
import { useAppDispatch, useAppSelector } from '../../store';
import { createGameAction } from '../../store/slices/gamelist';

export function MainPage() {
  const [value, setValue] = React.useState(1);
  const isWaitingForGame = useAppSelector(
    ({ gameList }) => gameList.isWaitingForPlayer,
  );
  const dispatch = useAppDispatch();

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const createGame = (side: 'w' | 'b' | 'rand', minutes, timeIncrement) => {
    const body = {
      side,
      time: minutes * 60 * 1000,
      timeIncrement: timeIncrement * 1000,
    };
    dispatch(createGameAction(body));
  };

  return (
    <main>
      <TabContext value={`${value}`}>
        <TabList onChange={handleChange} aria-label="lab API tabs example">
          <Tab label="Create" value="1" />
          <Tab label="Lobby" value="2" />
          {isWaitingForGame === false && <Tab label="Game" value="3" />}
        </TabList>
        <TabPanel value="1">
          <GameConfiguration createGame={createGame} />
        </TabPanel>
        <TabPanel value="2">
          <GameList />
        </TabPanel>
        {isWaitingForGame === false && (
          <TabPanel value="3">
            <Game />
          </TabPanel>
        )}
      </TabContext>
    </main>
  );
}
