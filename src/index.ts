import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import {
  COOKIE_NAME,
  DATABASE,
  PASSWORD,
  USERNAME,
  __prod__,
} from './constants';
import { Post } from './entities/Post';
import { Updoot } from './entities/Updoot';
import { User } from './entities/User';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { createUpdootLoader } from './utils/createUpdootLoader';
import { createUserLoader } from './utils/createUserLoader';

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    database: DATABASE,
    username: USERNAME,
    password: PASSWORD,
    logging: true,
    synchronize: true,
    entities: [Post, User, Updoot],
  });
  await conn.runMigrations({});

  //await Post.delete({});

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
        httpOnly: true, // cannot access code in js front end
        sameSite: 'lax', // protects csrf
        secure: __prod__, // cookie works only in https
      },
      saveUninitialized: false,
      secret: 'keyboard cat', // should make env var
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }), // Having req allows us to access sessions
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  }); // creates graphQL endpoint on Express

  app.listen(4000, () => {
    console.log('server started on localhost: 4000');
  });
};

main();
