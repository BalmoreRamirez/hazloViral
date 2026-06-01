import { CreditsService } from './credits.service';
import { User } from '../users/entities/user.entity';
export declare class CreditsController {
    private readonly creditsService;
    constructor(creditsService: CreditsService);
    getBalance(user: User): Promise<import("./credits.service").BalanceInfo>;
}
