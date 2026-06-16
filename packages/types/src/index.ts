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

export interface AirlinePublic {
  iata: string;
  name: string;
  country: string;
  logo_url: string;
}

export interface PlacePublic {
  name: string;
  city: string;
  country: string;
  address: string;
  link: string;
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

// Convite pendente na lista de membros do Organizador (ADR-0015).
export interface PendingMembershipPublic {
  id: string;
  trip_id: string;
  email: string;
  role: MembershipRole;
  invited_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "declined";

// Convite pendente apresentado ao convidado (com nome da Viagem).
export interface InviteForUserPublic {
  id: string;
  trip_id: string;
  trip_name: string;
  email: string;
  role: MembershipRole;
  created_at: string;
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
  existing_user: UserPublic | null;
}

export interface NetworkSuggestionItem {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NetworkSuggestionsResponse {
  suggestions: NetworkSuggestionItem[];
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

export type ActivityKind = "comment" | "fare_registered" | "member_joined";

export interface ActivityItemPublic {
  id: string;
  kind: ActivityKind;
  trip_id: string;
  trip_name: string;
  actor_name: string | null;
  body: string;
  occurred_at: string;
}

export type PendingActionKind =
  | "leg_without_fare"
  | "fare_without_chosen"
  | "stop_without_itinerary";

export interface PendingActionPublic {
  kind: PendingActionKind;
  trip_id: string;
  trip_name: string;
  target_kind: string;
  target_id: string;
  label: string;
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

// Boundary collaboration — Comentário com alvo polimórfico (ADR-0014).
export type CommentTargetType = "fare_quote" | "itinerary_item" | "trip";

export interface CommentPublic {
  id: string;
  trip_id: string;
  target_type: CommentTargetType;
  target_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends CommentPublic {
  author_display_name: string | null;
  author_avatar_url: string | null;
}

export interface CommentCreate {
  target_type: CommentTargetType;
  target_id: string;
  body: string;
}

export interface CommentUpdate {
  body: string;
}

// Boundary collaboration — Tarefa com board kanban (ADR-0014, invariante 18).
export type TaskStatus = "todo" | "doing" | "done";
export type TaskAnchorType = "leg" | "stop" | "fare_quote" | "itinerary_item";

export interface TaskAssigneePublic {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface TaskPublic {
  id: string;
  trip_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: TaskStatus;
  anchor_type: TaskAnchorType | null;
  anchor_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee_ids: string[];
}

export interface TaskWithAssignees extends TaskPublic {
  assignees: TaskAssigneePublic[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string | null;
  anchor_type?: TaskAnchorType | null;
  anchor_id?: string | null;
  assignee_ids?: string[];
}

export interface TaskUpdate {
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  anchor_type?: TaskAnchorType | null;
  anchor_id?: string | null;
  assignee_ids?: string[] | null;
}

// Boundary budget — Orçamento por moeda, sem conversão de câmbio (ADR-0016, invariantes 15 e 19).
export type RateioBasis = "per_person" | "split";

export interface LodgingPublic {
  id: string;
  trip_id: string;
  stop_id: string;
  description: string;
  nightly_value: string;
  currency: string;
  basis: RateioBasis;
  created_by: string;
  created_at: string;
}

export interface LodgingCreate {
  stop_id: string;
  description?: string;
  nightly_value: string;
  currency: string;
  basis?: RateioBasis;
}

export interface LodgingUpdate {
  stop_id?: string | null;
  description?: string | null;
  nightly_value?: string | null;
  currency?: string | null;
  basis?: RateioBasis | null;
}

export interface ExtraPublic {
  id: string;
  trip_id: string;
  description: string;
  value: string;
  currency: string;
  basis: RateioBasis;
  created_by: string;
  created_at: string;
}

export interface ExtraCreate {
  description?: string;
  value: string;
  currency: string;
  basis?: RateioBasis;
}

export interface ExtraUpdate {
  description?: string | null;
  value?: string | null;
  currency?: string | null;
  basis?: RateioBasis | null;
}

export interface CurrencySubtotal {
  currency: string;
  per_group: string;
  per_person: string;
}

export interface BudgetSummary {
  member_count: number;
  subtotals: CurrencySubtotal[];
}
