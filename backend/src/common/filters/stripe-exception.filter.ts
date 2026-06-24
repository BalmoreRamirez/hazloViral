import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
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

    // Para HttpExceptions de NestJS (401, 400, 403, etc.) devolver la respuesta tal cual
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return response.status(status).json(exception.getResponse());
    }

    // Error inesperado no-HTTP (bug, librería externa, etc.)
    this.logger.error('Unhandled exception', err);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
