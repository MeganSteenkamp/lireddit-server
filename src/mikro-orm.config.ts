import * as constants from './constants';
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
  dbName: constants.DATABASE,
  username: constants.USERNAME,
  password: constants.PASSWORD,
  type: 'postgresql',
  debug: !constants.__prod__,
} as Parameters<typeof MikroORM.init>[0];
