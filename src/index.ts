import 'reflect-metadata';

import {
  COOKIE_NAME,
  DATABASE,
  PASSWORD,
  USERNAME,
  __prod__,
} from './constants';

import { ApolloServer } from 'apollo-server-express';
import { Post } from './entities/Post';
import { PostResolver } from './resolvers/post';
import { User } from './entities/User';
import { UserResolver } from './resolvers/user';
import { buildSchema } from 'type-graphql';
import cors from 'cors';
import { createConnection } from 'typeorm';
import express from 'express';
import session from 'express-session';
import redis from 'redis';
import connectRedis from 'connect-redis';
import { MyContext } from './types';

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: DATABASE,
    username: USERNAME,
    password: PASSWORD,
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redisClient,
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
    context: ({ req, res }): MyContext => ({
      req,
      res,
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
