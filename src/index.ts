import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { COOKIE_NAME, __prod__ } from './constants';
import microConfig from './mikro-orm.config';
import expressConfig from './express-session.config';
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
  console.log(microConfig);
  await orm.getMigrator().up();

  const app = express();

  // Lines 22-48 for setting up session storage cookies with postgres
  const pgSession = connectPg(session);
  const pgPool = new pg.Pool(expressConfig);

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
