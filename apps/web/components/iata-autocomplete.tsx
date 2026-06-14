"use client";

import type { AirportPublic } from "@traveltogether/types";
import { useEffect, useRef, useState } from "react";

import { searchAirportsAction } from "@/app/actions/airports";

interface Props {
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
}

// Autocomplete IATA de campo único: digitar cidade/código sugere aeroportos e
// grava só o código IATA. Reusa o dataset do #59 nos campos de aeroporto da
// Pesquisa de Passagem (issue #60). Digitação manual continua possível.
export function IataAutocomplete({ value, onChange, placeholder = "GRU" }: Props) {
  const [suggestions, setSuggestions] = useState<AirportPublic[]>([]);
  const [open, setOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = activeQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchAirportsAction(q);
      if (!cancelled) setSuggestions(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [activeQuery]);

  function pick(airport: AirportPublic) {
    onChange(airport.iata);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <input
        autoComplete="off"
        maxLength={3}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setActiveQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          if (suggestions.length) setOpen(true);
        }}
        placeholder={placeholder}
        required
        style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)", width: 80 }}
        value={value}
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-menu" style={{ minWidth: 220 }}>
          {suggestions.map((a) => (
            <li key={`${a.iata}-${a.name}`}>
              <button onMouseDown={() => pick(a)} type="button">
                <span className="mono" style={{ fontWeight: 700, minWidth: 34 }}>
                  {a.iata}
                </span>
                <span>
                  {a.city}
                  <span className="soft" style={{ marginLeft: 6, fontSize: 12 }}>
                    {a.country}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
