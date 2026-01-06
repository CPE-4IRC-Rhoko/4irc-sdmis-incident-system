import { useEffect, useState } from 'react'
import Modal from './Modal'
import type { FormEvent } from 'react'
import type { GraviteIncident, StatutIncident } from '../models/incident'
import './IncidentForm.css'

export interface IncidentFormData {
  titre: string
  gravite: GraviteIncident
  statut: StatutIncident
  latitude: number
  longitude: number
  description?: string
}

interface Props {
  ouvert: boolean
  onClose: () => void
  onSubmit: (data: IncidentFormData) => void
  latitudeRef?: number
  longitudeRef?: number
}

const valeurParDefaut = (
  latitudeRef?: number,
  longitudeRef?: number,
): IncidentFormData => ({
  titre: '',
  gravite: 'MOYENNE',
  statut: 'NOUVEAU',
  latitude: latitudeRef ?? 45.75,
  longitude: longitudeRef ?? 4.85,
  description: '',
})

function IncidentForm({
  ouvert,
  onClose,
  onSubmit,
  latitudeRef,
  longitudeRef,
}: Props) {
  const [donnees, setDonnees] = useState<IncidentFormData>(
    valeurParDefaut(latitudeRef, longitudeRef),
  )

  useEffect(() => {
    if (ouvert) {
      setDonnees(valeurParDefaut(latitudeRef, longitudeRef))
    }
  }, [ouvert, latitudeRef, longitudeRef])

  const mettreAJour = (champ: keyof IncidentFormData, valeur: string | number) =>
    setDonnees((prev) => ({ ...prev, [champ]: valeur }))

  const soumettre = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      ...donnees,
      latitude: Number(donnees.latitude),
      longitude: Number(donnees.longitude),
    })
    setDonnees(valeurParDefaut(latitudeRef, longitudeRef))
  }

  if (!ouvert) return null

  return (
    <Modal titre="Nouvel incident" onClose={onClose}>
      <form className="incident-form" onSubmit={soumettre}>
        <label>
          Titre
          <input
            type="text"
            value={donnees.titre}
            onChange={(e) => mettreAJour('titre', e.target.value)}
            required
            placeholder="Ex : Fuite de gaz"
          />
        </label>

        <label>
          Description (optionnel)
          <textarea
            value={donnees.description}
            onChange={(e) => mettreAJour('description', e.target.value)}
            rows={3}
            placeholder="Quelques détails rapides"
          />
        </label>

        <div className="form-grid">
          <label>
            Gravité
            <select
              value={donnees.gravite}
              onChange={(e) => mettreAJour('gravite', e.target.value)}
            >
              <option value="FAIBLE">Faible</option>
              <option value="MOYENNE">Modérée</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </label>

          <label>
            Statut
            <select
              value={donnees.statut}
              onChange={(e) => mettreAJour('statut', e.target.value)}
            >
              <option value="NOUVEAU">Nouveau</option>
              <option value="EN_COURS">En cours</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            Latitude
            <input
              type="number"
              step="0.0001"
              value={donnees.latitude}
              onChange={(e) => mettreAJour('latitude', e.target.value)}
              required
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="0.0001"
              value={donnees.longitude}
              onChange={(e) => mettreAJour('longitude', e.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="primary">
            Ajouter
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default IncidentForm
