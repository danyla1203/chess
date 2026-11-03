import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto';
import { UserModel } from './model';
import { AuthService, Tokens } from '../auth';
import { UserGames } from './entities';

@Injectable()
export class UserService {
  constructor(
    private readonly model: UserModel,
    private readonly authService: AuthService,
  ) {}

  public async create(createUserDto: CreateUserDto): Promise<Tokens> {
    const confirmation = await this.model.findConfirmation(createUserDto.email);
    if (!confirmation) throw new ConflictException('Confirm email first');

    const user = await this.model.findProfileByEmail(createUserDto.email);
    if (user) throw new ConflictException('User already exists');

    createUserDto.password = await bcrypt.hash(createUserDto.password, 10);

    const userRecord = await this.model.createUser(
      confirmation.id,
      createUserDto,
    );

    return this.authService.createSession(
      userRecord.id,
      createUserDto.deviceId,
    );
  }

  public profile(id: number) {
    return this.model.findProfile(id);
  }

  private restructUserGames(games: UserGames[]) {
    return games.map((g) => {
      const time = Math.floor(g.maxTime / (1000 * 60));
      const inc = Math.floor(g.timeIncrement / 1000);
      const [pl1, pl2] = g.players.map((pl) => {
        return {
          userId: pl.userId,
          side: pl.side,
          winner: pl.isWinner,
          name: pl.user.name,
        };
      });
      const result = g.isDraw
        ? { pl1, pl2 }
        : pl1.winner
          ? { winner: pl1, looser: pl2 }
          : { winner: pl2, looser: pl1 };
      return {
        id: g.id,
        key: g.id,
        cnf: {
          inc,
          time,
        },
        date: g.createdAt,
        result,
        sidepick: g.sideSelecting,
        bet: g.bet,
      };
    });
  }
  public async games(id: number) {
    const gms = await this.model.findUserGames(id);
    const parsed = this.restructUserGames(gms);
    let wins = 0;
    let looses = 0;
    let draws = 0;
    for (const game of parsed) {
      const r = game.result;
      if (r.winner) {
        if (r.winner.userId === id) wins++;
        else looses++;
      } else draws++;
    }
    return { games: parsed, wins, looses, draws };
  }

  public async updateUserName(id: number, name: string) {
    const userWithProvidedName = await this.model.findUserByName(name);
    if (userWithProvidedName) throw new ConflictException('This name is taken');
    return this.model.updateUser(id, name);
  }

  public topUpBalance(id: number, amount: number) {
    return this.model.updateUserBalance(id, amount);
  }

  public async getUserInvoices(id: number) {
    const allInvoices = await this.model.getUserInvoices(id);
    return { total: allInvoices.length, invoices: allInvoices };
  }
}
