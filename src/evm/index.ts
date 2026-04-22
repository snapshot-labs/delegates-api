import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import createWriters from './writers';
import createConfig from './config';

const ethIndexer = process.env.HYPERSYNC_API_TOKEN
  ? new evm.HyperSyncEvmIndexer(createWriters('eth'), {
      apiToken: process.env.HYPERSYNC_API_TOKEN
    })
  : new evm.EvmIndexer(createWriters('eth'));
const arb1Indexer = process.env.HYPERSYNC_API_TOKEN
  ? new evm.HyperSyncEvmIndexer(createWriters('arb1'), {
      apiToken: process.env.HYPERSYNC_API_TOKEN
    })
  : new evm.EvmIndexer(createWriters('arb1'));

export function addEvmIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer('eth', createConfig('eth'), ethIndexer);
  checkpoint.addIndexer('arb1', createConfig('arb1'), arb1Indexer);
}
