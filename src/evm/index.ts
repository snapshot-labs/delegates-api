import Checkpoint, { evm } from '@snapshot-labs/checkpoint';
import createWriters from './writers';
import createConfig from './config';

const ethIndexer = new evm.EvmIndexer(createWriters('eth'));

export function addEvmIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer('eth', createConfig('eth'), ethIndexer);
}
