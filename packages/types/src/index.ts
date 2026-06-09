// Tipos compartilhados derivados do schema OpenAPI da traveltogether API.

export type MembershipRole = "organizer" | "member";

export interface TripPublic {
  id: string;
  name: string;
  description: string;
  origin: string;
  created_by: string;
  created_at: string;
}

export interface MembershipPublic {
  id: string;
  trip_id: string;
  user_id: string;
  role: MembershipRole;
  joined_at: string;
}

export interface TripWithMembership {
  trip: TripPublic;
  membership: MembershipPublic;
}
