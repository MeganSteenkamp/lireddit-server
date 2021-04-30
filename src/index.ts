import 'reflect-metadata';

import {
  COOKIE_NAME,
  DATABASE,
  EXPRESS_SECRET,
  PASSWORD,
  USERNAME,
  __prod__,
} from './constants';

import { ApolloServer } from 'apollo-server-express';
import { Pool } from 'pg';
import { Post } from './entities/Post';
import { PostResolver } from './resolvers/post';
import { User } from './entities/User';
import { UserResolver } from './resolvers/user';
import { buildSchema } from 'type-graphql';
import connectPg from 'connect-pg-simple';
import cors from 'cors';
import { createConnection } from 'typeorm';
import express from 'express';
import expressConfig from './express-session.config';
import session from 'express-session';

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

  // Lines 22-48 for setting up session storage cookies with postgres
  const pgSession = connectPg(session);
  const pgPool = new Pool(expressConfig);

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
    session({
      name: COOKIE_NAME,
      store: new pgSession({
        pool: pgPool,
      }),
      secret: EXPRESS_SECRET, // Wouldn't actually use this
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
        sameSite: 'lax', // protects csrf
        secure: __prod__, // cookie works only in https
      },
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
