import { Checkbox } from "@headlessui/react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

interface NeuCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function NeuCheckbox({ checked, onChange, label }: NeuCheckboxProps) {
  return (
    <label
      className="flex cursor-pointer select-none items-center gap-2"
    >
      <Checkbox
        checked={checked}
        onChange={onChange}
        className="relative flex-shrink-0 cursor-pointer rounded-md outline-none"
        style={{
          width: 16,
          height: 16,
          background: checked ? "#6366f1" : "var(--neu-base)",
          boxShadow: checked
            ? "inset 2px 2px 4px rgba(0, 0, 0, 0.2), inset -1px -1px 3px rgba(140, 140, 255, 0.4)"
            : "inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)",
          transition: "background 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <motion.div
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.3 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Check size={10} color="white" strokeWidth={3} />
        </motion.div>
      </Checkbox>
      <span className="text-xs" style={{ color: "var(--neu-text2)" }}>
        {label}
      </span>
    </label>
  )
}
