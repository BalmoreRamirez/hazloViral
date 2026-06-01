import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
export interface JwtPayload {
    sub: number;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersRepo;
    constructor(config: ConfigService, usersRepo: Repository<User>);
    validate(payload: JwtPayload): Promise<User>;
}
export {};
