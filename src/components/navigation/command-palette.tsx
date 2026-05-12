'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { navigationGroups } from './navigation-data';

interface CommandPaletteProps {
  isAdminUser: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ isAdminUser, open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router, setOpen]);

  const visibleGroups = navigationGroups.filter(group => {
    if (group.adminOnly && !isAdminUser) return false;
    return true;
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {visibleGroups.map((group) => {
          const visibleItems = group.items.filter(
            item => !item.adminOnly || isAdminUser
          );
          if (visibleItems.length === 0) return null;

          return (
            <CommandGroup key={group.id} heading={group.label}>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${group.label}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
