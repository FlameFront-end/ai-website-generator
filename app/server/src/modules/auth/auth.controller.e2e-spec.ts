import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';

import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { UserEntity } from '../../db/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const JWT_SECRET = 'e2e-test-secret';
const TEST_PASSWORD = 'password123';

function mockConfigService(): Partial<ConfigService> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'app') {
        return { jwt: { secret: JWT_SECRET, expiresIn: '1h' } };
      }
      return undefined;
    }),
  };
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepo: Record<string, jest.Mock>;
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  });

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: ConfigService, useValue: mockConfigService() },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/register
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    const savedUser: UserEntity = {
      id: 'new-user-id',
      email: 'new@example.com',
      passwordHash: 'hashed',
      avatarUrl: null,
      runs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register a new user and return a token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(savedUser);

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: TEST_PASSWORD })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toEqual({
        id: 'new-user-id',
        email: 'new@example.com',
        avatarUrl: null,
      });
    });

    it('should return 409 when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(savedUser);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: TEST_PASSWORD })
        .expect(409);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: TEST_PASSWORD })
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'valid@email.com', password: '123' })
        .expect(400);
    });

    it('should return 400 when body is empty', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });

    it('should reject unknown fields', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: TEST_PASSWORD,
          isAdmin: true,
        })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/login
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('should return token for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        avatarUrl: null,
        runs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: TEST_PASSWORD })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('user@example.com');
    });

    it('should return 401 for wrong password', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        avatarUrl: null,
        runs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrong-password' })
        .expect(401);
    });

    it('should return 401 for nonexistent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });

    it('should lowercase email before lookup', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'USER@EXAMPLE.COM', password: TEST_PASSWORD });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/auth/me
  // ---------------------------------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const user: UserEntity = {
        id: 'user-123',
        email: 'me@example.com',
        passwordHash: hashedPassword,
        avatarUrl: 'https://example.com/avatar.png',
        runs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepo.findOne.mockResolvedValue(user);

      const token = jwtService.sign({
        sub: 'user-123',
        email: 'me@example.com',
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({
        id: 'user-123',
        email: 'me@example.com',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 when user no longer exists', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const token = jwtService.sign({
        sub: 'deleted-user',
        email: 'gone@example.com',
      });

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
