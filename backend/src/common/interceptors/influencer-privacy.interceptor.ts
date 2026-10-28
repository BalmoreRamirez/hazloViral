import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { UserRole } from '../enums';
import { protectInfluencerContact } from '../utils/influencer-privacy';

@Injectable()
export class InfluencerPrivacyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== UserRole.EMPRESA) return next.handle();
    return next.handle().pipe(map(data => protectInfluencerContact(data, user.id)));
  }
}
