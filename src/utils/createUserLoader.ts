import DataLoader from 'dataloader';
import { User } from '../entities/User';

// keys e.g. list of ids [1, 7, 8, 9] and returns user objs for that
export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });
    return userIds.map((userId) => userIdToUser[userId]);
  });
