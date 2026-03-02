import { motion } from "framer-motion"
import { ChevronLeft, Clock, Settings } from "lucide-react"
import type { ReactNode } from "react"

interface NeuIconButtonProps {
  onClick?: () => void
  title?: string
  children: ReactNode
}

export function NeuIconButton({ onClick, title, children }: NeuIconButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="flex h-8 w-8 items-center justify-center rounded-full outline-none"
      style={{
        background: "var(--neu-base)",
        boxShadow: "var(--shadow-raised-sm)",
      }}
    >
      {children}
    </motion.button>
  )
}

interface HeaderProps {
  /** Show a back chevron instead of the logo */
  showBack?: boolean
  onBack?: () => void
  /** Title text for sub-screens (History, Settings) */
  title?: string
  /** Inline status indicator (e.g. "Saved") */
  status?: string
  /** Callbacks for right-side icon buttons (main screen only) */
  onHistory?: () => void
  onSettings?: () => void
  rightContent?: ReactNode
}

export function Header({
  showBack,
  onBack,
  title,
  status,
  onHistory,
  onSettings,
  rightContent,
}: HeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid rgba(163, 177, 198, 0.38)" }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2.5">
        {showBack && (
          <NeuIconButton onClick={onBack} title="Back">
            <ChevronLeft size={16} style={{ color: "var(--neu-text2)" }} />
          </NeuIconButton>
        )}

        {title ? (
          <span
            className="text-sm font-bold"
            style={{ color: "var(--neu-text1)" }}
          >
            {title}
          </span>
        ) : (
          <span
            className="text-base font-black tracking-tight select-none"
            style={{ color: "var(--neu-text1)" }}
          >
            Page
            <span style={{ color: "var(--neu-accent)" }}>Nab</span>
          </span>
        )}

        {status && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold"
            style={{ color: "var(--neu-success)" }}
          >
            {status}
          </motion.span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {rightContent}
        {onHistory && (
          <NeuIconButton onClick={onHistory} title="History">
            <Clock size={14} style={{ color: "var(--neu-text2)" }} />
          </NeuIconButton>
        )}
        {onSettings && (
          <NeuIconButton onClick={onSettings} title="Settings">
            <Settings size={14} style={{ color: "var(--neu-text2)" }} />
          </NeuIconButton>
        )}
      </div>
    </div>
  )
}
