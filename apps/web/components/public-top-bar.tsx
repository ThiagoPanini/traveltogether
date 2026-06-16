import Link from "next/link";

import { Icon } from "@/components/atlas";

// Barra superior das telas públicas (deslogadas). Extraída da Home para ser
// reutilizável. Marca à esquerda, CTA "Entrar" à direita.
export function PublicTopBar() {
  return (
    <header className="topbar">
      <div className="shell topbar-in">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Icon name="plane" size={14} />
          </span>
          travel<em>together</em>
        </Link>
        <div className="topbar-right">
          <Link className="btn small accent" href="/login">
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
