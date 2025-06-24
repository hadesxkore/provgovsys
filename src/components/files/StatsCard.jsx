import { motion } from "framer-motion";

export default function StatsCard({ icon, label, value, delay = 0, gradient }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative overflow-hidden rounded-xl ${gradient} p-[1px]`}
    >
      <div className="relative bg-white dark:bg-gray-900 rounded-[11px] p-6 h-full">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-white/[0.12]">
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
              {value}
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
      </div>
    </motion.div>
  );
} 