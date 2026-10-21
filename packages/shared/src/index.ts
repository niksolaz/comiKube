import { z } from 'zod'

/**
 * Ruoli/competenze del creatore. Nel modello "User unico" sono tag: un utente
 * può essere sceneggiatore, disegnatore o entrambi (modalità single-player).
 */
export const ROLES = ['writer', 'illustrator'] as const
export type Role = (typeof ROLES)[number]

/**
 * Limite giornaliero gratuito di generazioni AI.
 * Valore provvisorio: da validare con l'unit economics (Fase 0) prima di fissare la soglia.
 */
export const DEFAULT_FREE_DAILY_CREDITS = 15

export const PROJECT_STATUSES = ['idea', 'draft', 'in_progress', 'completed', 'published'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  displayName: z.string().min(1).max(80),
  roles: z.array(z.enum(ROLES)).min(1).max(2),
  createdAt: z.string(), // ISO-8601; da stringere in z.iso.datetime() nella fase dati
})

export const projectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  status: z.enum(PROJECT_STATUSES),
  writerId: z.string(),
  illustratorId: z.string(),
  createdAt: z.string(),
})

export type User = z.infer<typeof userSchema>
export type Project = z.infer<typeof projectSchema>