import {
  Bus,
  Car,
  CarFront,
  CircleHelp,
  Footprints,
  type LucideIcon,
  Pencil,
  Plane,
  Star,
  TrainFront,
  Truck,
  User,
} from "lucide-react";
import type { InviteRole, TransferDraft, TransferKind } from "@/lib/trips/draft";

/**
 * Ícones do app (lucide) — mono/linha, traço fino, herdam `currentColor` → terracota,
 * nunca emoji colorido (ADR-0009 / design Noturno). Substituem os glifos ASCII.
 */
export const TRANSFER_ICON: Record<TransferKind, LucideIcon> = {
  plane: Plane,
  rental_car: Car,
  own_car: CarFront,
  bus: Bus,
  train: TrainFront,
  van: Truck,
  on_foot: Footprints,
  other: Pencil,
  undecided: CircleHelp,
};

/** Ícone do papel numa Participação/Convite (ADR-0002). */
export const ROLE_ICON: Record<InviteRole, LucideIcon> = {
  member: User,
  organizer: Star,
};

/** Ícone do tipo de translado de um salto (`undecided` quando indefinido/nulo). */
export function TransferIcon({
  transfer,
  size = 20,
  className,
}: {
  transfer: TransferDraft | null;
  size?: number;
  className?: string;
}) {
  const kind = transfer?.kind ?? "undecided";
  const Icon = TRANSFER_ICON[kind];
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}

/** Ícone de um papel (membro/organizador). `kind` (não `role`) evita falso-positivo a11y. */
export function RoleIcon({
  kind,
  size = 14,
  className,
}: {
  kind: InviteRole;
  size?: number;
  className?: string;
}) {
  const Icon = ROLE_ICON[kind];
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}
