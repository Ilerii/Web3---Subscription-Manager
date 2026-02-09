import React from 'react';
import styles from './Alert.module.css';

type Props = {
  variant?: 'error' | 'success';
  children: React.ReactNode;
  className?: string;
};

export function Alert({ variant = 'success', children, className }: Props) {
  const cls = [styles.alert, variant === 'error' ? styles.error : styles.success, className]
    .filter(Boolean)
    .join(' ');
  return <div className={cls}>{children}</div>;
}

