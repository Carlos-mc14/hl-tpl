"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update input value when color prop changes
  useEffect(() => {
    setInputValue(color)
  }, [color])

  // Handle color input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Only update parent if it's a valid hex color
    if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
      onChange(value)
    }
  }

  // Handle color picker change
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    onChange(value)
  }

  return (
    <div className="flex gap-2 items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-10 h-10 p-0 border-2"
            style={{ backgroundColor: inputValue }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <div className="flex flex-col gap-2">
            <input
              type="color"
              value={inputValue}
              onChange={handleColorPickerChange}
              className="w-32 h-32 cursor-pointer"
            />
          </div>
        </PopoverContent>
      </Popover>

      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className={cn("font-mono", !/^#([0-9A-F]{3}){1,2}$/i.test(inputValue) && "border-red-500")}
        placeholder="#000000"
      />
    </div>
  )
}

