// Wouldn't store these for prod
export const __prod__ = process.env.NODE_ENV === 'production';
export const USERNAME = 'postgres';
export const PASSWORD = 'Pass@word1';
export const HOST = 'localhost';
export const PORT = '5432';
export const DATABASE = 'lireddit';
export const COOKIE_NAME = 'qid';

export const FORGOT_PASSWORD_PREFIX = 'forgot-password:';
