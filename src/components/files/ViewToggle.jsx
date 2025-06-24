import { motion } from "framer-motion";
import { Button } from "../ui/button";

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-1 flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`relative ${
          view === "grid"
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {view === "grid" && (
          <motion.div
            layoutId="viewToggle"
            className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Grid
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("list")}
        className={`relative ${
          view === "list"
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {view === "list" && (
          <motion.div
            layoutId="viewToggle"
            className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          List
        </span>
      </Button>
    </div>
  );
} 