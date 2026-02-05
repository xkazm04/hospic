"use client";

import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import type { Material } from "@/lib/types";
import { MultiSelectFilter } from "./multi-select-filter";

interface MaterialFilterProps {
  materials: Material[];
}

export function MaterialFilter({ materials }: MaterialFilterProps) {
  const t = useTranslations('filters');

  return (
    <MultiSelectFilter
      items={materials}
      paramKey="material"
      searchPlaceholder={t('searchMaterials')}
      emptyMessage={t('noMaterials')}
      EmptyIcon={Layers}
      selectedStyle="bg-accent/10"
      hoverStyle="hover:bg-muted"
      useTransitions={false}
    />
  );
}
