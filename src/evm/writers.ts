import { evm } from '@snapshot-labs/checkpoint';
import { formatUnits } from '@ethersproject/units';
import { BIGINT_ZERO, DECIMALS, getGovernance, getDelegate } from '../utils';
import { NetworkID } from './config';

const GENERIC_ERC20_VOTES_IMPLEM = '0x75DB1EEE7b03A0C9BcAD50Cb381B068c209c81ef'; // Address should be the same on all networks

export default function createWriters(indexerName: NetworkID) {
  const handleDelegateChanged: evm.Writer = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const fromDelegate = event.args.fromDelegate;
    const toDelegate = event.args.toDelegate;

    const previousDelegate = await getDelegate(indexerName, fromDelegate, governanceId);
    previousDelegate.tokenHoldersRepresentedAmount -= 1;
    await previousDelegate.save();

    const newDelegate = await getDelegate(indexerName, toDelegate, governanceId);
    newDelegate.tokenHoldersRepresentedAmount += 1;
    await newDelegate.save();
  };

  const handleDelegateVotesChanged: evm.Writer = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const delegate = await getDelegate(indexerName, event.args.delegate, governanceId);
    const governance = await getGovernance(indexerName, governanceId);

    delegate.delegatedVotesRaw = BigInt(event.args.newBalance).toString();
    delegate.delegatedVotes = formatUnits(event.args.newBalance, DECIMALS);
    delegate.save();

    if (event.args.previousBalance == BIGINT_ZERO && event.args.newBalance > BIGINT_ZERO)
      governance.currentDelegates += 1;

    if (event.args.newBalance == BIGINT_ZERO) governance.currentDelegates -= 1;

    const votesDiff = BigInt(event.args.newBalance) - BigInt(event.args.previousBalance);
    governance.delegatedVotesRaw = (BigInt(governance.delegatedVotesRaw) + votesDiff).toString();
    governance.delegatedVotes = formatUnits(governance.delegatedVotesRaw, DECIMALS);

    await governance.save();
  };

  const handleContractDeployed: evm.Writer = async ({ blockNumber, event, helpers }) => {
    if (!event) return;

    if (event.args.implementation === GENERIC_ERC20_VOTES_IMPLEM) {
      await helpers.executeTemplate('GenericERC20Votes', {
        contract: event.args.contractAddress,
        start: blockNumber
      });
    } else {
      console.log(`Unknown implementation: ${event.args.implementation}`);
    }
  };

  return {
    handleDelegateChanged,
    handleDelegateVotesChanged,
    handleContractDeployed
  };
}
