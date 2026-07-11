"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: string | null
  setDate: (date: string) => void
  disabled?: boolean
  placeholder?: string
}

export function DatePicker({ date, setDate, disabled, placeholder = "DD/MM/YYYY" }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [hasError, setHasError] = React.useState(false)

  // Update input value when external date prop changes
  React.useEffect(() => {
    if (date) {
      const parsed = parse(date, "yyyy-MM-dd", new Date())
      if (isValid(parsed)) {
        setInputValue(format(parsed, "dd/MM/yyyy"))
        setHasError(false)
      }
    } else if (date === "" || date === null) {
      setInputValue("")
      setHasError(false)
    }
  }, [date])

  const validate = (value: string) => {
    if (!value) {
      setHasError(false)
      return true
    }
    
    // Check format and validity
    const parsed = parse(value, "dd/MM/yyyy", new Date())
    if (isValid(parsed) && value.length === 10) {
      setHasError(false)
      return true
    } else {
      setHasError(true)
      return false
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value === "") {
      setHasError(false)
      setDate("")
      return
    }

    // Real-time validation for 10 characters
    if (value.length === 10) {
      const parsed = parse(value, "dd/MM/yyyy", new Date())
      if (isValid(parsed)) {
        setHasError(false)
        setDate(format(parsed, "yyyy-MM-dd"))
      } else {
        setHasError(true)
      }
    } else if (value.length > 10) {
      setHasError(true)
    } else {
      // Don't show error while typing less than 10, unless previously error
      // But we should probably keep error if it was already invalid
    }
  }

  const handleBlur = () => {
    if (inputValue !== "") {
      validate(inputValue)
    }
  }

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const yyyymmdd = format(newDate, "yyyy-MM-dd")
      setDate(yyyymmdd)
      setInputValue(format(newDate, "dd/MM/yyyy"))
      setHasError(false)
    } else {
      setDate("")
      setInputValue("")
      setHasError(false)
    }
  }

  // Parse current date for Calendar display
  const calendarDate = React.useMemo(() => {
    if (!date) return undefined
    const parsed = parse(date, "yyyy-MM-dd", new Date())
    return isValid(parsed) ? parsed : undefined
  }, [date])

  return (
    <div className="relative w-full">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pr-10 transition-colors",
          hasError && "border-red-500 focus-visible:ring-red-500/50 focus-visible:border-red-500"
        )}
        aria-invalid={hasError}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={handleSelect}
            initialFocus
            captionLayout="dropdown"
            defaultMonth={calendarDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
