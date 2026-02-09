import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  expiry?: number | bigint;
  active?: boolean;
  className?: string;
  onEnd?: () => void;
  sync?: () => void; // optional periodic sync callback
};

export function Countdown({ expiry, active, className, onEnd, sync }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = typeof expiry === 'bigint' ? Number(expiry) : (expiry ?? 0);
      const rem = Math.max(0, expSec - nowSec);
      setRemaining(rem);
      if (rem === 0 && onEnd) onEnd();
    };
    tick();
    const id = setInterval(tick, 1000);
    const syncId = setInterval(() => sync?.(), 30000);
    return () => { clearInterval(id); clearInterval(syncId); };
  }, [active, expiry, onEnd, sync]);

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

  if (!active) return null;
  return <div className={className} title="Time remaining">Expires in: {formatted}</div>;
}

