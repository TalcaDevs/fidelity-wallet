import type {
  InviteStaffInput,
  StaffActivityDto,
  StaffMemberDto,
} from '@fidelity/shared';
import { jsonBody, requestJson } from './httpJson';

// Contrato de HANDOFF §6.4 (packages/shared/src/staff.ts).
const base = (brandId: string) => `/api/brands/${brandId}/staff`;

export function listStaff(brandId: string): Promise<StaffMemberDto[]> {
  return requestJson(base(brandId), undefined, 'No se pudo cargar tu equipo');
}

export async function inviteStaff(brandId: string, input: InviteStaffInput): Promise<void> {
  await requestJson(
    `${base(brandId)}/invite`,
    { method: 'POST', ...jsonBody(input) },
    'No se pudo invitar al usuario',
  );
}

export function resendInvite(brandId: string, userId: string): Promise<void> {
  return requestJson(
    `${base(brandId)}/${userId}/resend-invite`,
    { method: 'POST' },
    'No se pudo reenviar la invitación',
  );
}

export function reassignStaff(
  brandId: string,
  userId: string,
  locationId: string,
): Promise<StaffMemberDto> {
  return requestJson(
    `${base(brandId)}/${userId}`,
    { method: 'PATCH', ...jsonBody({ locationId }) },
    'No se pudo cambiar el local',
  );
}

export function removeStaff(brandId: string, userId: string): Promise<void> {
  return requestJson(
    `${base(brandId)}/${userId}`,
    { method: 'DELETE' },
    'No se pudo dar de baja al usuario',
  );
}

export function getStaffActivity(brandId: string, userId: string): Promise<StaffActivityDto[]> {
  return requestJson(
    `${base(brandId)}/${userId}/scans`,
    undefined,
    'No se pudo cargar la actividad',
  );
}
