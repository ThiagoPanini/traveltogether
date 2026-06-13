"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AirportAutocomplete, type AirportPatch } from "@/components/airport-autocomplete";
import { Icon } from "@/components/atlas";
import { DateField } from "@/components/date-field";
import { createTripWithStopsAction } from "./actions";

type FormState = "idle" | "submitting" | "error";

interface StopRow {
  key: string;
  city: string;
  airport: string;
  lat: number | null;
  lon: number | null;
  arrive: string;
  depart: string;
}

let rowSeq = 0;
const nextKey = () => `row-${rowSeq++}-${Date.now()}`;

export function NewTripForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originCity, setOriginCity] = useState("São Paulo");
  const [originAirport, setOriginAirport] = useState("GRU");
  const [originLat, setOriginLat] = useState<number | null>(-23.4356);
  const [originLon, setOriginLon] = useState<number | null>(-46.4731);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hasStops, setHasStops] = useState<boolean | null>(null);
  const [stops, setStops] = useState<StopRow[]>([]);

  function addStopRow() {
    const last = stops[stops.length - 1];
    const arrive = last ? last.depart : start || "";
    setStops((prev) => [
      ...prev,
      { key: nextKey(), city: "", airport: "", lat: null, lon: null, arrive, depart: end || "" },
    ]);
  }
  function updStop(key: string, field: "arrive" | "depart", val: string) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: val } : s)));
  }
  function patchStop(key: string, patch: AirportPatch) {
    setStops((prev) =>
      prev.map((s) =>
        s.key === key
          ? {
              ...s,
              ...(patch.city !== undefined ? { city: patch.city } : {}),
              ...(patch.airport_code !== undefined ? { airport: patch.airport_code ?? "" } : {}),
              ...(patch.latitude !== undefined ? { lat: patch.latitude } : {}),
              ...(patch.longitude !== undefined ? { lon: patch.longitude } : {}),
            }
          : s,
      ),
    );
  }
  function patchOrigin(patch: AirportPatch) {
    if (patch.city !== undefined) setOriginCity(patch.city);
    if (patch.airport_code !== undefined) setOriginAirport(patch.airport_code ?? "");
    if (patch.latitude !== undefined) setOriginLat(patch.latitude);
    if (patch.longitude !== undefined) setOriginLon(patch.longitude);
  }
  function rmStop(key: string) {
    setStops((prev) => prev.filter((s) => s.key !== key));
  }

  const valid =
    name.trim() &&
    originCity.trim() &&
    originAirport.trim().length === 3 &&
    start &&
    end &&
    end >= start &&
    (hasStops !== true ||
      stops.every((s) => s.city.trim() && s.airport.trim().length === 3 && s.arrive && s.depart));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    setState("submitting");

    const result = await createTripWithStopsAction(
      {
        name: name.trim(),
        description: description.trim(),
        origin: originCity.trim(),
        airport_code: originAirport.trim().toUpperCase() || null,
        latitude: originLat,
        longitude: originLon,
        start_date: start || null,
        end_date: end || null,
      },
      hasStops === true
        ? stops.map((s) => ({
            city: s.city.trim(),
            airport_code: s.airport.trim().toUpperCase() || null,
            latitude: s.lat,
            longitude: s.lon,
            arrival_date: s.arrive || null,
            departure_date: s.depart || null,
          }))
        : [],
    );

    if (result) {
      router.push(`/trips/${result.trip.id}`);
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

      <fieldset
        className="card flat"
        style={{ border: "1px solid var(--line)", padding: "24px 24px 28px", margin: 0 }}
      >
        <legend>03 · paradas</legend>
        <p className="soft" style={{ fontSize: 14, marginBottom: 16 }}>
          Essa viagem já tem cidades definidas?
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: hasStops === true ? 22 : 0 }}>
          <button
            className={`btn small ${hasStops === true ? "" : "ghost"}`}
            onClick={() => {
              setHasStops(true);
              if (!stops.length) addStopRow();
            }}
            type="button"
          >
            Sim, adicionar paradas
          </button>
          <button
            className={`btn small ${hasStops === false ? "" : "ghost"}`}
            onClick={() => setHasStops(false)}
            type="button"
          >
            Ainda não — decidir depois
          </button>
        </div>

        {hasStops === true && (
          <div style={{ display: "grid", gap: 12 }}>
            {stops.map((s, idx) => (
              <div
                key={s.key}
                className="card flat"
                style={{
                  padding: "16px 16px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span className="chip outline">parada {String(idx + 1).padStart(2, "0")}</span>
                  <span className="spacer" style={{ flex: 1 }} />
                  <button
                    className="icon-btn"
                    onClick={() => rmStop(s.key)}
                    title="Remover parada"
                    type="button"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <AirportAutocomplete
                  airportValue={s.airport}
                  cityValue={s.city}
                  onChange={(patch) => patchStop(s.key, patch)}
                />
                <div className="form-row cols-2" style={{ marginTop: 12 }}>
                  <div className="field">
                    <span>Chegada</span>
                    <DateField
                      ariaLabel="Chegada"
                      max={end || undefined}
                      min={start || undefined}
                      onChange={(v) => updStop(s.key, "arrive", v)}
                      value={s.arrive}
                    />
                  </div>
                  <div className="field">
                    <span>Saída</span>
                    <DateField
                      ariaLabel="Saída"
                      max={end || undefined}
                      min={s.arrive || start || undefined}
                      onChange={(v) => updStop(s.key, "depart", v)}
                      value={s.depart}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn ghost small"
              onClick={addStopRow}
              style={{ justifySelf: "start" }}
              type="button"
            >
              <Icon name="plus" size={13} /> Mais uma parada
            </button>
            <p className="hint">
              Os trajetos ({originAirport.toUpperCase() || "···"} → … →{" "}
              {originAirport.toUpperCase() || "···"}) serão derivados automaticamente da ordem das
              paradas.
            </p>
          </div>
        )}
      </fieldset>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={() => router.push("/trips")} type="button">
          Cancelar
        </button>
        <button className="btn accent" disabled={!valid || state === "submitting"} type="submit">
          {state === "submitting" ? "Criando…" : "Criar viagem"}{" "}
          <Icon name="arrowRight" size={14} />
        </button>
      </div>

      {state === "error" && (
        <p className="hint" role="status" style={{ color: "var(--danger)" }}>
          Não foi possível criar a viagem.
        </p>
      )}
    </form>
  );
}
