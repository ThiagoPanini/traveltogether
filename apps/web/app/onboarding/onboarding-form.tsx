"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import styles from "./onboarding.module.css";

function countryName(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? "País a definir";
}

/**
 * Perfil mínimo em uma etapa: nome, cidade de origem e país. A origem é do Perfil
 * (não da Viagem) e vira a base visual de cada rota que o usuário criar.
 */
export function OnboardingForm({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const { update } = useSession();

  const [displayName, setDisplayName] = useState(defaultName);
  const [originCity, setOriginCity] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          origin_city: originCity.trim(),
          country,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      await update({ needsOnboarding: false });
      router.refresh();
      router.push("/app");
    } catch {
      setError("Não consegui salvar seu perfil agora. Confira os campos e tente de novo.");
      setPending(false);
    }
  }

  const firstName = displayName.trim().split(/\s+/)[0] || "viajante";
  const cityLabel = originCity.trim() || "Sua cidade";
  const countryLabel = country ? countryName(country) : "País a definir";
  const canSubmit = displayName.trim() && originCity.trim() && country;

  return (
    <div className={styles.layout}>
      <form className={styles.formPanel} onSubmit={handleSubmit}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" /> Antes de embarcar
        </p>
        <h1>Defina sua origem-base</h1>
        <p className={styles.sub}>
          Toda rota que vocês traçarem parte daqui. É a única coisa que precisamos agora — dá pra
          ajustar depois no perfil.
        </p>

        <label className={styles.field} htmlFor="display_name">
          <span>Como te chamamos?</span>
          <input
            id="display_name"
            type="text"
            name="display_name"
            required
            autoComplete="name"
            className={styles.nameInput}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Seu nome"
          />
        </label>

        <div className={styles.originFields}>
          <label className={styles.field} htmlFor="origin_city">
            <span>Cidade de origem</span>
            <input
              id="origin_city"
              type="text"
              name="origin_city"
              required
              autoComplete="address-level2"
              value={originCity}
              onChange={(event) => setOriginCity(event.target.value)}
              placeholder="São Paulo"
            />
          </label>
          <label className={styles.field} htmlFor="country">
            <span>País</span>
            <select
              id="country"
              name="country"
              required
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">Selecione</option>
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className={styles.primary} disabled={pending || !canSubmit}>
          Concluir e embarcar →
        </button>
      </form>

      <aside className={styles.preview} aria-label="Seu cartão de origem">
        <p>Seu cartão de origem</p>
        <div className={styles.originCard}>
          <div className={styles.originKicker}>
            <span aria-hidden="true" />
            Origem · você
          </div>
          <strong>{cityLabel}</strong>
          <span>{countryLabel}</span>
        </div>
        <p className={styles.previewNote}>
          É assim que <span>{firstName}</span> vai aparecer como ponto de partida em cada viagem do
          grupo.
        </p>
      </aside>
    </div>
  );
}
