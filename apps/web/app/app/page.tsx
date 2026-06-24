/**
 * Stub da área autenticada (#189). Existe para as fatias seguintes terem onde
 * aterrissar — a proteção real (middleware) chega na fatia de home (#193), e o
 * empty-state honesto ("criar viagem está chegando", nota no ADR-0001) também.
 */
export default function AppHome() {
  return (
    <main>
      <h1>Minhas Viagens</h1>
      <p>Área logada em construção.</p>
    </main>
  );
}
