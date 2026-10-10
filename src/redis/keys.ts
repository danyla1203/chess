const prefix = '{chess}';

export const RedisKeys = {
  gameSeq: `${prefix}:game:seq`,
  game: (id: number | string) => `${prefix}:game:${id}`,
  lobby: `${prefix}:lobby`,
  active: `${prefix}:active`,
  deadlines: `${prefix}:deadlines`,
  userGame: (userId: number) => `${prefix}:user-game:${userId}`,
  outbox: `${prefix}:outbox`,
  clockLeader: `${prefix}:clock:leader`,
} as const;
