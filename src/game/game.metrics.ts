import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { GameRepository } from './game.repository';
import { GameEnd } from './EmitTypes';
import { Game } from './entities/game';

@Injectable()
export class GameMetrics {
  private readonly meter = metrics.getMeter('chess.game');
  private readonly created = this.meter.createCounter('chess.game.created', {
    description: 'Games created in the lobby',
  });
  private readonly ended = this.meter.createCounter('chess.game.ended', {
    description: 'Games finished, by reason',
  });
  private readonly betVolume = this.meter.createCounter(
    'chess.game.bet.volume',
    { unit: '{cent}', description: 'Sum of bets in finished games' },
  );
  private readonly moves = this.meter.createCounter('chess.game.moves', {
    description: 'Move commands handled, by result',
  });
  private readonly moveDuration = this.meter.createHistogram(
    'chess.game.move.duration',
    {
      unit: 's',
      description: 'Time to validate and apply a move',
      advice: {
        explicitBucketBoundaries: [
          0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1,
        ],
      },
    },
  );

  constructor(repo: GameRepository) {
    const active = this.meter.createObservableGauge('chess.game.active', {
      description: 'Games currently being played',
    });
    const lobby = this.meter.createObservableGauge('chess.game.lobby.size', {
      description: 'Games waiting for a second player',
    });
    this.meter.addBatchObservableCallback(
      async (result) => {
        const counts = await repo.counts();
        result.observe(active, counts.active);
        result.observe(lobby, counts.lobby);
      },
      [active, lobby],
    );
  }

  public clockLeadership(isLeader: () => boolean): void {
    this.meter
      .createObservableGauge('chess.game.clock.leader', {
        description: '1 on the instance that runs game clocks',
      })
      .addCallback((result) => result.observe(isLeader() ? 1 : 0));
  }

  public gameCreated(game: Game): void {
    this.created.add(1, { 'chess.game.has_bet': game.config.bet > 0 });
  }

  public gameEnded(game: Game, reason: GameEnd): void {
    const rated = game.players.every((pl) => pl.authorized);
    this.ended.add(1, { 'chess.game.end_reason': reason, rated });
    if (rated && game.config.bet > 0 && reason !== GameEnd.draw) {
      this.betVolume.add(game.config.bet);
    }
  }

  public async trackMove<T>(move: () => Promise<T>): Promise<T> {
    const start = performance.now();
    let result = 'ok';
    try {
      return await move();
    } catch (err) {
      result = 'rejected';
      throw err;
    } finally {
      this.moves.add(1, { result });
      this.moveDuration.record((performance.now() - start) / 1000, {
        result,
      });
    }
  }
}
