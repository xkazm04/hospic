"use client";

import { useCallback, useMemo, memo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useUrlFilterMulti } from "@/lib/hooks/use-url-filter";
import { DropdownFilter } from "@/components/filters/dropdown-filter";
import { MDR_CLASS_STYLES } from "@/lib/constants/regulatory";

interface RegulatoryFilterProps {
  className?: string;
}

export const RegulatoryFilter = memo(function RegulatoryFilter({
  className = "",
}: RegulatoryFilterProps) {
  const t = useTranslations('regulatory');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();

  const {
    values: selectedCeMarked,
    toggleValue: toggleCe,
    clearValues: clearCe,
  } = useUrlFilterMulti("ceMarked");

  const {
    values: selectedMdrClasses,
    toggleValue: toggleMdr,
    clearValues: clearMdr,
  } = useUrlFilterMulti("mdrClass");

  // CE options sorted by label name
  const CE_OPTIONS = useMemo(() => [
    { value: "true", label: t("ceMarked") },
    { value: "false", label: t("ceNotMarked") },
  ], [t]);

  // MDR options sorted by class name (I, IIa, IIb, III)
  const MDR_OPTIONS = useMemo(() => [
    { value: "I", label: t("mdrClassI"), color: MDR_CLASS_STYLES.I.filter },
    { value: "IIa", label: t("mdrClassIIa"), color: MDR_CLASS_STYLES.IIa.filter },
    { value: "IIb", label: t("mdrClassIIb"), color: MDR_CLASS_STYLES.IIb.filter },
    { value: "III", label: t("mdrClassIII"), color: MDR_CLASS_STYLES.III.filter },
  ], [t]);

  const hasFilters = selectedCeMarked.length > 0 || selectedMdrClasses.length > 0;
  const totalSelected = selectedCeMarked.length + selectedMdrClasses.length;

  const clearFilters = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clearCe();
      clearMdr();
    },
    [clearCe, clearMdr]
  );

  const toggleCeMarked = useCallback(
    (value: string) => {
      const isSelected = selectedCeMarked.includes(value);
      toggleCe(value, !isSelected);
    },
    [selectedCeMarked, toggleCe]
  );

  const toggleMdrClass = useCallback(
    (value: string) => {
      const isSelected = selectedMdrClasses.includes(value);
      toggleMdr(value, !isSelected);
    },
    [selectedMdrClasses, toggleMdr]
  );

  return (
    <DropdownFilter
      label={t('filterTitle')}
      hasFilters={hasFilters}
      onClear={clearFilters}
      clearTitle={t('clearFilters')}
      className={className}
      minWidth="180px"
    >
              {/* Selection summary */}
              {totalSelected > 0 && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center justify-between">
                  <span>{t('selected', { count: totalSelected })}</span>
                  <button
                    onClick={clearFilters}
                    className="text-accent hover:underline"
                  >
                    {tc('clear')}
                  </button>
                </div>
              )}

              {/* CE Status section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                {t('ceStatus')}
              </div>
              {CE_OPTIONS.map((option) => {
                const isSelected = selectedCeMarked.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleCeMarked(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-normal text-left hover:bg-muted transition-colors"
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? "bg-accent border-accent" : "border-border"}
                      `}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-accent-foreground" />
                      )}
                    </div>
                    <span className="font-normal text-foreground">{option.label}</span>
                  </button>
                );
              })}

              {/* MDR Class section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                {t('mdrClass')}
              </div>
              {MDR_OPTIONS.map((option) => {
                const isSelected = selectedMdrClasses.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleMdrClass(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-normal text-left hover:bg-muted transition-colors"
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? "bg-accent border-accent" : "border-border"}
                      `}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-accent-foreground" />
                      )}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-normal ${option.color}`}
                    >
                      {option.value}
                    </span>
                    <span className="font-normal text-muted-foreground">{option.label.replace(/^Třída |^Class /, "")}</span>
                  </button>
                );
              })}
    </DropdownFilter>
  );
});