import Checkpoint, { starknet } from '@snapshot-labs/checkpoint';
import createWriters from './writers';
import createConfig from './config';

const snIndexer = new starknet.StarknetIndexer(createWriters('sn'));

export function addStarknetIndexers(checkpoint: Checkpoint) {
  checkpoint.addIndexer('sn', createConfig('sn'), snIndexer);
}
