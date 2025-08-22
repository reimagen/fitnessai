
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

// Function to determine the number of decimal places in a number
const countDecimals = (value: number) => {
  if (Math.floor(value) === value) return 0;
  return value.toString().split('.')[1]?.length || 0;
};

const StepperInput = React.forwardRef<HTMLInputElement, StepperInputProps>(
  ({ className, value = 0, onChange, min = 0, max, step = 1, ...props }, ref) => {
    
    const handleValueChange = (newValue: number) => {
      if (onChange) {
        let clampedValue = newValue;
        if (min !== undefined) {
          clampedValue = Math.max(clampedValue, min);
        }
        if (max !== undefined) {
          clampedValue = Math.min(clampedValue, max);
        }
        
        // Round to handle floating point precision issues
        const stepDecimals = countDecimals(step);
        const roundedValue = parseFloat(clampedValue.toFixed(stepDecimals));
        
        onChange(roundedValue);
      }
    };

    const handleIncrement = () => {
      handleValueChange(value + step);
    };

    const handleDecrement = () => {
      handleValueChange(value - step);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numValue = e.target.value === '' ? min || 0 : parseFloat(e.target.value);
      if (!isNaN(numValue)) {
        handleValueChange(numValue);
      }
    };

    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleDecrement}
          disabled={props.disabled || (min !== undefined && value <= min)}
          aria-label="Decrease value"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          className="text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min={min}
          max={max}
          step={step}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleIncrement}
          disabled={props.disabled || (max !== undefined && value >= max)}
          aria-label="Increase value"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);
StepperInput.displayName = 'StepperInput';

export { StepperInput };
