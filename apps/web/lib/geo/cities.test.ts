import { describe, expect, it } from "vitest";
import { findCity } from "./cities";

describe("findCity", () => {
  it("resolve a cidade de origem sem exigir os mesmos acentos e restringe pelo país", async () => {
    // given: a origem textual do Perfil e seu país
    const city = "Sao Paulo";

    // when: o mapa tenta geocodificar a origem no recorte brasileiro
    const match = await findCity("BR", city);

    // then: encontra a entrada GeoNames exata dentro do país
    expect(match).toMatchObject({ name: "São Paulo" });
    expect(match?.lat).toBeTypeOf("number");
    expect(await findCity("PT", city)).toBeNull();
  });
});
