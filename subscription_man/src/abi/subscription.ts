// Minimal ABI for the Subscription contract used by the frontend
// Includes reads: price, period, status; writes: subscribe, giftSubscription

export const subscriptionAbi = [
  // Events
  {
    type: 'event',
    name: 'Subscribed',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'periods', type: 'uint256', indexed: false },
      { name: 'newExpiry', type: 'uint64', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Canceled',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'oldExpiry', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PriceUpdated',
    inputs: [
      { name: 'oldSubscriptionPrice', type: 'uint256', indexed: false },
      { name: 'newSubscriptionPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TreasuryUpdated',
    inputs: [
      { name: 'oldTreasury', type: 'address', indexed: false },
      { name: 'newTreasury', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PeriodSecondsUpdated',
    inputs: [
      { name: 'oldPeriodSeconds', type: 'uint64', indexed: false },
      { name: 'newPeriodSeconds', type: 'uint64', indexed: false },
    ],
  },

  // Reads
  {
    type: 'function',
    stateMutability: 'view',
    name: 'subscriptionPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'subscriptionPeriod',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'isActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'timeLeft',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'expiresAt',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }],
  },

  // Writes
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'subscribe',
    inputs: [{ name: 'period', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'giftSubscription',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'period', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export type SubscriptionAbi = typeof subscriptionAbi;

