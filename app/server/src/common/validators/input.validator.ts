import { BadRequestException } from '@nestjs/common';

import type {
  BriefValidationResult,
  DisplayNameValidationResult,
} from '../types/validation.types';

/**
 * Валидатор входных данных
 */
export class InputValidator {
  /**
   * Валидация и нормализация брифа
   */
  static validateBrief(brief: unknown): BriefValidationResult {
    if (typeof brief !== 'string') {
      return {
        isValid: false,
        errors: ['Бриф должен быть строкой'],
      };
    }

    const trimmedBrief = brief.trim();

    if (trimmedBrief.length < 10) {
      return {
        isValid: false,
        errors: ['Бриф должен содержать минимум 10 символов'],
      };
    }

    if (trimmedBrief.length > 10000) {
      return {
        isValid: false,
        errors: ['Бриф не должен быть длиннее 10000 символов'],
      };
    }

    return {
      isValid: true,
      errors: [],
      normalizedBrief: trimmedBrief,
    };
  }

  /**
   * Валидация и нормализация названия запуска
   */
  static validateDisplayName(value: unknown): DisplayNameValidationResult {
    if (value === undefined || value === null) {
      return {
        isValid: true,
        errors: [],
        normalizedDisplayName: null,
      };
    }

    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: ['Название запуска должно быть строкой'],
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return {
        isValid: true,
        errors: [],
        normalizedDisplayName: null,
      };
    }

    if (trimmedValue.length > 80) {
      return {
        isValid: false,
        errors: ['Название запуска не должно быть длиннее 80 символов'],
      };
    }

    return {
      isValid: true,
      errors: [],
      normalizedDisplayName: trimmedValue,
    };
  }

  /**
   * Бросает исключение если валидация не прошла
   */
  static validateBriefOrThrow(brief: unknown): string {
    const result = this.validateBrief(brief);
    if (!result.isValid) {
      throw new BadRequestException(result.errors.join(', '));
    }
    return result.normalizedBrief!;
  }

  /**
   * Бросает исключение если валидация не прошла
   */
  static validateDisplayNameOrThrow(value: unknown): string | null {
    const result = this.validateDisplayName(value);
    if (!result.isValid) {
      throw new BadRequestException(result.errors.join(', '));
    }
    return result.normalizedDisplayName ?? null;
  }
}
