"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, X } from "lucide-react";

interface DropdownFilterProps {
  /** Label displayed in the trigger button */
  label: string;
  /** Whether the filter has active selections */
  hasFilters: boolean;
  /** Callback when clear button is clicked */
  onClear: (e: React.MouseEvent) => void;
  /** Title for the clear button */
  clearTitle?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Content to render inside the dropdown */
  children: ReactNode;
  /** Minimum width for the dropdown (default: "180px") */
  minWidth?: string;
  /** Maximum width for the dropdown */
  maxWidth?: string;
}

/**
 * Reusable dropdown filter component with consistent animations and structure.
 * Provides the dropdown shell with open/close state, backdrop, and animations.
 * Content is provided via children.
 */
export function DropdownFilter({
  label,
  hasFilters,
  onClear,
  clearTitle,
  className = "",
  children,
  minWidth = "180px",
  maxWidth,
}: DropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-1 font-medium text-xs uppercase tracking-wide transition-colors
            ${hasFilters ? "text-accent" : "text-muted-foreground hover:text-foreground"}
          `}
        >
          <span>{label}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {hasFilters && (
          <button
            onClick={onClear}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title={clearTitle}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1"
              style={{
                minWidth,
                ...(maxWidth && { maxWidth })
              }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
