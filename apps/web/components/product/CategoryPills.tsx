"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  icon?: string | null;
}

interface CategoryPillsProps {
  categories: CategoryOption[];
  selected: string;
  onSelect: (slug: string) => void;
  /** Optional emoji/short label that renders before "All" pill. */
  showAllIcon?: boolean;
  className?: string;
}

/**
 * Sticky horizontal-scrolling category chips.
 * Pattern: Blinkit/Zepto. Active pill is filled with primary color; others
 * are outlined. Auto-scrolls the active pill into view.
 */
export function CategoryPills({
  categories,
  selected,
  onSelect,
  showAllIcon = true,
  className,
}: CategoryPillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const active = activeRef.current;
    const scrollLeft =
      active.offsetLeft - container.clientWidth / 2 + active.clientWidth / 2;
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [selected]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateFades = () => {
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(
        el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      );
    };
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    return () => {
      el.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, [categories.length]);

  const allPill = (
    <button
      ref={selected === "" ? activeRef : null}
      onClick={() => onSelect("")}
      className={cn(
        "flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
        selected === ""
          ? "bg-primary-600 text-white shadow-md"
          : "bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
      )}
    >
      {showAllIcon && <span aria-hidden>🛍️</span>}
      <span>All</span>
    </button>
  );

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Category filter"
      >
        <div className="inline-flex items-center gap-2 px-1 py-1">
          {allPill}
          {categories.map((cat) => {
            const isActive = selected === cat.slug;
            return (
              <button
                key={cat.id}
                ref={isActive ? activeRef : null}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(cat.slug)}
                className={cn(
                  "flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                  isActive
                    ? "bg-primary-600 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
                )}
              >
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : cat.icon ? (
                  <span aria-hidden>{cat.icon}</span>
                ) : null}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
      )}
    </div>
  );
}
