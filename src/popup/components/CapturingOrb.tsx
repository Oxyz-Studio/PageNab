import { motion } from "framer-motion"

export function CapturingOrb() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      {/* Three pulsing rings radiating outward */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 60,
            height: 60,
            border: "1.5px solid #6366f1",
          }}
          animate={{
            scale: [1, 2.6],
            opacity: [0.65, 0],
          }}
          transition={{
            duration: 2.1,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Core orb — breathes gently */}
      <motion.div
        className="relative flex h-16 w-16 items-center justify-center rounded-full"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "linear-gradient(145deg, #818cf8, #4f46e5)",
          boxShadow:
            "6px 6px 16px rgba(79, 70, 229, 0.5), -6px -6px 16px #ffffff, inset 2px 2px 5px rgba(255, 255, 255, 0.28)",
        }}
      >
        {/* Inner glow dot */}
        <motion.div
          className="h-2.5 w-2.5 rounded-full bg-white"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  )
}
