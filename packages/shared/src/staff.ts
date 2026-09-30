// Contrato de Equipo (HANDOFF §6.4). Lo implementa el módulo staff del backend y lo consume
// /admin/team.

export type MemberRole = 'OWNER' | 'STAFF';

/** ACTIVE = ya entró alguna vez (last_sign_in_at). */
export type StaffStatus = 'INVITED' | 'ACTIVE';

export interface StaffMemberDto {
  userId: string;
  /** null si la cuenta de auth ya no existe. */
  email: string | null;
  role: MemberRole;
  /** null para el OWNER, que no está asignado a un local. */
  locationId: string | null;
  locationName: string | null;
  status: StaffStatus;
  /** Solo se puede reenviar la invitación de un STAFF que no confirmó su correo. */
  canResendInvite: boolean;
  invitedAt: string;
  lastSignInAt: string | null;
}

export interface InviteStaffInput {
  email: string;
  locationId: string;
  /** Si se omite, Supabase envía un correo de invitación. */
  password?: string;
}

export interface ReassignStaffInput {
  locationId: string;
}

export type StaffScanType = 'STAMP_ADDED' | 'REWARD_REDEEMED';
export type StaffScanMethod = 'QR' | 'MANUAL';

export interface StaffActivityDto {
  id: string;
  type: StaffScanType;
  method: StaffScanMethod;
  createdAt: string;
  locationName: string;
  /** Enmascarado en el backend (§7.2). */
  customerPhone: string | null;
  promotionName: string | null;
}

/** Escaneos más recientes que devuelve la actividad de un miembro. */
export const STAFF_ACTIVITY_LIMIT = 50;
export const STAFF_PASSWORD_MIN = 6;
