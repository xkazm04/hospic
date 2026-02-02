"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Material } from "@/lib/types";

interface MaterialFilterProps {
  materials: Material[];
}

export function MaterialFilter({ materials }: MaterialFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMaterials = searchParams.get("material")?.split(",").filter(Boolean) || [];

  const handleChange = (materialId: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSelected: string[];

    if (checked) {
      newSelected = [...selectedMaterials, materialId];
    } else {
      newSelected = selectedMaterials.filter((id) => id !== materialId);
    }

    if (newSelected.length > 0) {
      params.set("material", newSelected.join(","));
    } else {
      params.delete("material");
    }
    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  };

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No materials available</p>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {materials.map((material) => (
        <label
          key={material.id}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selectedMaterials.includes(material.id)}
            onChange={(e) => handleChange(material.id, e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
          />
          <span className="text-sm text-foreground group-hover:text-accent transition-colors">
            {material.name}
          </span>
        </label>
      ))}
    </div>
  );
}
