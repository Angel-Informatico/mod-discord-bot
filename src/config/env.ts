import { config } from '@dotenvx/dotenvx';
import { resolve } from 'path';

const EnvFile = process.env.NODE_ENV === 'development' ? '.env.dev' : '.env';
const EnvFilePath = resolve(process.cwd(), EnvFile);

config({path: EnvFilePath});
