export type StatutIncident = 'NOUVEAU' | 'EN_COURS' | 'CLOTURE'
export type GraviteIncident = 'FAIBLE' | 'MOYENNE' | 'CRITIQUE'

export interface Incident {
  id: string
  titre: string
  description?: string
  statut: StatutIncident
  gravite: GraviteIncident
  latitude: number
  longitude: number
  derniereMiseAJour: string
}

export const LIBELLES_STATUT_INCIDENT: Record<StatutIncident, string> = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  CLOTURE: 'Clôturé',
}

export const LIBELLES_GRAVITE_INCIDENT: Record<GraviteIncident, string> = {
  FAIBLE: 'Faible',
  MOYENNE: 'Modérée',
  CRITIQUE: 'Critique',
}
