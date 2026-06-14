"use client";

import type { AirlinePublic } from "@traveltogether/types";
import { useEffect, useRef, useState } from "react";

import { searchAirlinesAction } from "@/app/actions/airlines";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

// Autocomplete de companhia aérea com logo: digitar o nome busca no dataset;
// selecionar grava o nome da companhia. Digitação manual continua possível —
// o valor da tarifa segue manual (issue #60), isto só preenche o formulário.
export function AirlineAutocomplete({ value, onChange, placeholder = "TAP Air Portugal" }: Props) {
  const [suggestions, setSuggestions] = useState<AirlinePublic[]>([]);
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
      const results = await searchAirlinesAction(q);
      if (!cancelled) setSuggestions(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [activeQuery]);

  function pick(airline: AirlinePublic) {
    onChange(airline.name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <label className="field" style={{ position: "relative" }}>
      <span>Companhia</span>
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
        required
        value={value}
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-menu">
          {suggestions.map((a) => (
            <li key={a.iata}>
              <button onMouseDown={() => pick(a)} type="button">
                {/* logo do CDN público; alt vazio pois o nome já é exibido ao lado */}
                {/* biome-ignore lint/performance/noImgElement: logo externo de CDN, sem otimização do next/image */}
                <img
                  alt=""
                  height={18}
                  src={a.logo_url}
                  style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 3 }}
                  width={18}
                />
                <span style={{ fontWeight: 600 }}>
                  {a.name}
                  <span className="soft" style={{ marginLeft: 6, fontSize: 12 }}>
                    <span className="mono">{a.iata}</span> · {a.country}
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
