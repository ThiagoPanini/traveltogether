"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { createTrip } from "@/lib/api/trips";

type FormState = "idle" | "submitting" | "error";

interface Props {
  accessToken: string;
}

export function NewTripForm({ accessToken }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");

    const result = await createTrip(accessToken, { name, description, origin });
    if (result) {
      router.push(`/trips/${result.trip.id}`);
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <form className="login-panel" onSubmit={onSubmit} style={{ width: "min(100%, 28rem)" }}>
      <div className="login-heading">
        <p>traveltogether</p>
        <h1>Nova Viagem</h1>
      </div>

      <label className="login-field">
        <span>Nome da Viagem</span>
        <input
          name="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: NYC + Miami 2026"
          required
          type="text"
          value={name}
        />
      </label>

      <label className="login-field">
        <span>Origem (sua cidade/casa)</span>
        <input
          name="origin"
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Ex.: São Paulo"
          required
          type="text"
          value={origin}
        />
      </label>

      <label className="login-field">
        <span>Descrição (opcional)</span>
        <input
          name="description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Uma frase sobre a viagem"
          type="text"
          value={description}
        />
      </label>

      <button className="primary-button" disabled={state === "submitting"} type="submit">
        {state === "submitting" ? "Criando..." : "Criar Viagem"}
      </button>

      {state === "error" && (
        <p className="login-message" role="status">
          Não foi possível criar a viagem.
        </p>
      )}
    </form>
  );
}
