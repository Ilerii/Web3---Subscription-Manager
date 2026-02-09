import React from 'react';
import styles from './SubscriptionSummary.module.css';
import { formatUnits } from 'viem';

type Props = {
  price: bigint;
  decimals?: number;
  symbol?: string;
  periodSeconds?: number | bigint;
};

function formatDuration(secondsVal?: number | bigint) {
  if (secondsVal === undefined) return '';
  const s = typeof secondsVal === 'bigint' ? Number(secondsVal) : secondsVal;
  if (!Number.isFinite(s) || s < 0) return `${secondsVal}s`;
  const mins = Math.floor(s / 60);
  const hrs = Math.floor(s / 3600);
  const days = Math.floor(s / 86400);
  if (days >= 1) return `${s}s (${days}d)`;
  if (hrs >= 1) return `${s}s (${hrs}h)`;
  if (mins >= 1) return `${s}s (${mins}m)`;
  return `${s}s`;
}

export function SubscriptionSummary({ price, decimals, symbol, periodSeconds }: Props) {
  const priceStr = decimals !== undefined ? formatUnits(price, decimals) : price.toString();
  return (
    <div className={styles.summary}>
      <div className={styles.row}>Subscription price: {priceStr} {symbol || ''}</div>
      <div className={styles.row}>Subscription length: {formatDuration(periodSeconds)}</div>
    </div>
  );
}

