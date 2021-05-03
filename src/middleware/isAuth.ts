import { MiddlewareFn } from 'type-graphql';
import { MyContext } from 'src/types';

export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  // checks if user is authenticated before resolver runs
  if (!context.req.session.userId) {
    throw new Error('not authenticated');
  }

  return next();
};
