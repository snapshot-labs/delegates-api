import { evm } from '@snapshot-labs/checkpoint';
import { formatUnits } from '@ethersproject/units';
import { Delegate, Governance } from '../.checkpoint/models';
import { BIGINT_ZERO, DECIMALS, getGovernance, getDelegate } from './utils';

export const handleDelegateChanged: evm.Writer = async ({ event, source }) => {
  console.log('handle delegate changed');
  if (!event) return;

  console.log('Handle delegate changed', event);

  const governanceId = source?.contract || '';
  const fromDelegate = event.args.from_delegate; // TODO: does this work?
  const toDelegate = event.args.to_delegate;

  const previousDelegate: Delegate = await getDelegate(fromDelegate, governanceId);
  previousDelegate.tokenHoldersRepresentedAmount -= 1;
  await previousDelegate.save();

  const newDelegate: Delegate = await getDelegate(toDelegate, governanceId);
  newDelegate.tokenHoldersRepresentedAmount += 1;
  await newDelegate.save();
};

export const handleDelegateVotesChanged: evm.Writer = async ({ event, source }) => {
  console.log('handle delegate votes changed');
  if (!event) return;

  console.log('Handle delegate votes changed', event);

  const governanceId = source?.contract || '';
  const governance: Governance = await getGovernance(governanceId);
  const delegate: Delegate = await getDelegate(event.args.delegate, governanceId);

  delegate.delegatedVotesRaw = BigInt(event.args.new_votes).toString();
  delegate.delegatedVotes = formatUnits(event.args.new_votes, DECIMALS);
  await delegate.save();

  if (event.args.previous_votes == BIGINT_ZERO && event.args.new_votes > BIGINT_ZERO)
    governance.currentDelegates += 1;

  if (event.args.new_votes == BIGINT_ZERO) governance.currentDelegates -= 1;

  const votesDiff = BigInt(event.args.new_votes) - BigInt(event.args.previous_votes);
  governance.delegatedVotesRaw = (BigInt(governance.delegatedVotesRaw) + votesDiff).toString();
  governance.delegatedVotes = formatUnits(governance.delegatedVotesRaw, DECIMALS);

  await governance.save();
};
