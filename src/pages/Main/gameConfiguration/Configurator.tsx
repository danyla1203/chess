import {
  Button,
  ButtonGroup,
  Slider,
  Typography,
  Input,
  Box,
  Grid,
} from '@mui/material';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));

export interface DialogTitleProps {
  id: string;
  children?: React.ReactNode;
  onClose: () => void;
}

function BootstrapDialogTitle(props: DialogTitleProps) {
  const { children, onClose, ...other } = props;

  return (
    <DialogTitle sx={{ m: 0, p: 2 }} {...other}>
      {children}
      {onClose ? (
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </DialogTitle>
  );
}

export function ConfiguratorMenu({ createGame }) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button variant="outlined" onClick={handleClickOpen}>
        Configuration
      </Button>
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <BootstrapDialogTitle
          id="customized-dialog-title"
          onClose={handleClose}
        >
          Configuration
        </BootstrapDialogTitle>
        <DialogContent dividers>
          <Configurator
            createGame={createGame}
            handleClose={handleClose}
          />
        </DialogContent>
      </BootstrapDialog>
    </>
  );
}

export function Configurator({ createGame, handleClose }) {
  const [minutes, setMinutes] = React.useState(6);
  const [timeAdd, setTimeAdd] = React.useState(15);

  const create = (side) => {
    createGame(side, minutes, timeAdd);
    handleClose();
  };

  return (
    <div className="create-game">
      <Box sx={{ width: 400 }}>
        <Typography gutterBottom variant="h5">
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

        <Typography gutterBottom variant="h5">
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
        <Button
          component={Link}
          to="/game"
          onClick={() => create('w')}
        >
          White
        </Button>
        <Button
          component={Link}
          to="/game"
          onClick={() => create('b')}
        >
          Black
        </Button>
        <Button
          component={Link}
          to="/game"
          onClick={() => create('rand')}
        >
          Random
        </Button>
      </ButtonGroup>
    </div>
  );
}
