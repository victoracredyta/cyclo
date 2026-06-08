/**
 * Centralized permission checks. Every gate in the UI / API should go through
 * one of these functions so we keep the rules consistent.
 *
 * Hierarchy (most → least privileged):
 *   Admin > Gestor > Vendedor > Colaborador > Visualizador
 */

export type Permission = 'Admin' | 'Gestor' | 'Vendedor' | 'Colaborador' | 'Visualizador'

const LEVEL: Record<Permission, number> = {
  Admin: 5,
  Gestor: 4,
  Vendedor: 3,
  Colaborador: 2,
  Visualizador: 1,
}

const norm = (p: string | null | undefined): Permission =>
  (p && (p as Permission) in LEVEL) ? (p as Permission) : 'Visualizador'

/** True if the user's permission is at least the given level. */
export function hasAtLeast(perm: string | null | undefined, min: Permission): boolean {
  return LEVEL[norm(perm)] >= LEVEL[min]
}

// ── Specific gates used across the UI ─────────────────────────────

export const canManageTeam        = (p?: string | null) => hasAtLeast(p, 'Gestor')
export const canEditOrgSettings   = (p?: string | null) => hasAtLeast(p, 'Admin')      // white label, SMTP, AI keys, billing
export const canInviteAdmins      = (p?: string | null) => hasAtLeast(p, 'Admin')      // only Admins can promote new Admins
export const canDeleteRecords     = (p?: string | null) => hasAtLeast(p, 'Vendedor')
export const canCreateRecords     = (p?: string | null) => hasAtLeast(p, 'Colaborador')
export const canEditRecords       = (p?: string | null) => hasAtLeast(p, 'Colaborador')
export const canViewFinancial     = (p?: string | null) => hasAtLeast(p, 'Gestor')
export const canViewReports       = (p?: string | null) => hasAtLeast(p, 'Vendedor')
export const canManageFunnels     = (p?: string | null) => hasAtLeast(p, 'Gestor')
export const canDistributeLeads   = (p?: string | null) => hasAtLeast(p, 'Gestor')
export const canManageAutomations = (p?: string | null) => hasAtLeast(p, 'Gestor')

/** Reverse: blocks any write action. Use to disable edit UI. */
export const isReadOnly = (p?: string | null) => norm(p) === 'Visualizador'
