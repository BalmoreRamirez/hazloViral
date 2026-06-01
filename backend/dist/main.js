"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const stripe_exception_filter_1 = require("./common/filters/stripe-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new stripe_exception_filter_1.StripeExceptionFilter());
    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
    });
    const port = process.env.APP_PORT ?? 3000;
    await app.listen(port);
    console.log(`Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map