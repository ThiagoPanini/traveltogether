"use client";

import type { AirportPublic } from "@traveltogether/types";
import { useEffect, useRef, useState } from "react";

import { searchAirportsAction } from "@/app/actions/airports";

export interface AirportPatch {
  city?: string;
  airport_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  cityValue: string;
  airportValue: string;
  onChange: (patch: AirportPatch) => void;
  cityPlaceholder?: string;
  cityLabel?: string;
  airportLabel?: string;
}

// Autocomplete cidade→IATA: digitar cidade busca no dataset; selecionar grava
// código IATA + coordenadas. Digitação manual continua possível (fallback) —
// coordenadas ficam nulas até uma seleção (degradação graciosa no mapa, #68).
export function AirportAutocomplete({
  cityValue,
  airportValue,
  onChange,
  cityPlaceholder = "Lisboa",
  cityLabel = "Cidade",
  airportLabel = "Aeroporto",
}: Props) {
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
    onChange({
      city: airport.city,
      airport_code: airport.iata,
      latitude: airport.latitude,
      longitude: airport.longitude,
    });
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="form-row cols-2" style={{ alignItems: "start" }}>
      <label className="field" style={{ position: "relative" }}>
        <span>{cityLabel}</span>
        <input
          autoComplete="off"
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onChange={(e) => {
            onChange({ city: e.target.value });
            setActiveQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            if (suggestions.length) setOpen(true);
          }}
          placeholder={cityPlaceholder}
          value={cityValue}
        />
        {open && suggestions.length > 0 && (
          <ul className="autocomplete-menu">
            {suggestions.map((a) => (
              <li key={`${a.iata}-${a.name}`}>
                <button onMouseDown={() => pick(a)} type="button">
                  <span className="mono" style={{ fontWeight: 700, minWidth: 34 }}>
                    {a.iata}
                  </span>
                  <span>
                    {a.city}
                    <span className="soft" style={{ marginLeft: 6, fontSize: 12 }}>
                      {a.country} · {a.name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>
      <label className="field">
        <span>{airportLabel}</span>
        <input
          maxLength={3}
          onChange={(e) => onChange({ airport_code: e.target.value.toUpperCase() })}
          placeholder="LIS"
          style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
          value={airportValue}
        />
      </label>
    </div>
  );
}
