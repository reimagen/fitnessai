"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { addMonths, format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const controlledMonth = props.month
  const selectedDate =
    "selected" in props && props.selected instanceof Date ? props.selected : null
  const initialMonth = controlledMonth ?? selectedDate ?? new Date()

  const [uncontrolledMonth, setUncontrolledMonth] = React.useState<Date>(initialMonth)
  const month = controlledMonth ?? uncontrolledMonth

  const handleMonthChange = React.useCallback(
    (next: Date) => {
      if (!controlledMonth) setUncontrolledMonth(next)
      props.onMonthChange?.(next)
    },
    [controlledMonth, props]
  )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
          onClick={() => handleMonthChange(addMonths(month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{format(month, "MMMM yyyy")}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
          onClick={() => handleMonthChange(addMonths(month, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <DayPicker
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={handleMonthChange}
        hideNavigation
        classNames={{
          root: "p-1",
          months: "flex flex-col sm:flex-row gap-4",
          month: "space-y-4",
          // Hide built-in caption; we render our own header above.
          month_caption: "hidden",
          month_grid: "w-full border-collapse space-y-1",
          weekdays: "flex w-full justify-between",
          weekday:
            "text-muted-foreground rounded-md w-9 text-center font-normal text-[0.8rem]",
          weeks: "flex flex-col",
          week: "flex w-full mt-2",
          day: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
            "[&:has([aria-selected])]:bg-primary/10",
            "first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl"
          ),
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
            "aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground"
          ),
          today: "bg-primary/10 text-primary font-semibold rounded-xl",
          outside:
            "text-muted-foreground opacity-60 aria-selected:bg-primary/10 aria-selected:text-muted-foreground",
          disabled: "text-muted-foreground opacity-50",
          hidden: "invisible",
          range_start: "range-start",
          range_middle: "range-middle",
          range_end: "range-end",
          selected: "selected",
          ...classNames,
        }}
        {...props}
      />
    </div>
  )
}
