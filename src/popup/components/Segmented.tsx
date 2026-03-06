import { motion } from "framer-motion"

interface Option {
  value: string
  label: string
}

interface SegmentedProps {
  options: Option[]
  value: string
  onChange: (v: string) => void
  layoutId: string
}

export function Segmented({ options, value, onChange, layoutId }: SegmentedProps) {
  return (
    <div className="flex rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-md py-1.5 text-xs outline-none transition-colors duration-150"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
            className="absolute inset-0 rounded-md border bg-[var(--bg-primary)]"
                style={{ boxShadow: "var(--shadow-sm)", borderColor: "rgba(99,102,241,0.3)" }}
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
