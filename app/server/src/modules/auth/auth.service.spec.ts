import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import type { UserEntity } from '../../db/entities';

jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser: UserEntity = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: '$2a$10$hashedpassword',
  avatarUrl: null,
  runs: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function createService(overrides?: {
  findOne?: jest.Mock;
  save?: jest.Mock;
  jwtSign?: jest.Mock;
}) {
  const userRepository = {
    findOne: overrides?.findOne ?? jest.fn(),
    save: overrides?.save ?? jest.fn(),
  };
  const jwtService = {
    sign: overrides?.jwtSign ?? jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const service = new AuthService(
    userRepository as any,
    jwtService as any,
  );

  return { service, userRepository, jwtService };
}

describe('AuthService', () => {
  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('should register a new user and return auth response', async () => {
      const savedUser = { ...mockUser, email: 'new@example.com' };
      const { service, userRepository } = createService({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(savedUser),
      });
      mockedBcrypt.hash.mockImplementation(() => Promise.resolve('hashed'));

      const result = await service.register({
        email: 'New@Example.com',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        email: 'new@example.com',
        passwordHash: 'hashed',
        avatarUrl: null,
      });
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.id).toBe('user-1');
    });

    it('should lowercase email on register', async () => {
      const { service, userRepository } = createService({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.hash.mockImplementation(() => Promise.resolve('hashed'));

      await service.register({
        email: 'UPPER@CASE.COM',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'upper@case.com' },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should save avatarUrl when provided', async () => {
      const savedUser = { ...mockUser, avatarUrl: 'data:image/png;base64,abc' };
      const { service, userRepository } = createService({
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(savedUser),
      });
      mockedBcrypt.hash.mockImplementation(() => Promise.resolve('hashed'));

      await service.register({
        email: 'avatar@test.com',
        password: 'password123',
        avatarUrl: 'data:image/png;base64,abc',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: 'data:image/png;base64,abc' }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('should return auth response for valid credentials', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should lowercase email on login', async () => {
      const { service, userRepository } = createService({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));

      await service.login({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.login({ email: 'unknown@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(false));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------------
  // validateUser
  // ---------------------------------------------------------------------------
  describe('validateUser', () => {
    it('should return user entity for valid payload', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.validateUser({
        sub: 'user-1',
        email: 'test@example.com',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateUser({
        sub: 'nonexistent',
        email: 'nope@test.com',
      });

      expect(result).toBeNull();
    });
  });
});
