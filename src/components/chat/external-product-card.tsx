'use client';

interface ExternalProductCardProps {
  name: string;
  sourceUrl: string;
  sourceDomain: string;
}

export function ExternalProductCard({
  name,
  sourceUrl,
  sourceDomain,
}: ExternalProductCardProps) {
  return (
    <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3 mb-2">
      <h4 className="font-medium text-sm">{name}</h4>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-subtle hover:underline"
      >
        {sourceDomain}
      </a>
    </div>
  );
}
