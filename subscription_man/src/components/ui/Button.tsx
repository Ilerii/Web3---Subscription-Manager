import React from 'react';
import styles from './Button.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function Button({ children, className, ...rest }: Props) {
  return (
    <button className={[styles.button, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}

