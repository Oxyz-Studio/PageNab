import { motion } from "framer-motion"

type BadgeVariant = "success" | "error"

const CONFIG: Record<
  BadgeVariant,
  { gradient: string; glow: string; paths: React.ReactNode }
> = {
  success: {
    gradient: "linear-gradient(145deg, #34d399, #059669)",
    glow: "6px 6px 14px rgba(5, 150, 105, 0.32), -6px -6px 14px #ffffff",
    paths: (
      <motion.path
        d="M5.5 12.5 L9.5 16.5 L18.5 7.5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.22 }}
      />
    ),
  },
  error: {
    gradient: "linear-gradient(145deg, #f87171, #dc2626)",
    glow: "6px 6px 14px rgba(220, 38, 38, 0.3), -6px -6px 14px #ffffff",
    paths: (
      <>
        <motion.line
          x1="7" y1="7" x2="17" y2="17"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
        />
        <motion.line
          x1="17" y1="7" x2="7" y2="17"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.28 }}
        />
      </>
    ),
  },
}

interface StateBadgeProps {
  variant: BadgeVariant
}

export function StateBadge({ variant }: StateBadgeProps) {
  const { gradient, glow, paths } = CONFIG[variant]

  return (
    <motion.div
      initial={{ scale: 0.25, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.04 }}
      className="flex h-16 w-16 items-center justify-center rounded-full"
      style={{
        background: "var(--neu-base)",
        boxShadow: glow,
      }}
    >
      {/* Inner coloured circle */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          background: gradient,
          boxShadow:
            "inset 2px 2px 4px rgba(0,0,0,0.12), inset -2px -2px 4px rgba(255,255,255,0.22)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {paths}
        </svg>
      </div>
    </motion.div>
  )
}
