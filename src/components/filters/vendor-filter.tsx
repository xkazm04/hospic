"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import type { Vendor } from "@/lib/types";
import { MultiSelectFilter } from "./multi-select-filter";

interface VendorFilterProps {
  vendors: Vendor[];
}

export function VendorFilter({ vendors }: VendorFilterProps) {
  const t = useTranslations('filters');

  return (
    <MultiSelectFilter
      items={vendors}
      paramKey="vendor"
      searchPlaceholder={t('searchVendors')}
      emptyMessage={t('noVendors')}
      EmptyIcon={Building2}
      selectedStyle="bg-green-light/50 shadow-sm"
      hoverStyle="hover:bg-green-light/20"
      useTransitions={true}
    />
  );
}
