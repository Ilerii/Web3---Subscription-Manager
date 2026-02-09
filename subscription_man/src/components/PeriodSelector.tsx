import React from 'react';
import { InputNumber } from './ui/InputNumber';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
};

export function PeriodSelector({ value, onChange, min = 1, max = 365 }: Props) {
  return (
    <InputNumber id="periods" label="Periods:" value={value} min={min} max={max} step={1} onChange={onChange} />
  );
}

