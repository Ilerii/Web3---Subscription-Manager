import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useWatchContractEvent } from 'wagmi';
import { useRouter } from 'next/router';
import { subscriptionAbi } from '../abi/subscription';
import { erc20Abi } from '../abi/erc20';
import { useSubscriptionPrice, useSubscriptionPeriod, useTokenDecimals, useTokenSymbol, useAllowance, useIsActive } from '../hooks/reads';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { PeriodSelector } from '../components/PeriodSelector';
import { SubscriptionSummary } from '../components/SubscriptionSummary';
import { TxLink } from '../components/TxLink';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const Home: NextPage = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();

  const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS as string;
  const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as string;

  const [periods, setPeriods] = useState<number>(10);
  const [lastAction, setLastAction] = useState<'approve' | 'subscribe' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reads from abis
  const { data: priceRaw } = useSubscriptionPrice(SUBSCRIPTION_ADDRESS as `0x${string}`);
  const { data: subPeriod } = useSubscriptionPeriod(SUBSCRIPTION_ADDRESS as `0x${string}`);
  const { data: tokenDecimals } = useTokenDecimals(TOKEN_ADDRESS as `0x${string}`);
  const { data: tokenSymbol } = useTokenSymbol(TOKEN_ADDRESS as `0x${string}`);
  const { data: allowanceRaw, refetch: refetchAllowance } = useAllowance(isConnected && address ? (address as `0x${string}`) : undefined, SUBSCRIPTION_ADDRESS as `0x${string}`, TOKEN_ADDRESS as `0x${string}`);
  const { data: isActiveData, refetch: refetchActive } = useIsActive(isConnected && address ? (address as `0x${string}`) : undefined, SUBSCRIPTION_ADDRESS as `0x${string}`);

  const price = (priceRaw as bigint | undefined) ?? 0n;
  const totalCost = useMemo(() => price * BigInt(Math.max(1, periods)), [price, periods]);
  const allowance = (allowanceRaw as bigint | undefined) ?? 0n;
  const needsApproval = isConnected && totalCost > allowance;
  const isSubscribed = isActiveData === true;

  function formatAmount(raw: bigint, decimals: number | undefined) {
    if (decimals === undefined) return raw.toString();
    try {
      return formatUnits(raw, decimals);
    } catch {
      return raw.toString();
    }
  }


  // Writes
  const { writeContract, data: txHash, isPending: txPending, error: txError } = useWriteContract();
  const { isLoading: waitingReceipt, isSuccess: txSuccess, isError: receiptFailed, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash, chainId });

  const onApprove = () => {
    if (!isConnected || !address) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastAction('approve');
    writeContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [SUBSCRIPTION_ADDRESS, totalCost],
    });
  };

  const onSubscribe = () => {
    if (!isConnected || !address) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastAction('subscribe');
    writeContract({
      address: SUBSCRIPTION_ADDRESS as `0x${string}`,
      abi: subscriptionAbi,
      functionName: 'subscribe',
      args: [BigInt(Math.max(1, periods))],
    });
  };

  useEffect(() => {
    if (txSuccess) {
      refetchAllowance?.();
      if (lastAction === 'approve') {
        setSuccessMsg('Approved! Now click Subscribe to complete.');
        setLastAction(null);
      } else if (lastAction === 'subscribe') {
        // Confirm active state and offer navigation
        refetchActive?.();
        setSuccessMsg('Subscription successful! You can now access Subscriber content.');
        setLastAction(null);
      }
    }
  }, [txSuccess, lastAction, refetchAllowance, router]);

  // Short-lived polling of isActive after subscribe to catch state flips even if receipt watch lags
  useEffect(() => {
    if (lastAction !== 'subscribe' || !isConnected || !address) return;
    let ticks = 0;
    const id = setInterval(() => {
      refetchActive?.();
      ticks += 1;
      if (ticks >= 20) clearInterval(id); // ~20s max
    }, 1000);
    return () => clearInterval(id);
  }, [lastAction, isConnected, address, refetchActive]);

  // Fallback: if on-chain active flips true, consider it successful
  useEffect(() => {
    if (isSubscribed && lastAction === 'subscribe') {
      setSuccessMsg('Subscription successful! You can now access Subscriber content.');
      setLastAction(null);
    }
  }, [isSubscribed, lastAction]);

  useEffect(() => {
    if (txError) {
      const m = txError.message || '';
      if (/User rejected|denied|rejected/i.test(m)) {
        setErrorMsg('Transaction rejected by user.');
      } else {
        // Suppress other technical errors in the UI per request
        setErrorMsg(null);
      }
    }
  }, [txError]);

  useEffect(() => {
    if (receiptFailed && receiptError) {
      setErrorMsg('Transaction failed on-chain. Please check the details and try again.');
      setLastAction(null);
    }
  }, [receiptFailed, receiptError]);

  function explorerTxUrl(hash?: `0x${string}` | undefined) {
    if (!hash) return undefined;
    if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
    return `https://etherscan.io/tx/${hash}`;
  }

  // Event-driven success: watch Subscribed events and unlock UI if current user is payer or user
  useWatchContractEvent({
    address: SUBSCRIPTION_ADDRESS as `0x${string}`,
    abi: subscriptionAbi,
    eventName: 'Subscribed',
    chainId,
    onLogs(logs) {
      if (!address) return;
      for (const log of logs) {
        // log.args typing may be unknown; defensively access
        const args: any = (log as any).args || {};
        if (
          (args.payer && String(args.payer).toLowerCase() === address.toLowerCase()) ||
          (args.user && String(args.user).toLowerCase() === address.toLowerCase())
        ) {
          refetchActive?.();
          setSuccessMsg('Subscription successful! You now have access.');
          setLastAction(null);
          break;
        }
      }
    },
  });

  return (
    <>
      <Head>
        <title>Subscription Manager</title>
        <meta name="description" content="Manage your subscriptions easily" />
      </Head>

      <header className={styles.header}>
        <div className={styles.container}>
          <nav className={styles.nav}>
            <a className={styles.brand} href="#">Subscription</a>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <h1 className={styles.title}>Let&apos;s get started</h1>
            <p className={styles.description}>
              Connect, approve, and subscribe.
            </p>
          </section>

          <Card>
            <div className={styles.actions}>
              <ConnectButton label="Connect" showBalance={false} accountStatus={'avatar'} />

              {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
              {successMsg && <Alert variant="success">{successMsg}</Alert>}

              <SubscriptionSummary
                price={price}
                decimals={tokenDecimals as number | undefined}
                symbol={String(tokenSymbol || '')}
                periodSeconds={Number(subPeriod || 0)}
              />

              {/* Subscription length selector */}
              {isConnected && (
                <PeriodSelector value={periods} onChange={setPeriods} min={1} max={365} />
              )}

              {/* Total cost */}
              {isConnected && (
                <div style={{ fontWeight: 600 }}>
                  Total: {formatAmount(totalCost, tokenDecimals as number | undefined)} {String(tokenSymbol || '')}
                </div>
              )}

              {/* Actions */}
              {isConnected && (
                needsApproval ? (
                  <Button onClick={onApprove} disabled={txPending || waitingReceipt}>
                    {txPending || waitingReceipt ? 'Approving…' : 'Approve'}
                  </Button>
                ) : (
                  <Button onClick={onSubscribe} disabled={txPending || (waitingReceipt && !isSubscribed)}>
                    {txPending || (waitingReceipt && !isSubscribed) ? 'Subscribing…' : 'Subscribe'}
                  </Button>
                )
              )}

              {/* Suppressed raw error details per UX request */}

              {isActiveData === true && (
                <Button onClick={() => router.push('/restricted')}>Go to subscriber view</Button>
              )}

              <TxLink chainId={chainId} hash={txHash as `0x${string}` | undefined} />
            </div>
          </Card>

        </div>
      </main>
    </>
  );
};

export default Home;
