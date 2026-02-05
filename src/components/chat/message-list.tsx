'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';
import { ProductCard } from './product-card';
import { ExternalProductCard } from './external-product-card';
import { ComparisonTable } from './comparison-table';
import { CategoryChips } from './category-chips';
import { LoadingSpinner } from './loading-spinner';
import { StarterPrompts } from './starter-prompts';
import type { UIMessage } from 'ai';
import type { ProductWithRelations } from '@/lib/types';
import type { ProductPriceComparison } from '@/lib/actions/similarity';

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onComparePrice: (productId: string) => void;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
  onViewInCatalog: (productId: string) => void;
  onSendMessage: (text: string) => void;
}

// Type guards for tool parts
interface ToolPartBase {
  type: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available';
}

interface SearchProductsOutput {
  products: ProductWithRelations[];
  totalCount: number;
  showing: number;
}

interface ComparePricesOutput {
  products: ProductPriceComparison[];
  count: number;
  error?: string;
}

interface CategorySuggestion {
  id: string;
  code: string;
  name: string;
  count: number;
}

interface SuggestCategoriesOutput {
  suggestions: CategorySuggestion[];
  totalProducts: number;
}

interface ExternalSearchOutput {
  summary: string;
  sources: Array<{
    url: string;
    title: string;
    domain: string;
  }>;
  searchQueries: string[];
  hasResults: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  onComparePrice,
  onCategorySelect,
  onViewInCatalog,
  onSendMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or content streams
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Render a single message part based on its type
  const renderPart = (
    part: UIMessage['parts'][number],
    partIndex: number,
    messageRole: UIMessage['role']
  ) => {
    // Type guard to check for tool parts
    const isToolPart = (p: unknown): p is ToolPartBase =>
      typeof p === 'object' && p !== null && 'toolCallId' in p && 'state' in p;

    switch (part.type) {
      case 'text':
        return (
          <MessageBubble
            key={partIndex}
            content={part.text}
            role={messageRole as 'user' | 'assistant'}
          />
        );

      case 'tool-searchProducts': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: SearchProductsOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return (
            <div key={toolPart.toolCallId} className="space-y-2">
              {toolPart.output.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onCompare={onComparePrice}
                  onViewInCatalog={onViewInCatalog}
                />
              ))}
              {toolPart.output.products.length === 0 && (
                <p className="text-sm text-muted-foreground">No products found.</p>
              )}
            </div>
          );
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Searching catalog..." />;
      }

      case 'tool-comparePrices': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: ComparePricesOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return <ComparisonTable key={toolPart.toolCallId} products={toolPart.output.products} />;
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Comparing prices..." />;
      }

      case 'tool-suggestCategories': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: SuggestCategoriesOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return (
            <CategoryChips
              key={toolPart.toolCallId}
              suggestions={toolPart.output.suggestions}
              onSelect={onCategorySelect}
            />
          );
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Finding categories..." />;
      }

      case 'tool-searchExternalProducts': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: ExternalSearchOutput };

        // Loading state
        if (toolPart.state !== 'output-available' || !toolPart.output) {
          return (
            <LoadingSpinner
              key={toolPart.toolCallId}
              text="Searching the web for alternatives..."
            />
          );
        }

        // No results
        if (!toolPart.output.hasResults) {
          return (
            <p key={toolPart.toolCallId} className="text-sm text-muted-foreground">
              No external alternatives found. Try a different product or broader category.
            </p>
          );
        }

        // Filter out sources with invalid URLs (broken link handling per CONTEXT.md line 26)
        const validSources = toolPart.output.sources.filter((source) => {
          if (!source.url || source.url.trim() === '') return false;
          try {
            new URL(source.url);
            return true;
          } catch {
            return false;
          }
        });

        // If all sources were invalid, show no-results state
        if (validSources.length === 0) {
          return (
            <p key={toolPart.toolCallId} className="text-sm text-muted-foreground">
              No external alternatives found. Try a different product or broader category.
            </p>
          );
        }

        // Results with cards
        return (
          <div key={toolPart.toolCallId} className="space-y-2">
            {validSources.map((source, idx) => (
              <ExternalProductCard
                key={`${toolPart.toolCallId}-${idx}`}
                name={source.title}
                sourceUrl={source.url}
                sourceDomain={source.domain}
              />
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <StarterPrompts onSelect={onSendMessage} />
      ) : (
        messages.map((message) => (
          <div key={message.id}>
            {message.parts.map((part, partIndex) =>
              renderPart(part, partIndex, message.role)
            )}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
