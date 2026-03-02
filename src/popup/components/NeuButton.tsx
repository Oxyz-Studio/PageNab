import { motion } from "framer-motion"
import type { ReactNode } from "react"

export type NeuButtonVariant = "primary" | "secondary" | "ghost" | "danger"

interface NeuButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: NeuButtonVariant
  fullWidth?: boolean
  type?: "button" | "submit"
  className?: string
  title?: string
}

const STYLES: Record<
  NeuButtonVariant,
  { style: React.CSSProperties; cls: string }
> = {
  primary: {
    style: {
      background: "linear-gradient(145deg, #818cf8, #4f46e5)",
      boxShadow: "5px 5px 14px rgba(79, 70, 229, 0.45), -5px -5px 14px #ffffff",
      color: "#ffffff",
    },
    cls: "py-3 px-6 text-sm font-semibold",
  },
  secondary: {
    style: {
      background: "var(--neu-base)",
      boxShadow: "var(--shadow-raised-sm)",
      color: "var(--neu-text2)",
    },
    cls: "py-2 px-4 text-xs font-medium",
  },
  ghost: {
    style: {
      background: "transparent",
      color: "var(--neu-text2)",
    },
    cls: "py-1.5 px-3 text-xs font-medium",
  },
  danger: {
    style: {
      background: "var(--neu-base)",
      boxShadow: "var(--shadow-raised-sm)",
      color: "var(--neu-error)",
    },
    cls: "py-1.5 px-3 text-xs font-medium",
  },
}

export function NeuButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = false,
  type = "button",
  className = "",
  title,
}: NeuButtonProps) {
  const { style, cls } = STYLES[variant]

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={`
        relative inline-flex items-center justify-center rounded-full
        select-none outline-none cursor-pointer
        transition-opacity duration-150
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-40 !cursor-not-allowed" : ""}
        ${cls}
        ${className}
      `}
      style={style}
    >
      {children}
    </motion.button>
  )
}
