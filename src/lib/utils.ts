import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(value: string) {
  if (!value) return ""
  return value.replace(/\w\S*/g, (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
}
