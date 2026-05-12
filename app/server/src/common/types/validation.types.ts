/**
 * Типы для валидации
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BriefValidationResult extends ValidationResult {
  normalizedBrief?: string;
}

export interface DisplayNameValidationResult extends ValidationResult {
  normalizedDisplayName?: string | null;
}
