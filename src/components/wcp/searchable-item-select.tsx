'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  itemCode: string;
  name: string;
  unitOfMeasure?: string;
  availableQty?: number;
  wac?: number;
}

interface SearchableItemSelectProps {
  value?: string;
  onChange: (value: string, item?: Item) => void;
  storeId?: string;
  placeholder?: string;
  showStock?: boolean;
  disabled?: boolean;
}

export function SearchableItemSelect({
  value,
  onChange,
  storeId,
  placeholder = 'Select item...',
  showStock = false,
  disabled = false,
}: SearchableItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchItems();
  }, [storeId]);

  const fetchItems = async (searchTerm?: string) => {
    try {
      setLoading(true);
      let url = '/api/items?limit=100';
      if (storeId) url += `&storeId=${storeId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || data.items || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === value);
  }, [items, value]);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const searchLower = search.toLowerCase();
    return items.filter(
      (item) =>
        item.itemCode.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower)
    );
  }, [items, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedItem ? (
            <span className="truncate">
              {selectedItem.itemCode} - {selectedItem.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search items..."
            value={search}
            onValueChange={(val) => {
              setSearch(val);
              if (val.length > 2) {
                fetchItems(val);
              }
            }}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <CommandEmpty>No items found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onChange(item.id, item);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">
                        {item.itemCode} - {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.unitOfMeasure || 'N/A'}
                        {showStock && item.availableQty !== undefined && (
                          <span className="ml-2">
                            • Stock: {item.availableQty}
                          </span>
                        )}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
