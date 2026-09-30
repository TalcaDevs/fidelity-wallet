import { createContext, useContext } from 'react';
import type { PlatformRole } from '@fidelity/shared';

export interface InternalUser {
  userId: string;
  role: PlatformRole;
}

export const InternalRoleContext = createContext<InternalUser>({ userId: '', role: 'SUPPORT' });

export function useInternalUser(): InternalUser {
  return useContext(InternalRoleContext);
}

/** Solo decide qué se muestra: el backend vuelve a validar el rol en cada endpoint. */
export function useIsSuperadmin(): boolean {
  return useInternalUser().role === 'SUPERADMIN';
}
