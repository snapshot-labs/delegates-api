import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Checkpoint, { createGetLoader, LogLevel } from '@snapshot-labs/checkpoint';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { addEvmIndexers } from './evm';
import overridesConfig from './overrides.json';
import { addStarknetIndexers } from './starknet';

const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

const PRODUCTION_INDEXER_DELAY = 60 * 1000;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const checkpoint = new Checkpoint(schema, {
    logLevel: LogLevel.Info,
    resetOnConfigChange: true,
    skipBlockFetching: true,
    prettifyLogs: process.env.NODE_ENV !== 'production',
    overridesConfig
  });

  addEvmIndexers(checkpoint);
  addStarknetIndexers(checkpoint);

  const server = new ApolloServer({
    schema: checkpoint.getSchema(),
    plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
    introspection: true
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async () => {
      const baseContext = checkpoint.getBaseContext();
      return {
        ...baseContext,
        getLoader: createGetLoader(baseContext)
      };
    }
  });

  console.log(`Listening at ${url}`);

  if (process.env.NODE_ENV === 'production') {
    console.log('Delaying indexer to prevent multiple processes indexing at the same time.');
    await sleep(PRODUCTION_INDEXER_DELAY);
  }

  // TODO: comments?
  await checkpoint.resetMetadata();
  await checkpoint.reset();
  console.log('Checkpoint ready');

  await checkpoint.start();
}

run();
