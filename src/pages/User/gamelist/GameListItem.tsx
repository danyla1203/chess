import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@mui/material';
import { viewGameAction } from '../../../store/user/user.slice';
import { useAppDispatch } from '../../../store';

export function GameHistoryItem({
  data: { maxTime, timeIncrement, isDraw, sideSelecting, players, id, moves },
}: any) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const showGame = () => {
    dispatch(viewGameAction({ side: 'w', timeIncrement, gameId: id, moves }));
    navigate('/user');
  };

  const beautyMaxTime = Math.floor(maxTime / (1000 * 60));
  const beautyTimeIncrement = Math.floor(timeIncrement / 1000);
  const pl1 = players[0];
  const pl2 = players[1];
  let winner: any | 'draw';
  if (pl1.isWinner) winner = pl1.user.name;
  if (pl2.isWinner) winner = pl2.user.name;
  if (isDraw) winner = 'Draw';
  return (
    <TableRow onClick={showGame}>
      <TableCell>
        {beautyMaxTime} - {beautyTimeIncrement}
      </TableCell>
      <TableCell>{sideSelecting}</TableCell>
      <TableCell>{winner}</TableCell>
      <TableCell>
        {pl1.user.name} - {pl2.user.name}
      </TableCell>
    </TableRow>
  );
}
