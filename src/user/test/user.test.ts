import { Test } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserModel } from '../model';
import { AuthService } from '../../auth';
import { generateUserGames } from './utils';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

describe('UserService (unit)', () => {
  let service: UserService;
  let games;
  let model;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserService, UserModel, AuthService, PrismaService],
    })
      .overrideProvider(AuthService)
      .useValue({})
      .compile();
    service = moduleRef.get(UserService);
    model = moduleRef.get(UserModel);
    games = generateUserGames();
  });

  describe('restruct user games', () => {
    it('with winner&looser', () => {
      const exp = games.exp;
      expect(service['restructUserGames'](games.stub)).toStrictEqual(exp);
    });
  });
  describe('games method', () => {
    it('should return parsed games, and stats', () => {
      model.findUserGames = jest.fn(() => games.stub);
      service['restructUserGames'] = jest.fn(() => games.exp);

      expect(service.games(1)).resolves.toStrictEqual({
        games: games.exp,
        wins: 5,
        looses: 0,
        draws: 0,
      });
    });
  });
  describe('update user name', () => {
    it('should throw Conflict error if provided name is already taken', async () => {
      jest.spyOn(model, 'findUserByName').mockResolvedValue({ id: 1 });
      await expect(service.updateUserName(1, 'TestName')).rejects.toThrowError(
        ConflictException,
      );
    });
    it('should update user', async () => {
      jest.spyOn(model, 'findUserByName').mockResolvedValue(null);
      const spyModel = jest
        .spyOn(model, 'updateUser')
        .mockImplementation(jest.fn());
      await service.updateUserName(1, 'TestName');
      expect(spyModel).toBeCalledWith(1, 'TestName');
    });
  });
});
