import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useAccount } from 'wagmi';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { subscriptionAbi } from '../abi/subscription';
import { useIsActive, useExpiry } from '../hooks/reads';
import { Countdown } from '../components/Countdown';

const Restricted: NextPage = () => {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS as string;
  const { data: active, isLoading } = useIsActive(address as `0x${string}` | undefined, SUBSCRIPTION_ADDRESS as `0x${string}`);
  const { data: expiryRaw, refetch: refetchExpiry } = useExpiry(address as `0x${string}` | undefined, SUBSCRIPTION_ADDRESS as `0x${string}`);

  const expiry = (expiryRaw as bigint | undefined) ?? 0n;
  const [remaining, setRemaining] = useState<number>(0);

  const formatted = useMemo(() => {
    const sec = Math.max(0, remaining);
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (days >= 1) return `${days}d ${hrs}h`;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs >= 1) return `${hrs}:${pad(mins)}:${pad(s)}`;
    return `${mins}:${pad(s)}`;
  }, [remaining]);

  // Drive countdown locally; refresh expiry every 30s to avoid drift
  useEffect(() => {
    if (!address || !active) return;
    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = Number(expiry);
      setRemaining(Math.max(0, expSec - nowSec));
    };
    tick();
    const id = setInterval(tick, 1000);
    const sync = setInterval(() => refetchExpiry?.(), 30000);
    return () => { clearInterval(id); clearInterval(sync); };
  }, [address, active, expiry, refetchExpiry]);

  // When timer hits zero while active, show modal; hide when renewed
  useEffect(() => {
    if (!active) return;
    if (remaining === 0) setShowModal(true);
    else setShowModal(false);
  }, [remaining, active]);

  useEffect(() => {
    if (!isConnected) {
      router.replace('/');
    }
  }, [isConnected, router]);

  const [showModal, setShowModal] = useState(false);

  // Open/close modal based on chain status once loading completes
  useEffect(() => {
    if (isLoading) return;
    if (active === false) setShowModal(true);
    if (active === true) setShowModal(false);
  }, [active, isLoading]);

  // If still loading or not connected, show loading
  if (!isConnected || isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.card}>Checking access…</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Subscriber View</title>
        <meta name="robots" content="noindex" />
      </Head>

      <header className={styles.header}>
        <div className={styles.container}>
          <nav className={styles.nav}>
            <a className={styles.brand} href="/">Sub Manager</a>
            {active && (
              <Countdown
                className={styles.timer}
                active={true}
                expiry={Number(expiry)}
                onEnd={() => setShowModal(true)}
                sync={() => refetchExpiry?.()}
              />
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <h1 className={styles.title}>Subscriber View</h1>
            <p className={styles.description}>
              Thanks for subscribing. Now you can view our resources.
            </p>
          </section>

          <div className={styles.card}>
            <div>
              <h2 style={{ marginTop: 0 }}>Subscriber resources</h2>
              <p>
                This area is accessible only to subscribed users. 
              </p>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className={styles.backdrop}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="expiredTitle">
            <h3 id="expiredTitle" className={styles.modalTitle}>Subscription period is over</h3>
            <p className={styles.modalText}>Your access has expired. Please renew your subscription to continue.</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => router.push('/')}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Restricted;
