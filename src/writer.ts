import { evm } from '@snapshot-labs/checkpoint';
import { formatUnits } from '@ethersproject/units';
import { Delegate, Governance } from '../.checkpoint/models';
import { BIGINT_ZERO, DECIMALS, getGovernance, getDelegate } from './utils';

export const handleDelegateChanged: evm.Writer = async ({ event, source }) => {
  if (!event) return;

  const governanceId = source?.contract || '';
  const fromDelegate = event.args.fromDelegate;
  const toDelegate = event.args.toDelegate;

  const previousDelegate: Delegate = await getDelegate(fromDelegate, governanceId);
  previousDelegate.tokenHoldersRepresentedAmount -= 1;
  await previousDelegate.save();

  const newDelegate: Delegate = await getDelegate(toDelegate, governanceId);
  newDelegate.tokenHoldersRepresentedAmount += 1;
  await newDelegate.save();
};

export const handleDelegateVotesChanged: evm.Writer = async ({ event, source }) => {
  if (!event) return;

  const governanceId = source?.contract || '';
  const governance: Governance = await getGovernance(governanceId);
  const delegate: Delegate = await getDelegate(event.args.delegate, governanceId);

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
