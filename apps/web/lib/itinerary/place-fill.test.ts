import type { PlacePublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { placeToItemFields } from "./place-fill";

const PLACE: PlacePublic = {
  name: "Torre Eiffel",
  city: "Paris",
  country: "França",
  address: "Champ de Mars, 5 Av. Anatole France",
  link: "https://maps.example/eiffel",
};

describe("placeToItemFields", () => {
  it("pré-preenche título, notas (endereço) e link", () => {
    expect(placeToItemFields(PLACE)).toEqual({
      title: "Torre Eiffel",
      notes: "Champ de Mars, 5 Av. Anatole France",
      link: "https://maps.example/eiffel",
    });
  });

  it("preserva notas/link atuais quando o lugar não traz endereço/link", () => {
    const place = { ...PLACE, address: "", link: "" };
    expect(placeToItemFields(place, { notes: "manual", link: "https://x" })).toEqual({
      title: "Torre Eiffel",
      notes: "manual",
      link: "https://x",
    });
  });
});
