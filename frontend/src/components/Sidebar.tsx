import type {
  Incident,
  StatutIncident,
} from '../models/incident'
import {
  LIBELLES_GRAVITE_INCIDENT,
  LIBELLES_STATUT_INCIDENT,
} from '../models/incident'
import type {
  DisponibiliteRessource,
  Ressource,
} from '../models/resource'
import { LIBELLES_DISPONIBILITE_RESSOURCE } from '../models/resource'
import './Sidebar.css'

interface Props {
  incidents: Incident[]
  ressources: Ressource[]
  filtresIncidents: Record<StatutIncident, boolean>
  filtresRessources: Record<DisponibiliteRessource, boolean>
  onToggleFiltreIncident: (statut: StatutIncident) => void
  onToggleFiltreRessource: (dispo: DisponibiliteRessource) => void
  onSelectIncident: (id: string) => void
  incidentSelectionne?: Incident
  onOuvrirFormulaire: () => void
}

function Sidebar({
  incidents,
  ressources,
  filtresIncidents,
  filtresRessources,
  onToggleFiltreIncident,
  onToggleFiltreRessource,
  onSelectIncident,
  incidentSelectionne,
  onOuvrirFormulaire,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <p className="muted">Vue QG</p>
          <h2>Incidents & ressources</h2>
        </div>
        <button className="primary" type="button" onClick={onOuvrirFormulaire}>
          Créer un incident
        </button>
      </div>

      <div className="sidebar-block">
        <h3>Filtres</h3>
        <div className="filters">
          <div>
            <p className="filter-title">Statut incident</p>
            {Object.entries(filtresIncidents).map(([statut, actif]) => (
              <label key={statut} className="checkbox">
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={() => onToggleFiltreIncident(statut as StatutIncident)}
                />
                <span>{LIBELLES_STATUT_INCIDENT[statut as StatutIncident]}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="filter-title">Disponibilité ressource</p>
            {Object.entries(filtresRessources).map(([dispo, actif]) => (
              <label key={dispo} className="checkbox">
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={() =>
                    onToggleFiltreRessource(dispo as DisponibiliteRessource)
                  }
                />
                <span>
                  {LIBELLES_DISPONIBILITE_RESSOURCE[
                    dispo as DisponibiliteRessource
                  ]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-block">
        <h3>Incidents</h3>
        <div className="list">
          {incidents.length === 0 && (
            <p className="muted">Aucun incident avec ces filtres.</p>
          )}
          {incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              className={`list-item ${
                incidentSelectionne?.id === incident.id ? 'list-item-active' : ''
              }`}
              onClick={() => onSelectIncident(incident.id)}
            >
              <div>
                <p className="muted small">{incident.id}</p>
                <p className="item-title">{incident.titre}</p>
                <p className="muted small">
                  {LIBELLES_STATUT_INCIDENT[incident.statut]} ·{' '}
                  {LIBELLES_GRAVITE_INCIDENT[incident.gravite]}
                </p>
              </div>
              <span className={`pill statut-${incident.statut.toLowerCase()}`}>
                {LIBELLES_STATUT_INCIDENT[incident.statut]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-block">
        <h3>Ressources</h3>
        <div className="list condensed">
          {ressources.length === 0 && (
            <p className="muted">Aucune ressource avec ces filtres.</p>
          )}
          {ressources.map((ressource) => (
            <div key={ressource.id} className="list-item bare">
              <div>
                <p className="item-title">{ressource.nom}</p>
                <p className="muted small">{ressource.type}</p>
              </div>
              <span
                className={`pill dispo-${ressource.disponibilite.toLowerCase()}`}
              >
                {LIBELLES_DISPONIBILITE_RESSOURCE[ressource.disponibilite]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {incidentSelectionne && (
        <div className="sidebar-block details">
          <h3>Détails incident</h3>
          <p className="item-title">{incidentSelectionne.titre}</p>
          <p className="muted">{incidentSelectionne.description}</p>
          <div className="chips">
            <span className={`pill statut-${incidentSelectionne.statut.toLowerCase()}`}>
              {LIBELLES_STATUT_INCIDENT[incidentSelectionne.statut]}
            </span>
            <span className="pill neutre">
              Gravité : {LIBELLES_GRAVITE_INCIDENT[incidentSelectionne.gravite]}
            </span>
          </div>
          <p className="muted small">
            Coords : {incidentSelectionne.latitude.toFixed(4)} /{' '}
            {incidentSelectionne.longitude.toFixed(4)}
          </p>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
