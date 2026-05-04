import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[]; // existing values from siblings
  placeholder?: string;
  emptyHint?: string;
  className?: string;
}

/**
 * A free-text input with smart suggestions drawn from values already used
 * elsewhere in the plan. Pick one with a click, or type a new value.
 */
export function Combobox({ value, onChange, suggestions, placeholder, emptyHint, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of suggestions) {
      const k = s.trim();
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [suggestions]);

  const showAdd = query.trim().length > 0 && !counts.some(([k]) => k.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-10", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{value || placeholder || "Pick or type…"}</span>
          <ChevronDown size={14} className="opacity-50 shrink-0 ml-2"/>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={placeholder ?? "Search or type new…"} value={query} onValueChange={setQuery}/>
          <CommandList>
            <CommandEmpty>{emptyHint ?? "Nothing yet — type to add the first one."}</CommandEmpty>
            {counts.length > 0 && (
              <CommandGroup heading="Already used">
                {counts.map(([k, n]) => (
                  <CommandItem key={k} value={k} onSelect={() => { onChange(k); setOpen(false); setQuery(""); }}>
                    <Check size={14} className={cn("mr-2", value === k ? "opacity-100" : "opacity-0")}/>
                    <span className="flex-1 truncate">{k}</span>
                    <span className="text-xs text-muted-foreground ml-2">{n}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showAdd && (
              <CommandGroup>
                <CommandItem value={`__add__${query}`} onSelect={() => { onChange(query.trim()); setOpen(false); setQuery(""); }}>
                  <span className="text-primary">+ Add &ldquo;{query.trim()}&rdquo;</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}