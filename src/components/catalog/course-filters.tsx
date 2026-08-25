"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List as ListIcon, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { courseCategories } from "@/lib/validations/course";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const SORTS = [
  { value: "popular", label: "Más populares" },
  { value: "newest", label: "Más recientes" },
  { value: "rating", label: "Mejor valorados" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
];

const RATINGS = [
  { value: "4.5", label: "4.5 y más" },
  { value: "4", label: "4.0 y más" },
  { value: "3", label: "3.0 y más" },
];

export function CourseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== "view") params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParam("search", search || null);
      }
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeCategory = searchParams.get("category");
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  const searchField = (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar cursos..."
        className="pl-9"
        data-testid="catalog-search"
      />
    </div>
  );

  const levelSelect = (
    <Select
      value={searchParams.get("level") ?? "all"}
      onValueChange={(value) => updateParam("level", value === "all" ? null : value)}
    >
      <SelectTrigger className="w-full lg:w-40">
        <SelectValue placeholder="Nivel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los niveles</SelectItem>
        {LEVELS.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            {level.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const ratingSelect = (
    <Select
      value={searchParams.get("minRating") ?? "all"}
      onValueChange={(value) => updateParam("minRating", value === "all" ? null : value)}
    >
      <SelectTrigger className="w-full lg:w-40">
        <SelectValue placeholder="Valoración" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Cualquier valoración</SelectItem>
        {RATINGS.map((rating) => (
          <SelectItem key={rating.value} value={rating.value}>
            {rating.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const sortSelect = (
    <Select
      value={searchParams.get("sort") ?? "popular"}
      onValueChange={(value) => updateParam("sort", value === "popular" ? null : value)}
    >
      <SelectTrigger className="w-full gap-2 rounded-full border-primary/30 bg-primary/10 font-semibold text-primary lg:w-auto">
        <Star className="size-3.5 fill-current" />
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        {SORTS.map((sort) => (
          <SelectItem key={sort.value} value={sort.value}>
            {sort.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const viewToggle = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => updateParam("view", null)}
        aria-label="Vista de cuadrícula"
        aria-pressed={view === "grid"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors lg:size-8",
          view === "grid"
            ? "border-primary bg-primary/10 text-primary"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => updateParam("view", "list")}
        aria-label="Vista de lista"
        aria-pressed={view === "list"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors lg:size-8",
          view === "list"
            ? "border-primary bg-primary/10 text-primary"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        <ListIcon className="size-4" />
      </button>
    </div>
  );

  const categoryChips = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => updateParam("category", null)}
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
          !activeCategory
            ? "border-primary bg-primary/10 text-primary"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        Todas
      </button>
      {courseCategories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => updateParam("category", category)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
            activeCategory === category
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:bg-muted",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden items-center gap-3 lg:flex">
        <div className="max-w-xs flex-1">{searchField}</div>
        {levelSelect}
        {ratingSelect}
        {sortSelect}
        <div className="flex-1" />
        {viewToggle}
      </div>
      <div className="hidden lg:block">{categoryChips}</div>

      <div className="flex items-center gap-2 lg:hidden">
        {searchField}
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-label="Filtros"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            filtersOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="size-4" />
        </button>
        {viewToggle}
      </div>

      {filtersOpen && (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3.5 lg:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Filtros</span>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          {categoryChips}
          <div className="grid grid-cols-2 gap-2">
            {levelSelect}
            {ratingSelect}
          </div>
          {sortSelect}
        </div>
      )}
    </div>
  );
}
