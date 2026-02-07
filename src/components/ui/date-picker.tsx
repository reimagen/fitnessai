"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function parseDateInputValue(value: string): Date | null {
  if (!value) return null
  const date = new Date(value.replace(/-/g, "/"))
  return Number.isNaN(date.getTime()) ? null : date
}

type DatePickerProps = {
  value: string
  onChange: (nextValue: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const selectedDate = parseDateInputValue(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-card/60 shadow-sm backdrop-blur-sm transition-shadow hover:border-border/80 hover:shadow-md hover:shadow-primary/10",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <span className="tabular-nums">
            {selectedDate ? format(selectedDate, "MM/dd/yyyy") : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2" align="start">
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(d) => {
            if (!d) return
            // Keep the existing form contract: store yyyy-MM-dd.
            onChange(format(d, "yyyy-MM-dd"))
          }}
          initialFocus
        />
        <div className="flex items-center justify-between px-1 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onChange("")}
            disabled={disabled || !value}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onChange(format(new Date(), "yyyy-MM-dd"))}
            disabled={disabled}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

