"use client"

import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { fuzzyMatch } from "@/lib/fuzzy-match"

interface ExerciseComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  classifiedExercises: string[]
  placeholder?: string
  autoFocus?: boolean
  name?: string
  inputRef?: React.Ref<HTMLInputElement>
}

export function ExerciseCombobox({
  value,
  onChange,
  suggestions,
  classifiedExercises,
  placeholder = "e.g., Bench Press",
  autoFocus = false,
  name,
  inputRef,
}: ExerciseComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue) {
      return suggestions
    }
    const matched = fuzzyMatch(inputValue, suggestions)
    return matched.map((m) => m.item)
  }, [inputValue, suggestions])

  // Track usage count for each exercise from suggestions
  const usageCount = React.useMemo(() => {
    const counts: Record<string, number> = {}
    suggestions.forEach((exercise) => {
      counts[exercise.toLowerCase()] = (counts[exercise.toLowerCase()] || 0) + 1
    })
    return counts
  }, [suggestions])

  // Determine if an exercise is in the classified list (has strength standards)
  const isClassified = (exercise: string): boolean => {
    return classifiedExercises.some(
      (classified) => classified.toLowerCase() === exercise.toLowerCase()
    )
  }

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
    setOpen(!!newValue)
  }

  return (
    <div className="relative w-full">
      <Command className="border rounded-xl">
        <CommandInput
          placeholder={placeholder}
          value={inputValue}
          onValueChange={handleInputChange}
          onFocus={() => setOpen(!!inputValue || suggestions.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="h-10"
          autoFocus={autoFocus}
          name={name}
          ref={inputRef}
        />
        {open && (
          <CommandList>
            {filteredSuggestions.length === 0 ? (
              <CommandEmpty>
                {inputValue
                  ? "No exercises found. You can add a new one."
                  : "Start typing to see suggestions"}
              </CommandEmpty>
            ) : (
              <>
                <CommandGroup heading="Suggestions">
                  {filteredSuggestions.map((exercise) => {
                    const count = usageCount[exercise.toLowerCase()] || 0
                    const classified = isClassified(exercise)

                    return (
                      <CommandItem
                        key={exercise}
                        value={exercise}
                        onSelect={handleSelect}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="flex-1">{exercise}</span>
                          <div className="flex gap-2 ml-2">
                            {classified && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Standard
                              </span>
                            )}
                            {count > 0 && (
                              <span className="text-xs text-gray-500">
                                used {count > 1 ? `${count} times` : "once"}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  )
}
