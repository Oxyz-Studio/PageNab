import { Checkbox as HUICheckbox } from "@headlessui/react"
import { Check } from "lucide-react"

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <HUICheckbox
        checked={checked}
        onChange={onChange}
        className="relative flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded outline-none border transition-all duration-150"
        style={{
          background: checked ? "var(--accent)" : "var(--bg-primary)",
          borderColor: checked ? "var(--accent)" : "var(--border-secondary)",
        }}
      >
        <Check
          size={10}
          color="white"
          strokeWidth={3}
          className="transition-opacity duration-150"
          style={{ opacity: checked ? 1 : 0 }}
        />
      </HUICheckbox>
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
    </label>
  )
}
