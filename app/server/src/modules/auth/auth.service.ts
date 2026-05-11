import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { UserEntity } from '../../db/entities';
import type { LoginDto, RegisterDto } from './dto';

const logger = new Logger('AuthService');

const SALT_ROUNDS = 10;

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { email, password } = dto;

    if (!email || !password) {
      throw new BadRequestException('Email и пароль обязательны');
    }

    if (password.length < 6) {
      throw new BadRequestException(
        'Пароль должен содержать минимум 6 символов',
      );
    }

    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestException(
          'Пользователь с таким email уже существует',
        );
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await this.userRepository.save({
        email: email.toLowerCase(),
        passwordHash,
      });

      const accessToken = this.generateToken(user);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      logger.error('Register error:', error);
      throw new BadRequestException(
        'Ошибка регистрации: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const { email, password } = dto;

    if (!email || !password) {
      throw new BadRequestException('Email и пароль обязательны');
    }

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id: payload.sub },
    });
  }

  private generateToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }
}
