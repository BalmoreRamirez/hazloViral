import { ChatsService } from './chats.service';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';

describe('Unread messages', () => {
  function setup() {
    const query = {
      innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(3),
    };
    const messages = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new ChatsService({} as any, messages as any, {} as any, {} as any, {} as any, {} as any);
    return { service, query };
  }
  it.each([
    [UserRole.EMPRESA, 'empresa.user_id = :userId'],
    [UserRole.INFLUENCER, 'influencer.user_id = :userId'],
  ])('restricts %s unread counts to their conversations', async (role, ownership) => {
    const { service, query } = setup();
    expect(await service.unreadCount({ id: 12, role } as User)).toEqual({ count: 3 });
    expect(query.where).toHaveBeenCalledWith('message.read_at IS NULL');
    expect(query.andWhere).toHaveBeenCalledWith('message.sender_id != :userId', { userId: 12 });
    expect(query.andWhere).toHaveBeenCalledWith(ownership);
  });
  it('does not expose messages to another role', async () => {
    const { service, query } = setup();
    expect(await service.unreadCount({ id: 12, role: UserRole.ADMIN } as User)).toEqual({ count: 0 });
    expect(query.getCount).not.toHaveBeenCalled();
  });
});
