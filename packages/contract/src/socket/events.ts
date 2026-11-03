export enum Lobby {
  update = 'lobby:update',
  added = 'lobby:added',
  removed = 'lobby:removed',
}

export enum Game {
  pendingGame = 'game:pending-one',
  created = 'game:created',
  init = 'game:init-data',
  start = 'game:start',
  shah = 'game:shah',
  mate = 'game:mate',
  end = 'game:end',
  draw = 'game:draw',
  rejectDraw = 'game:draw_rejected',
  addTime = 'game:add-time',
  strike = 'game:strike',
  boardUpdate = 'game:board-update',
  message = 'game:chat-message',
  surrender = 'game:surrender',
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
