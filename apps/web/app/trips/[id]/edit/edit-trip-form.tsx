"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AirportAutocomplete, type AirportPatch } from "@/components/airport-autocomplete";
import { Icon } from "@/components/atlas";
import { DateField } from "@/components/date-field";
import { updateTripAction } from "../actions";

type FormState = "idle" | "submitting" | "error";

interface Props {
  tripId: string;
  initial: {
    name: string;
    description: string;
    origin: string;
    airport: string;
    start: string;
    end: string;
  };
}

export function EditTripForm({ tripId, initial }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [originCity, setOriginCity] = useState(initial.origin);
  const [originAirport, setOriginAirport] = useState(initial.airport);
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLon, setOriginLon] = useState<number | null>(null);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);

  function patchOrigin(patch: AirportPatch) {
    if (patch.city !== undefined) setOriginCity(patch.city);
    if (patch.airport_code !== undefined) setOriginAirport(patch.airport_code ?? "");
    if (patch.latitude !== undefined) setOriginLat(patch.latitude);
    if (patch.longitude !== undefined) setOriginLon(patch.longitude);
  }

  const valid =
    name.trim() &&
    originCity.trim() &&
    originAirport.trim().length === 3 &&
    (!start || !end || end >= start);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    setState("submitting");

    const updated = await updateTripAction(tripId, {
      name: name.trim(),
      description: description.trim(),
      origin: originCity.trim(),
      airport_code: originAirport.trim().toUpperCase() || null,
      latitude: originLat,
      longitude: originLon,
      start_date: start || null,
      end_date: end || null,
    });

    if (updated) {
      router.push(`/trips/${tripId}`);
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 22 }}>
      <fieldset
        className="card flat"
        style={{ border: "1px solid var(--line)", padding: "24px 24px 28px", margin: 0 }}
      >
        <legend>01 · o básico</legend>
        <div className="form-grid">
          <label className="field">
            <span>Nome da viagem</span>
            <input
              onChange={(e) => setName(e.target.value)}
              placeholder="Eurotrip do grupo"
              required
              value={name}
            />
          </label>
          <label className="field">
            <span>Descrição (opcional)</span>
            <textarea
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qual é a história dessa viagem?"
              rows={2}
              value={description}
            />
          </label>
        </div>
      </fieldset>

      <fieldset
        className="card flat"
        style={{ border: "1px solid var(--line)", padding: "24px 24px 28px", margin: 0 }}
      >
        <legend>02 · origem e período</legend>
        <div className="form-grid">
          <AirportAutocomplete
            airportLabel="Aeroporto de referência"
            airportValue={originAirport}
            cityLabel="Cidade de origem"
            cityPlaceholder="São Paulo"
            cityValue={originCity}
            onChange={patchOrigin}
          />
          <div className="form-row cols-2">
            <div className="field">
              <span>Data de ida</span>
              <DateField ariaLabel="Data de ida" onChange={setStart} value={start} />
            </div>
            <div className="field">
              <span>Data de volta</span>
              <DateField
                ariaLabel="Data de volta"
                min={start || undefined}
                onChange={setEnd}
                value={end}
              />
            </div>
          </div>
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={() => router.push(`/trips/${tripId}`)} type="button">
          Cancelar
        </button>
        <button className="btn accent" disabled={!valid || state === "submitting"} type="submit">
          {state === "submitting" ? "Salvando…" : "Salvar alterações"}{" "}
          <Icon name="check" size={14} />
        </button>
      </div>

      {state === "error" && (
        <p className="hint" role="status" style={{ color: "var(--danger)" }}>
          Não foi possível salvar as alterações.
        </p>
      )}
    </form>
  );
}
