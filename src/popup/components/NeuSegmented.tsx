import { motion } from "framer-motion"

interface Option {
  value: string
  label: string
}

interface NeuSegmentedProps {
  options: Option[]
  value: string
  onChange: (v: string) => void
  /** Unique id for the sliding pill layoutId — must be unique per page */
  layoutId: string
}

export function NeuSegmented({ options, value, onChange, layoutId }: NeuSegmentedProps) {
  return (
    <div
      className="flex rounded-full p-1"
      style={{
        background: "var(--neu-base)",
        boxShadow: "var(--shadow-inset-sm)",
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-full py-1.5 text-xs outline-none"
            style={{
              color: isActive ? "var(--neu-text1)" : "var(--neu-text2)",
              fontWeight: isActive ? 600 : 500,
              transition: "color 0.2s ease",
            }}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "var(--neu-base)",
                  boxShadow: "var(--shadow-raised-sm)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
