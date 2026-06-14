"use client";

import type { PlacePublic } from "@traveltogether/types";
import { useEffect, useRef, useState } from "react";

import { searchPlacesAction } from "@/app/actions/places";

interface Props {
  value: string;
  onChange: (title: string) => void;
  onSelect: (place: PlacePublic) => void;
  label?: string;
  placeholder?: string;
}

// Autocomplete de lugar/POI no Item de Roteiro: digitar uma atividade sugere o
// nome e, ao selecionar, pré-preenche título, endereço (em notas) e link (#61).
// Os campos seguem editáveis depois da seleção; digitação manual continua válida.
export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  label = "O que fazer",
  placeholder = "Bate-volta a Sintra",
}: Props) {
  const [suggestions, setSuggestions] = useState<PlacePublic[]>([]);
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
      const results = await searchPlacesAction(q);
      if (!cancelled) setSuggestions(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [activeQuery]);

  function pick(place: PlacePublic) {
    onSelect(place);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <label className="field" style={{ position: "relative" }}>
      <span>{label}</span>
      <input
        autoComplete="off"
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setActiveQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          if (suggestions.length) setOpen(true);
        }}
        placeholder={placeholder}
        value={value}
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-menu">
          {suggestions.map((p) => (
            <li key={`${p.name}-${p.city}`}>
              <button onMouseDown={() => pick(p)} type="button">
                <span style={{ fontWeight: 600 }}>
                  {p.name}
                  <span className="soft" style={{ marginLeft: 6, fontSize: 12 }}>
                    {p.city} · {p.country}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
