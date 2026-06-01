import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Intercepta errores del Stripe SDK antes de que NestJS los confunda
 * con HttpExceptions. El SDK lanza objetos con { statusCode, message }
 * (ej: 401 por API key inválida) que BaseExceptionFilter reenvía tal cual.
 * Este filtro los convierte en 503 Service Unavailable para que el
 * frontend no los interprete como sesión expirada.
 */
@Catch()
export class StripeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StripeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const err = exception as any;

    // Detectar errores del Stripe SDK (tienen `type` con prefijo 'Stripe')
    const isStripeError =
      typeof err?.type === 'string' && err.type.startsWith('Stripe');

    if (isStripeError) {
      this.logger.warn(`Stripe SDK error: [${err.type}] ${err.message}`);

      // Mapear al status HTTP correcto para el frontend
      let status = HttpStatus.SERVICE_UNAVAILABLE; // 503 por defecto
      let message = 'El servicio de pagos no está disponible en este momento.';

      if (err.type === 'StripeAuthenticationError') {
        // Key inválida o no configurada — problema de configuración del servidor
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'El servicio de pagos no está configurado correctamente. Contacta al administrador.';
      } else if (err.type === 'StripeInvalidRequestError') {
        status = HttpStatus.BAD_REQUEST;
        message = err.message ?? 'Solicitud de pago inválida.';
      } else if (err.type === 'StripeConnectionError') {
        status = HttpStatus.GATEWAY_TIMEOUT;
        message = 'No se pudo conectar con el servicio de pagos. Intenta de nuevo.';
      }

      return response.status(status).json({ statusCode: status, message, stripe_type: err.type });
    }

    // Si no es un error de Stripe, dejar que NestJS lo maneje normalmente
    // Re-lanzar para que BaseExceptionFilter lo procese
    const status = err?.status ?? err?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message ?? 'Internal server error';
    return response.status(
      // Nunca devolver 401 si el error proviene de una librería externa
      status === 401 && !err?.name?.includes('Http') ? HttpStatus.INTERNAL_SERVER_ERROR : status,
    ).json({ statusCode: status, message });
  }
}
