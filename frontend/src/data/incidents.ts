import type { Incident } from '../models/incident'

export const evenementsInitial: Incident[] = [
  {
    id: 'INC-001',
    titre: 'Incendie entrepôt - Gerland',
    description: 'Fumée épaisse signalée, risque propagation.',
    statut: 'EN_COURS',
    gravite: 'CRITIQUE',
    latitude: 45.7296,
    longitude: 4.8273,
    derniereMiseAJour: '2024-11-01T09:30:00Z',
  },
  {
    id: 'INC-002',
    titre: 'Inondation voirie - Confluence',
    description: 'Chaussée impraticable, circulation coupée.',
    statut: 'NOUVEAU',
    gravite: 'MOYENNE',
    latitude: 45.7411,
    longitude: 4.8157,
    derniereMiseAJour: '2024-11-02T07:15:00Z',
  },
  {
    id: 'INC-003',
    titre: 'Accident routier - Périphérique',
    description: 'Deux véhicules impliqués, blessures légères.',
    statut: 'EN_COURS',
    gravite: 'MOYENNE',
    latitude: 45.7597,
    longitude: 4.8723,
    derniereMiseAJour: '2024-11-03T08:05:00Z',
  },
  {
    id: 'INC-004',
    titre: 'Défaillance électrique - Vieux Lyon',
    description: 'Panne locale, pas de victime.',
    statut: 'CLOTURE',
    gravite: 'FAIBLE',
    latitude: 45.7629,
    longitude: 4.8276,
    derniereMiseAJour: '2024-10-28T18:45:00Z',
  },
]
