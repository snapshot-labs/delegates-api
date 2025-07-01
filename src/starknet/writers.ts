import { starknet } from '@snapshot-labs/checkpoint';
import { formatUnits } from '@ethersproject/units';
import { BIGINT_ZERO, DECIMALS, getGovernance, getDelegate } from '../utils';
import { validateAndParseAddress } from 'starknet';

export default function createWriters(indexerName: string) {
  const handleDelegateChanged: starknet.Writer = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const fromDelegate = validateAndParseAddress(event.from_delegate);
    const toDelegate = validateAndParseAddress(event.to_delegate);

    const previousDelegate = await getDelegate(indexerName, fromDelegate, governanceId);
    previousDelegate.tokenHoldersRepresentedAmount -= 1;
    await previousDelegate.save();

    const newDelegate = await getDelegate(indexerName, toDelegate, governanceId);
    newDelegate.tokenHoldersRepresentedAmount += 1;
    await newDelegate.save();
  };

  const handleDelegateVotesChanged: starknet.Writer = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const governance = await getGovernance(indexerName, governanceId);
    const delegate = await getDelegate(
      indexerName,
      validateAndParseAddress(event.delegate),
      governanceId
    );

    delegate.delegatedVotesRaw = BigInt(event.new_votes).toString();
    delegate.delegatedVotes = formatUnits(event.new_votes, DECIMALS);
    delegate.save();

    if (event.previous_votes == BIGINT_ZERO && event.new_votes > BIGINT_ZERO)
      governance.currentDelegates += 1;

    if (event.new_votes == BIGINT_ZERO) governance.currentDelegates -= 1;

    const votesDiff = BigInt(event.new_votes) - BigInt(event.previous_votes);
    governance.delegatedVotesRaw = (BigInt(governance.delegatedVotesRaw) + votesDiff).toString();
    governance.delegatedVotes = formatUnits(governance.delegatedVotesRaw, DECIMALS);

    await governance.save();
  };

  return {
    handleDelegateChanged,
    handleDelegateVotesChanged
  };
}
