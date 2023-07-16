import * as React from 'react';
import useWebSocket from 'react-use-websocket';
import { GameConfiguration } from './gameConfiguration/GameConfiguration';

import { useSelector } from 'react-redux';
import { config } from '../../config';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Tab } from '@mui/material';
import { GameList } from './GameList';
import { Game } from '../Game/Game';


export const MainPage = () => {
  const [ value, setValue ] = React.useState(1);
  const isWaitingForGame = useSelector((state: any) => state.game.isWaiting);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const accessToken = useSelector((state: any) => state.user.accessToken);
  
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    }, 
  });

  const createGame = (side: 'w'|'b'|'rand', minutes, timeIncrement) => {
    const body = {
      side,
      time: minutes * 60 * 1000,
      timeIncrement: timeIncrement * 1000
    };
    sendJsonMessage({ action: '/game/new-game', body });
  };
  
  return (
    <main>
      <TabContext value={value + ''}>
        <TabList onChange={handleChange} aria-label="lab API tabs example">
          <Tab label="Create" value="1" />
          <Tab label="Lobby" value="2" />
          { isWaitingForGame === false && <Tab label="Game" value="3"/> }
        </TabList>
        <TabPanel value="1"><GameConfiguration createGame={createGame}/></TabPanel>
        <TabPanel value="2"><GameList/></TabPanel>
        { isWaitingForGame === false && <TabPanel value="3"><Game /></TabPanel> }
      </TabContext>
    </main>
  );
};