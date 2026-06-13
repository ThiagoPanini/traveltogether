// Tipos compartilhados derivados do schema OpenAPI da traveltogether API.

export type MembershipRole = "organizer" | "member";

export interface UserPublic {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UserUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface AirportPublic {
  iata: string;
  city: string;
  country: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface TripPublic {
  id: string;
  name: string;
  description: string;
  origin: string;
  airport_code: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_key: string | null;
  cover_image_url: string | null;
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

export interface TripSummary extends TripWithMembership {
  stops: StopPublic[];
  cover_image_url: string | null;
}

export interface PendingMembershipPublic {
  id: string;
  trip_id: string;
  email: string;
  role: MembershipRole;
  invited_at: string;
}

export interface MemberWithUser {
  membership: MembershipPublic;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MembersListResponse {
  members: MemberWithUser[];
  pending: PendingMembershipPublic[];
}

export interface AddMemberResponse {
  pending: boolean;
  membership: MembershipPublic | null;
  pending_membership: PendingMembershipPublic | null;
}

export interface StopPublic {
  id: string;
  trip_id: string;
  city: string;
  airport_code: string | null;
  latitude: number | null;
  longitude: number | null;
  arrival_date: string | null;
  departure_date: string | null;
  cover_image_key: string | null;
  cover_image_url: string | null;
  order: number;
}

export interface StopCreate {
  city: string;
  airport_code?: string | null | undefined;
  latitude?: number | null;
  longitude?: number | null;
  arrival_date?: string | null;
  departure_date?: string | null;
}

export interface StopUpdate {
  city?: string | null;
  airport_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  arrival_date?: string | null;
  departure_date?: string | null;
}

export interface ReorderStopsRequest {
  stop_ids: string[];
}

export interface LegPublic {
  id: string;
  trip_id: string;
  origin_stop_id: string | null;
  destination_stop_id: string | null;
  target_date: string | null;
  order: number;
}

export interface LegCreate {
  origin_stop_id?: string | null;
  destination_stop_id?: string | null;
  target_date?: string | null;
}

export interface LegUpdate {
  origin_stop_id?: string | null;
  destination_stop_id?: string | null;
  target_date?: string | null;
}

export interface ItineraryItemPublic {
  id: string;
  stop_id: string;
  title: string;
  notes: string;
  link: string;
  day: string | null;
  time: string | null;
  order: number;
}

export interface ItineraryItemCreate {
  title: string;
  notes?: string;
  link?: string;
  day?: string | null;
  time?: string | null;
}

export interface ItineraryItemUpdate {
  title?: string | null;
  notes?: string | null;
  link?: string | null;
  day?: string | null;
  time?: string | null;
}

export interface ReorderItineraryItemsRequest {
  item_ids: string[];
}

export interface FareQuotePublic {
  id: string;
  leg_id: string;
  registered_by: string;
  created_at: string;
  value: string;
  currency: string;
  flight_date: string;
  duration_minutes: number;
  stops: number;
  checked_baggage: boolean;
  origin_airport: string;
  destination_airport: string;
  airline: string;
  link: string;
  notes: string;
  is_chosen: boolean;
  upvote_count: number;
  user_voted: boolean;
  registered_by_display_name: string | null;
  registered_by_avatar_url: string | null;
}

export interface FareQuoteCreate {
  value: string;
  currency: string;
  flight_date: string;
  duration_minutes: number;
  stops?: number;
  checked_baggage?: boolean;
  origin_airport: string;
  destination_airport: string;
  airline: string;
  link?: string;
  notes?: string;
}

export interface FareQuoteUpdate {
  value?: string | null;
  currency?: string | null;
  flight_date?: string | null;
  duration_minutes?: number | null;
  stops?: number | null;
  checked_baggage?: boolean | null;
  origin_airport?: string | null;
  destination_airport?: string | null;
  airline?: string | null;
  link?: string | null;
  notes?: string | null;
}

export interface UpvoteResponse {
  count: number;
  voted: boolean;
}
