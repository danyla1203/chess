const prefix = '{chess}';

export const RedisKeys = {
  gameSeq: `${prefix}:game:seq`,
  game: (id: number | string) => `${prefix}:game:${id}`,
  lobby: `${prefix}:lobby`,
  active: `${prefix}:active`,
  deadlines: `${prefix}:deadlines`,
  lobbyView: `${prefix}:view:lobby`,
  userView: (userId: number) => `${prefix}:view:user:${userId}`,
  userViewPattern: `${prefix}:view:user:*`,
  events: `${prefix}:events`,
  deadEvents: `${prefix}:events:dead`,
  clockLeader: `${prefix}:clock:leader`,
} as const;
