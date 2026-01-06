export type DisponibiliteRessource = 'DISPONIBLE' | 'OCCUPE' | 'HORS_LIGNE'

export type CategorieRessource = 'POLICE' | 'POMPIERS' | 'SAMU' | 'TECHNIQUE'

export interface Ressource {
  id: string
  nom: string
  type: string
  categorie: CategorieRessource
  disponibilite: DisponibiliteRessource
  latitude: number
  longitude: number
}

export const LIBELLES_DISPONIBILITE_RESSOURCE: Record<
  DisponibiliteRessource,
  string
> = {
  DISPONIBLE: 'Disponible',
  OCCUPE: 'Occupé',
  HORS_LIGNE: 'Hors ligne',
}
