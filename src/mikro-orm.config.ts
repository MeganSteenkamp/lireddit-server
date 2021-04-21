import { __prod__ } from './constants';
import { Post } from './entities/Post';
import { MikroORM } from '@mikro-orm/core';
import path from 'path';
import { User } from './entities/User';

export default {
  migrations: {
    path: path.join(__dirname, './migrations'), // join absolute file path
    pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration of ts and js files
  },
  entities: [Post, User],
  dbName: 'lireddit',
  username: 'postgres',
  password: 'Password123',
  type: 'postgresql',
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
