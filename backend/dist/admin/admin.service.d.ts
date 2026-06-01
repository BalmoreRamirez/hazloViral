import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GlobalSetting } from './entities/global-setting.entity';
export declare class AdminService implements OnApplicationBootstrap {
    private readonly settingsRepo;
    constructor(settingsRepo: Repository<GlobalSetting>);
    onApplicationBootstrap(): Promise<void>;
    get(key: string): Promise<string | null>;
    getNumber(key: string, fallback: number): Promise<number>;
    set(key: string, value: string, description?: string): Promise<GlobalSetting>;
    findAll(): Promise<GlobalSetting[]>;
    private seedDefaults;
}
