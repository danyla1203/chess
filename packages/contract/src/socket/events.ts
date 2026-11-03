export enum Lobby {
  update = 'lobby:update',
  added = 'lobby:added',
  removed = 'lobby:removed',
}

export enum Game {
  pendingGame = 'game:pending-one',
  init = 'game:init-data',
  end = 'game:end',
  rejectDraw = 'game:draw_rejected',
  addTime = 'game:add-time',
  boardUpdate = 'game:board-update',
  message = 'game:chat-message',
  drawPropose = 'game:draw_propose',
  playerDiconnected = 'game:opponent-disconnected',
  playerReconected = 'game:player-reconnected',
}

export enum User {
  anonymousToken = 'user:anon-token',
}

export enum Emit {
  createGame = 'create',
  gameJoin = 'join',
  gameRejoin = 'rejoin',
  figureMove = 'move',
  pushMessage = 'chat-message',
  addTime = 'add_time',
  surrender = 'surrender',
  drawPropose = 'draw_propose',
  drawReject = 'draw_reject',
  drawAccept = 'draw_accept',
  leave = 'leave',
}

export enum GameEnd {
  surrender = 'surrender',
  timeout = 'timeout',
  draw = 'draw',
  mate = 'mate',
  playerLeave = 'playerLeave',
}
