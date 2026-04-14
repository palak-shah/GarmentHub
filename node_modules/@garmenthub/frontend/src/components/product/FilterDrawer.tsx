import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FilterOptions } from '@/types';

export interface ActiveFilters {
  brandId?: string;
  categoryId?: string;
  pattern?: string;
  fabric?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface FilterDrawerProps {
  options: FilterOptions | undefined;
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

export function FilterDrawer({ options, filters, onChange }: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ActiveFilters>(filters);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleClear = () => {
    const cleared: ActiveFilters = {};
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  };

  if (!options) return null;

  return (
    <>
      <button
        onClick={() => { setDraft(filters); setOpen(true); }}
        className="relative flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-md sm:rounded-2xl sm:m-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <FilterSection
                label="Brand"
                items={(options.brands || []).map((b) => ({ value: b.id, label: b.name }))}
                selected={draft.brandId}
                onSelect={(v) => setDraft({ ...draft, brandId: v })}
              />
              <FilterSection
                label="Category"
                items={options.categories.map((c) => ({ value: c.id, label: c.name }))}
                selected={draft.categoryId}
                onSelect={(v) => setDraft({ ...draft, categoryId: v })}
              />
              <FilterSection
                label="Fabric"
                items={options.fabrics.map((f) => ({ value: f, label: f }))}
                selected={draft.fabric}
                onSelect={(v) => setDraft({ ...draft, fabric: v })}
              />
              <FilterSection
                label="Pattern"
                items={options.patterns.map((p) => ({ value: p, label: p }))}
                selected={draft.pattern}
                onSelect={(v) => setDraft({ ...draft, pattern: v })}
              />
              <FilterSection
                label="Color"
                items={options.colors.map((c) => ({ value: c, label: c }))}
                selected={draft.color}
                onSelect={(v) => setDraft({ ...draft, color: v })}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Price Range</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={draft.minPrice ?? ''}
                    onChange={(e) => setDraft({ ...draft, minPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={draft.maxPrice ?? ''}
                    onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={handleClear} className="flex-1">Clear</Button>
              <Button onClick={handleApply} className="flex-1">Apply Filters</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterSection({ label, items, selected, onSelect }: {
  label: string;
  items: { value: string; label: string }[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onSelect(selected === item.value ? undefined : item.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === item.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
