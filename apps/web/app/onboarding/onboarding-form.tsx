"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import styles from "./onboarding.module.css";

/**
 * Onboarding: captura o Perfil mínimo (nome de exibição + cidade de origem + país)
 * e o grava na API via proxy do BFF (`/api/profile`, autenticado). Em sucesso, segue
 * para `/app`. O nome chega pré-preenchido quando o provedor o forneceu (Google).
 *
 * A `cidade de origem` é texto livre por ora — o mapa cidade→aeroporto é Fase 5
 * (ADR-0006).
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
          origin_city: originCity,
          country,
        }),
      });
      if (!res.ok) {
        throw new Error("request failed");
      }
      // O JWT carimbado no login ainda diz `needsOnboarding`; renova a sessão para
      // que o middleware não devolva a área logada ao /onboarding (#193).
      await update({ needsOnboarding: false });
      router.refresh();
      router.push("/app");
    } catch {
      setError("Não consegui salvar seu perfil agora. Confira os campos e tente de novo.");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={`mono ${styles.label}`}>Nome</span>
        <input
          type="text"
          name="display_name"
          required
          autoComplete="name"
          className={styles.input}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Como te chamam"
        />
      </label>
      <label className={styles.field}>
        <span className={`mono ${styles.label}`}>Cidade de origem</span>
        <input
          type="text"
          name="origin_city"
          required
          className={styles.input}
          value={originCity}
          onChange={(event) => setOriginCity(event.target.value)}
          placeholder="De onde você costuma sair"
        />
      </label>
      <label className={styles.field}>
        <span className={`mono ${styles.label}`}>País</span>
        <select
          name="country"
          required
          className={styles.select}
          value={country}
          onChange={(event) => setCountry(event.target.value)}
        >
          <option value="">Selecione o país</option>
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className={styles.primary}
        disabled={pending || !displayName.trim() || !originCity.trim() || !country}
      >
        Concluir
      </button>
    </form>
  );
}
