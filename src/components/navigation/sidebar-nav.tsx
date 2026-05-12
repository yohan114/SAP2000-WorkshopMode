'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { navigationGroups, type NavGroup, type NavItem } from './navigation-data';

interface SidebarNavProps {
  sidebarOpen: boolean;
  isAdminUser: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ sidebarOpen, isAdminUser, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isActive = (item: NavItem) => {
    return pathname === item.href || pathname?.startsWith(item.href + '/');
  };

  const shouldShowGroup = (group: NavGroup) => {
    if (group.adminOnly && !isAdminUser) return false;
    return true;
  };

  const shouldShowItem = (item: NavItem) => {
    if (item.adminOnly && !isAdminUser) return false;
    return true;
  };

  const visibleGroups = navigationGroups.filter(shouldShowGroup);

  return (
    <ScrollArea className="flex-1">
      <nav className="p-2 space-y-1">
        {visibleGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.id] ?? false;
          const visibleItems = group.items.filter(shouldShowItem);

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="mb-1">
              {/* Group Header */}
              {sidebarOpen ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
                >
                  <span>{group.label}</span>
                  <motion.div
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                </button>
              ) : (
                <div className="h-px bg-slate-100 mx-2 my-2" />
              )}

              {/* Group Items */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item);

                        const linkContent = (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 relative",
                              active
                                ? "bg-gradient-to-r from-emerald-50 to-transparent text-emerald-700 font-medium border-l-[3px] border-emerald-500"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-[3px] border-transparent",
                              !sidebarOpen && "justify-center px-2"
                            )}
                          >
                            <Icon className={cn(
                              "h-5 w-5 flex-shrink-0",
                              active ? "text-emerald-600" : "text-slate-400"
                            )} />
                            {sidebarOpen && (
                              <span className="truncate text-sm">{item.label}</span>
                            )}
                          </Link>
                        );

                        if (!sidebarOpen) {
                          return (
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                {linkContent}
                              </TooltipTrigger>
                              <TooltipContent side="right" sideOffset={8}>
                                {item.label}
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return linkContent;
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
