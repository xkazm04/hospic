"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 mt-1 min-w-[160px] bg-background border border-border rounded-md shadow-lg py-1 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function DropdownMenuItem({ children, onClick, disabled }: DropdownMenuItemProps) {
  return (
    <button
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
        }
      }}
      disabled={disabled}
      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
        disabled
          ? "text-muted-foreground cursor-not-allowed"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
