import { Switch as HUISwitch } from "@headlessui/react"

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <HUISwitch
      checked={checked}
      onChange={onChange}
      className="relative flex-shrink-0 cursor-pointer rounded-full outline-none transition-colors duration-200"
      style={{
        width: 40,
        height: 22,
        background: checked ? "var(--accent)" : "var(--border-secondary)",
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-transform duration-200 ease-out"
        style={{
          top: 3,
          left: 3,
          width: 16,
          height: 16,
          boxShadow: "var(--shadow-sm)",
          transform: checked ? "translateX(18px)" : "translateX(0)",
        }}
      />
    </HUISwitch>
  )
}
