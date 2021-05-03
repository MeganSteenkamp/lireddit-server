import { User } from '../entities/User';
import { MyContext } from '../types';
import {
  Resolver,
  Arg,
  Ctx,
  Mutation,
  Field,
  ObjectType,
  Query,
} from 'type-graphql';
import argon2 from 'argon2';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import jsonwebtoken from 'jsonwebtoken';
import { JWT_SECRET } from '../constants';

// Needed to declare custom properties on an express session
// See: https://stackoverflow.com/questions/65108033/property-user-does-not-exist-on-type-session-partialsessiondata
declare module 'express-session' {
  export interface SessionData {
    userId: number;
  }
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
class DecodedToken {
  @Field()
  userId: number;

  @Field()
  iat: number;

  @Field()
  exp: number;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'length must be greater than 2',
          },
        ],
      };
    }

    let decoded;
    try {
      decoded = jsonwebtoken.verify(token, JWT_SECRET);
    } catch (err) {
      return {
        errors: [
          {
            field: 'token',
            message: 'this token has expired',
          },
        ],
      };
    }

    const userId = (<DecodedToken>decoded).userId;
    const user = await User.findOne(userId);

    if (!user) {
      return {
        errors: [
          {
            field: 'user',
            message: 'user no longer exists',
          },
        ],
      };
    }

    User.update(
      { id: userId },
      {
        password: await argon2.hash(newPassword),
      }
    );

    // log in user after change password
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // the email is not in the db
      // return true so can't find out who are users are
      return true;
    }

    const token = jsonwebtoken.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: 1000 * 60 * 60 * 6, // 6 hours
    });
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );
    return true;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let result: User;
    try {
      result = await User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      }).save();
    } catch (err) {
      if (err.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        };
      }
    }

    const user = result!;
    req.session.userId = user.id; // Log in the user (set cookie)
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );
    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'username or email does not exist',
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      };
    }
    req.session!.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie('qid');
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
        return;
      })
    );
  }
}
