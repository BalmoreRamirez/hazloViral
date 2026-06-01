import { Request } from 'express';
import { StripeService } from './stripe.service';
import { User } from '../users/entities/user.entity';
import { CreateCreditCheckoutDto } from './dto/create-credit-checkout.dto';
export declare class StripeController {
    private readonly stripeService;
    constructor(stripeService: StripeService);
    createCreditsCheckout(user: User, dto: CreateCreditCheckoutDto): Promise<{
        url: string;
    }>;
    createContractCheckout(contratoId: number, user: User): Promise<{
        url: string;
    }>;
    connectOnboard(user: User): Promise<{
        url: string;
    }>;
    handleWebhook(signature: string, req: Request & {
        rawBody?: Buffer;
    }): Promise<{
        received: boolean;
    }>;
}
