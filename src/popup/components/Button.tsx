import type { ReactNode } from "react"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonVariant
  fullWidth?: boolean
  type?: "button" | "submit"
  className?: string
  title?: string
}

const STYLES: Record<ButtonVariant, string> = {
  primary:
    "btn-gradient text-white py-3 px-6 text-sm font-semibold tracking-[-0.01em]",
  secondary:
    "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] py-2 px-4 text-xs font-medium",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] py-1.5 px-3 text-xs font-medium",
  danger:
    "bg-[var(--bg-secondary)] text-[var(--error)] border border-[var(--border-primary)] hover:bg-[var(--error-soft)] py-1.5 px-3 text-xs font-medium",
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = false,
  type = "button",
  className = "",
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        relative inline-flex items-center justify-center rounded-lg
        select-none outline-none cursor-pointer
        transition-all duration-150 ease-out
        active:scale-[0.98]
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-40 !cursor-not-allowed" : ""}
        ${STYLES[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
