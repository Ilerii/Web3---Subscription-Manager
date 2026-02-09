import React from 'react';

type Props = {
  chainId?: number;
  hash?: `0x${string}` | string;
  className?: string;
};

function getTxUrl(chainId: number | undefined, hash: string | undefined) {
  if (!hash) return undefined;
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
  return `https://etherscan.io/tx/${hash}`;
}

export function TxLink({ chainId, hash, className }: Props) {
  const url = getTxUrl(chainId, hash as string | undefined);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className}>
      View transaction on Etherscan
    </a>
  );
}

