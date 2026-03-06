import { motion } from "framer-motion"

type BadgeVariant = "success" | "error"

const CONFIG: Record<
  BadgeVariant,
  { bg: string; color: string; paths: React.ReactNode }
> = {
  success: {
    bg: "var(--success-soft)",
    color: "var(--success)",
    paths: (
      <motion.path
        d="M5.5 12.5 L9.5 16.5 L18.5 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
      />
    ),
  },
  error: {
    bg: "var(--error-soft)",
    color: "var(--error)",
    paths: (
      <>
        <motion.line
          x1="8" y1="8" x2="16" y2="16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.15, ease: "easeOut", delay: 0.06 }}
        />
        <motion.line
          x1="16" y1="8" x2="8" y2="16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.15, ease: "easeOut", delay: 0.15 }}
        />
      </>
    ),
  },
}

interface StateBadgeProps {
  variant: BadgeVariant
}

export function StateBadge({ variant }: StateBadgeProps) {
  const { bg, color, paths } = CONFIG[variant]

  return (
    <motion.div
      initial={{ scale: 0.25, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ background: bg, color }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {paths}
      </svg>
    </motion.div>
  )
}
