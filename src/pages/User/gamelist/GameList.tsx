import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useAppSelector } from '../../../store';
import { GameHistoryItem } from './GameListItem';
import './GameList.scss';

export function GameList() {
  const gameHistory = useAppSelector((state) => state.user.gameHistory);

  const rendered = gameHistory.slice(0, 5).map((game) => {
    return <GameHistoryItem data={game} key={game.id} />;
  });

  return (
    <div className="gamelist">
      <Button component={Link} to="/user">
        Back
      </Button>
      <TableContainer component={Paper} className="gamelist__table">
        <Table sx={{ minWidth: 800 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Timings</TableCell>
              <TableCell>Side</TableCell>
              <TableCell>Winner</TableCell>
              <TableCell>Players</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{rendered}</TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
