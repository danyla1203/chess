import { Test } from '@nestjs/testing';
import { AuthService } from '../../src/auth';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { UserModel } from '../../src/user/model';
import { UserService } from '../../src/user/user.service';
import { generateUserGames } from './utils';
import { ConflictException } from '@nestjs/common';

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
      await expect(service.updateUserName(1, 'TestName')).rejects.toThrow(
        ConflictException,
      );
    });
    it('should update user', async () => {
      jest.spyOn(model, 'findUserByName').mockResolvedValue(null);
      const spyModel = jest
        .spyOn(model, 'updateUser')
        .mockImplementation(jest.fn());
      await service.updateUserName(1, 'TestName');
      expect(spyModel).toHaveBeenCalledWith(1, 'TestName');
    });
  });
});
