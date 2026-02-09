import { useReadContract } from 'wagmi';
import { subscriptionAbi } from '../abi/subscription';
import { erc20Abi } from '../abi/erc20';

const SUB_ADDR = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS as `0x${string}` | undefined;
const TOKEN_ADDR = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}` | undefined;

export function useSubscriptionPrice(subscriptionAddress: `0x${string}` | undefined = SUB_ADDR) {
  return useReadContract({
    address: subscriptionAddress,
    abi: subscriptionAbi,
    functionName: 'subscriptionPrice',
  });
}

export function useSubscriptionPeriod(subscriptionAddress: `0x${string}` | undefined = SUB_ADDR) {
  return useReadContract({
    address: subscriptionAddress,
    abi: subscriptionAbi,
    functionName: 'subscriptionPeriod',
  });
}

export function useIsActive(user: `0x${string}` | undefined, subscriptionAddress: `0x${string}` | undefined = SUB_ADDR) {
  return useReadContract({
    address: subscriptionAddress,
    abi: subscriptionAbi,
    functionName: 'isActive',
    args: user ? [user] : undefined,
  });
}

export function useExpiry(user: `0x${string}` | undefined, subscriptionAddress: `0x${string}` | undefined = SUB_ADDR) {
  return useReadContract({
    address: subscriptionAddress,
    abi: subscriptionAbi,
    functionName: 'expiresAt',
    args: user ? [user] : undefined,
  });
}

export function useTokenDecimals(tokenAddress: `0x${string}` | undefined = TOKEN_ADDR) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });
}

export function useTokenSymbol(tokenAddress: `0x${string}` | undefined = TOKEN_ADDR) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
  });
}

export function useAllowance(owner: `0x${string}` | undefined, spender: `0x${string}` | undefined, tokenAddress: `0x${string}` | undefined = TOKEN_ADDR) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
  });
}

