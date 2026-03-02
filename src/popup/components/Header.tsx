import { motion } from "framer-motion"
import { ChevronLeft, Clock, Settings } from "lucide-react"
import type { ReactNode } from "react"

import logoUrl from "data-base64:../../../assets/images/logo.png"

interface IconButtonProps {
  onClick?: () => void
  title?: string
  children: ReactNode
}

function IconButton({ onClick, title, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg outline-none transition-colors duration-150 hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-tertiary)]"
    >
      {children}
    </button>
  )
}

interface HeaderProps {
  showBack?: boolean
  onBack?: () => void
  title?: string
  status?: string
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
    <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-4 py-3">
      {/* Left side */}
      <div className="flex items-center gap-2.5">
        {showBack && (
          <IconButton onClick={onBack} title="Back">
            <ChevronLeft size={16} className="text-[var(--text-secondary)]" />
          </IconButton>
        )}

        {title ? (
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </span>
        ) : (
          <img
            src={logoUrl}
            alt="PageNab"
            className="h-5 select-none"
            draggable={false}
          />
        )}

        {status && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold text-[var(--success)]"
          >
            {status}
          </motion.span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {rightContent}
        {onHistory && (
          <IconButton onClick={onHistory} title="History">
            <Clock size={14} className="text-[var(--text-secondary)]" />
          </IconButton>
        )}
        {onSettings && (
          <IconButton onClick={onSettings} title="Settings">
            <Settings size={14} className="text-[var(--text-secondary)]" />
          </IconButton>
        )}
      </div>
    </div>
  )
}
