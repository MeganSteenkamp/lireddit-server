import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constants';
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { MyContext } from './types';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import pg from 'pg';
import cors from 'cors';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  // Lines 22-48 for setting up session storage cookies with postgres
  const pgSession = connectPg(session);
  const pgPool = new pg.Pool({
    host: 'localhost',
    user: 'postgres',
    connectionString:
      // TODO: Change to env variables
      // postgres://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.PORT}/${process.env.DATABASE}`
      'postgres://postgres:Password123@localhost:5432/lireddit',
  });

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
    session({
      name: 'qid',
      store: new pgSession({
        pool: pgPool,
      }),
      secret: 'keyboard cat', // Wouldn't actually use this
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
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }), // Having req allows us to access sessions
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
