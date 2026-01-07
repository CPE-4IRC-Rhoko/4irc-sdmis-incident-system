export interface EvenementApi {
  id: string
  description: string
  latitude: number
  longitude: number
  idTypeEvenement: string
  idStatut: string
  idSeverite: string
  nomTypeEvenement: string
  nomStatut: string
  nomSeverite: string
  valeurEchelle: string
  nbVehiculesNecessaire: number | null
}

export interface EvenementCreatePayload {
  description: string
  latitude: number
  longitude: number
  idTypeEvenement: string
  idStatut: string
  idSeverite: string
}

export interface SeveriteReference {
  id: string
  nomSeverite: string
  valeurEchelle: string
  nbVehiculesNecessaire: number | null
}

export interface TypeEvenementReference {
  id: string
  nomTypeEvenement: string
}
