import Link from "next/link";
import styles from "./page.module.css";

const routeNodes = [
  { city: "São Paulo", tag: "Origem · você", variant: "origin" },
  { city: "Nova York", tag: "Parada 01", variant: "stop" },
  { city: "Miami", tag: "Parada 02", variant: "stop" },
  { city: "Orlando", tag: "★ Destino", variant: "dest" },
] as const;

const steps = [
  {
    icon: "✦",
    number: "01",
    title: "Tracem as Paradas",
    body: "As cidades na ordem em que vão ficar. A última parada é o destino — ele aparece sozinho.",
  },
  {
    icon: "✈",
    number: "02",
    title: "Pesquisem o translado",
    body: "Cada um cadastra o que encontrou entre duas paradas — avião ou terrestre, em dinheiro ou pontos.",
  },
  {
    icon: "★",
    number: "03",
    title: "Marquem a Preferida",
    body: "Sua decisão é pessoal. Todo mundo enxerga a de todo mundo — sem voto, sem rota escolhida pelo grupo.",
  },
] as const;

const crew = [
  { initial: "A", name: "Ana", role: "Organizadora", status: "Preferiu a direta", tone: "success" },
  { initial: "B", name: "Bruno", role: "Membro", status: "Prefere via Miami", tone: "accent" },
  { initial: "C", name: "Carla", role: "Membro", status: "Comprou a direta", tone: "success" },
  { initial: "D", name: "Diego", role: "Membro", status: "Sem preferida", tone: "muted" },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="travelmanager">
            <span className={styles.brandMark} aria-hidden="true">
              ✦
            </span>
            <span>travel·manager</span>
          </Link>
          <Link href="/entrar" className={styles.login}>
            Entrar
          </Link>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true">✦</span> Caderno de bordo compartilhado
            </p>
            <h1 id="hero-title">
              O translado da viagem,
              <br />
              decidido <span>juntos</span>.
            </h1>
            <p className={styles.heroText}>
              Cadastrem a viagem, tracem as paradas cidade a cidade e comparem o translado entre
              elas. Cada um marca a sua preferida — sem planilha perdida, sem votação que decida por
              alguém.
            </p>
            <div className={styles.heroActions}>
              <Link href="/entrar" className={styles.primary}>
                Criar viagem
              </Link>
              <Link href="/app/viagens/orlando" className={styles.secondary}>
                Ver exemplo →
              </Link>
            </div>
          </div>

          <RouteMotif />
        </section>

        <section className={styles.stepsSection} aria-labelledby="steps-title">
          <p className={styles.sectionKicker}>Por onde começar</p>
          <h2 id="steps-title">O modelo, em três passos</h2>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <article key={step.number} className={styles.stepCard}>
                <div className={styles.stepTop}>
                  <span aria-hidden="true">{step.icon}</span>
                  <span>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.decision} aria-labelledby="decision-title">
          <div className={styles.decisionHead}>
            <div>
              <p className={styles.decisionKicker}>A decisão</p>
              <h2 id="decision-title">É de cada um</h2>
            </div>
            <p className={styles.decisionRoute}>
              São Paulo → Nova York
              <br />
              <span>2 de 4 já preferem</span>
            </p>
          </div>
          <div className={styles.crewGrid}>
            {crew.map((member) => (
              <article key={member.initial} className={styles.crewCard}>
                <div className={styles.crewIdentity}>
                  <span className={`${styles.avatar} ${styles[member.tone]}`} aria-hidden="true">
                    {member.initial}
                  </span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                  </div>
                </div>
                <span className={`${styles.status} ${styles[member.tone]}`}>{member.status}</span>
              </article>
            ))}
          </div>
          <p className={styles.decisionNote}>
            A contagem mostra para onde o grupo tende. Ela não decide por ninguém.
          </p>
        </section>

        <footer className={styles.footer}>
          <Link href="/" className={styles.footerBrand} aria-label="travelmanager">
            <span className={styles.footerMark} aria-hidden="true">
              ✦
            </span>
            <span>travel·manager</span>
          </Link>
          <span>Decidam o translado juntos</span>
        </footer>
      </div>
    </main>
  );
}

function RouteMotif() {
  return (
    <aside className={styles.routeMotif} aria-label="Rota de exemplo">
      <div className={styles.routeMeta}>
        <span>Rota · exemplo</span>
        <span>4 cidades · 3 trajetos</span>
      </div>
      <ol className={styles.routeList}>
        {routeNodes.map((node) => (
          <li key={node.city} className={styles.routeNode}>
            <span className={`${styles.routeDot} ${styles[node.variant]}`} aria-hidden="true">
              {node.variant === "dest" ? "★" : ""}
            </span>
            <strong>{node.city}</strong>
            <span>{node.tag}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
