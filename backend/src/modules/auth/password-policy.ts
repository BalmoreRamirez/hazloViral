import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'password1234', 'qwerty', 'qwerty123',
  '123456', '12345678', '123456789', '1234567890', 'admin123', 'letmein',
  'welcome1', 'iloveyou', 'abc123', 'zaq12wsx', 'influSmart'.toLowerCase(),
]);

export function IsNotCommonPassword(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isNotCommonPassword', target: target.constructor, propertyName: String(propertyName),
    options,
    validator: {
      validate(value: unknown) {
        if (typeof value !== 'string') return false;
        const normalized = value.trim().toLowerCase();
        const compact = normalized.replace(/[^a-z0-9]/g, '');
        return !COMMON_PASSWORDS.has(normalized) && !COMMON_PASSWORDS.has(compact);
      },
      defaultMessage(args: ValidationArguments) {
        return `${args.property} no puede ser una contraseña común.`;
      },
    },
  });
}
