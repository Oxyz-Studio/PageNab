export function LoadingSpinner() {
  return (
    <div
      className="h-6 w-6 rounded-full border-2 border-[var(--border-primary)]"
      style={{
        borderTopColor: "var(--accent)",
        animation: "spin 0.7s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
