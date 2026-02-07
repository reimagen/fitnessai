
import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-sm shadow-sm ring-offset-background backdrop-blur-sm transition-shadow hover:border-border/80 hover:shadow-md hover:shadow-primary/10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-base',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
