import { Switch } from "@headlessui/react"
import { motion } from "framer-motion"

interface NeuSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function NeuSwitch({ checked, onChange }: NeuSwitchProps) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      className="relative flex-shrink-0 cursor-pointer rounded-full outline-none overflow-hidden"
      style={{
        width: 46,
        height: 26,
        background: checked ? "#6366f1" : "var(--neu-base)",
        boxShadow: checked
          ? "inset 2px 2px 5px rgba(50, 50, 160, 0.35), inset -2px -2px 5px rgba(140, 140, 255, 0.35)"
          : "inset 3px 3px 7px var(--neu-dark), inset -3px -3px 7px var(--neu-light)",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <motion.span
        className="absolute rounded-full bg-white"
        style={{
          top: 5,
          left: 0,
          width: 16,
          height: 16,
          boxShadow: "2px 2px 5px rgba(0,0,0,0.2)",
        }}
        animate={{ x: checked ? 25 : 5 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </Switch>
  )
}
