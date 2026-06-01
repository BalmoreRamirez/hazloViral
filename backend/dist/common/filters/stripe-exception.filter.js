"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StripeExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let StripeExceptionFilter = StripeExceptionFilter_1 = class StripeExceptionFilter {
    logger = new common_1.Logger(StripeExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const err = exception;
        const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
        if (isStripeError) {
            this.logger.warn(`Stripe SDK error: [${err.type}] ${err.message}`);
            let status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
            let message = 'El servicio de pagos no está disponible en este momento.';
            if (err.type === 'StripeAuthenticationError') {
                status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                message = 'El servicio de pagos no está configurado correctamente. Contacta al administrador.';
            }
            else if (err.type === 'StripeInvalidRequestError') {
                status = common_1.HttpStatus.BAD_REQUEST;
                message = err.message ?? 'Solicitud de pago inválida.';
            }
            else if (err.type === 'StripeConnectionError') {
                status = common_1.HttpStatus.GATEWAY_TIMEOUT;
                message = 'No se pudo conectar con el servicio de pagos. Intenta de nuevo.';
            }
            return response.status(status).json({ statusCode: status, message, stripe_type: err.type });
        }
        const status = err?.status ?? err?.statusCode ?? common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = err?.message ?? 'Internal server error';
        return response.status(status === 401 && !err?.name?.includes('Http') ? common_1.HttpStatus.INTERNAL_SERVER_ERROR : status).json({ statusCode: status, message });
    }
};
exports.StripeExceptionFilter = StripeExceptionFilter;
exports.StripeExceptionFilter = StripeExceptionFilter = StripeExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], StripeExceptionFilter);
//# sourceMappingURL=stripe-exception.filter.js.map