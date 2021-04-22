import { DATABASE, USERNAME, HOST, PASSWORD, PORT, __prod__ } from './constants';

export default {
  host: HOST,
  user: USERNAME,
  connectionString:
    // TODO: Change to env variables
    `postgres://${USERNAME}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}`,
}