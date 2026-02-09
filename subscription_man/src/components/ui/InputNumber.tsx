import React, { useEffect, useState } from 'react';
import styles from './InputNumber.module.css';

type Props = {
  id?: string;
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  debounceMs?: number;
};

export function InputNumber({ id, label, value, min = 1, max = 365, step = 1, onChange, debounceMs = 250 }: Props) {
  const [local, setLocal] = useState<string>(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      let v = parseInt(local, 10);
      if (Number.isNaN(v)) v = min;
      v = Math.max(min, Math.min(max, v));
      if (v !== value) onChange(v);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [local, min, max, debounceMs]);

  return (
    <div className={styles.wrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        className={styles.input}
        type="number"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}

