package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.InterventionResponse;
import fr.cpe.sdmis.dto.InterventionSnapshotResponse;
import fr.cpe.sdmis.messaging.InterventionMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Repository
public class InterventionRepository {
    private static final Logger LOGGER = LoggerFactory.getLogger(InterventionRepository.class);
    private static final String STATUT_EN_ATTENTE = "En attente";
    private static final String STATUT_VEHICULE_PROPOSITION = "En proposition";
    private static final String STATUT_INTERVENTION_EN_COURS = "En cours";
    private static final String STATUT_INTERVENTION_ANNULEE = "Annulée";
    private static final String STATUT_VEHICULE_EN_ROUTE = "En route";
    private static final String STATUT_INTERVENTION_TERMINEE = "Terminée";
    private static final String STATUT_VEHICULE_DISPONIBLE = "Disponible";
    private static final String STATUT_INTERVENTION_PROPOSITION = "En proposition";
    private static final String SNAPSHOT_QUERY = """
            SELECT i.id_evenement,
                   i.date_debut as date_debut_intervention,
                   i.date_fin as date_fin_intervention,
                   si.nom as status_intervention,
                   v.id_vehicule,
                   v.plaque_immat
            FROM intervention i
            JOIN vehicule v ON v.id_vehicule = i.id_vehicule
            JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public InterventionRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void saveFromMessage(InterventionMessage message) {
        UUID statutInterventionAttente = resolveStatutIntervention();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id_evenement", message.getIdEvenement())
                .addValue("date_debut", null)
                .addValue("date_fin", null)
                .addValue("id_vehicule", message.getVehiculeId())
                .addValue("id_statut_intervention", statutInterventionAttente);

        try {
            int updated = jdbcTemplate.update("""
                    UPDATE intervention
                    SET id_statut_intervention = :statut_attente
                    WHERE id_evenement = :id_evenement
                      AND id_vehicule = :id_vehicule
                    """, new MapSqlParameterSource()
                    .addValue("statut_attente", statutInterventionAttente)
                    .addValue("id_evenement", message.getIdEvenement())
                    .addValue("id_vehicule", message.getVehiculeId()));
            if (updated > 0) {
                LOGGER.info("Intervention existante mise en 'En attente' pour évènement {} avec véhicule {}", message.getIdEvenement(), message.getVehiculeId());
                updateVehiculeStatutProposition(message.getVehiculeId());
                return;
            }

            int rows = jdbcTemplate.update("""
                    INSERT INTO intervention (id_evenement, date_debut, date_fin, id_vehicule, id_statut_intervention)
                    VALUES (:id_evenement, :date_debut, :date_fin, :id_vehicule, :id_statut_intervention)
                    ON CONFLICT DO NOTHING
                    """, params);
            if (rows > 0) {
                LOGGER.info("Intervention insérée pour évènement {} avec véhicule {}", message.getIdEvenement(), message.getVehiculeId());
                updateVehiculeStatutProposition(message.getVehiculeId());
            } else {
                LOGGER.warn("Intervention non insérée (conflit probablement dû à un doublon) pour évènement {} et véhicule {}", message.getIdEvenement(), message.getVehiculeId());
            }
        } catch (DataAccessException e) {
            LOGGER.error("Echec d'insertion intervention pour évènement {} et véhicule {} : {}", message.getIdEvenement(), message.getVehiculeId(), e.getMessage());
            throw e;
        }
    }

    public List<InterventionResponse> findAll() {
        return jdbcTemplate.query("""
                SELECT i.id_evenement,
                       i.id_vehicule,
                       i.id_statut_intervention,
                       si.nom AS nom_statut_intervention,
                       i.date_debut,
                       i.date_fin
                FROM intervention i
                JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
                ORDER BY i.date_debut DESC NULLS LAST
                """, new InterventionRowMapper());
    }

    public List<InterventionResponse> findTerminees() {
        return jdbcTemplate.query("""
                SELECT i.id_evenement,
                       i.id_vehicule,
                       i.id_statut_intervention,
                       si.nom AS nom_statut_intervention,
                       i.date_debut,
                       i.date_fin
                FROM intervention i
                JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
                WHERE lower(si.nom) = lower(:statut)
                ORDER BY i.date_fin DESC NULLS LAST, i.date_debut DESC NULLS LAST
                """, new MapSqlParameterSource("statut", STATUT_INTERVENTION_TERMINEE), new InterventionRowMapper());
    }

    public List<UUID> findVehiculesByInterventionStatut(UUID idEvenement, String statutNom) {
        return jdbcTemplate.query("""
                SELECT i.id_vehicule
                FROM intervention i
                JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
                WHERE i.id_evenement = :event
                  AND lower(si.nom) = lower(:statut)
                """, new MapSqlParameterSource()
                .addValue("event", idEvenement)
                .addValue("statut", statutNom), (rs, rowNum) -> rs.getObject("id_vehicule", UUID.class));
    }

    public boolean vehiculeHasInterventionWithStatut(UUID vehiculeId, String statutNom) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM intervention i
                JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
                WHERE i.id_vehicule = :vehicule AND lower(si.nom) = lower(:statut)
                """, new MapSqlParameterSource()
                .addValue("vehicule", vehiculeId)
                .addValue("statut", statutNom),
                Integer.class);
        return count != null && count > 0;
    }

    private static class InterventionRowMapper implements RowMapper<InterventionResponse> {
        @Override
        public InterventionResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new InterventionResponse(
                    rs.getObject("id_evenement", UUID.class),
                    rs.getObject("id_vehicule", UUID.class),
                    rs.getObject("id_statut_intervention", UUID.class),
                    rs.getString("nom_statut_intervention"),
                    rs.getTimestamp("date_debut") != null ? rs.getTimestamp("date_debut").toInstant() : null,
                    rs.getTimestamp("date_fin") != null ? rs.getTimestamp("date_fin").toInstant() : null
            );
        }
    }

    private UUID resolveStatutIntervention() {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT id_statut_intervention
                    FROM statut_intervention
                    WHERE lower(nom) = lower(:nom)
                    """, new MapSqlParameterSource("nom", STATUT_EN_ATTENTE), UUID.class);
        } catch (EmptyResultDataAccessException e) {
            throw new IllegalStateException("Statut d'intervention introuvable en base : " + STATUT_EN_ATTENTE);
        }
    }

    private void updateVehiculeStatutProposition(UUID vehiculeId) {
        if (vehiculeId == null) {
            return;
        }
        try {
            UUID statutVehiculeId = jdbcTemplate.queryForObject("""
                    SELECT id_statut
                    FROM statut_vehicule
                    WHERE lower(nom_statut) = lower(:nom)
                    """, new MapSqlParameterSource("nom", STATUT_VEHICULE_PROPOSITION), UUID.class);
            int rows = jdbcTemplate.update("""
                    UPDATE vehicule
                    SET id_statut = :statut
                    WHERE id_vehicule = :vehicule
                    """, new MapSqlParameterSource()
                    .addValue("statut", statutVehiculeId)
                    .addValue("vehicule", vehiculeId));
            if (rows == 0) {
                LOGGER.warn("Statut véhicule non mis à jour (id={})", vehiculeId);
            }
        } catch (EmptyResultDataAccessException e) {
            LOGGER.error("Statut véhicule 'En proposition' introuvable, mise à jour ignorée");
        } catch (DataAccessException e) {
            LOGGER.error("Echec mise à jour statut 'En proposition' pour véhicule {} : {}", vehiculeId, e.getMessage());
        }
    }

    public void updateVehiculeStatutEnRoute(UUID vehiculeId) {
        if (vehiculeId == null) {
            return;
        }
        try {
            UUID statutVehiculeId = jdbcTemplate.queryForObject("""
                    SELECT id_statut
                    FROM statut_vehicule
                    WHERE lower(nom_statut) = lower(:nom)
                    """, new MapSqlParameterSource("nom", STATUT_VEHICULE_EN_ROUTE), UUID.class);
            jdbcTemplate.update("""
                    UPDATE vehicule
                    SET id_statut = :statut
                    WHERE id_vehicule = :vehicule
                    """, new MapSqlParameterSource()
                    .addValue("statut", statutVehiculeId)
                    .addValue("vehicule", vehiculeId));
        } catch (EmptyResultDataAccessException e) {
            LOGGER.error("Statut véhicule 'En route' introuvable, mise à jour ignorée");
        } catch (DataAccessException e) {
            LOGGER.error("Echec mise à jour statut 'En route' pour véhicule {} : {}", vehiculeId, e.getMessage());
        }
    }

    public UUID resolveStatutInterventionByNom(String nom) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT id_statut_intervention
                    FROM statut_intervention
                    WHERE lower(nom) = lower(:nom)
                    """, new MapSqlParameterSource("nom", nom), UUID.class);
        } catch (EmptyResultDataAccessException e) {
            throw new IllegalStateException("Statut d'intervention introuvable : " + nom);
        }
    }

    public void updateInterventionStatutEnCours(UUID idEvenement, UUID idVehicule, UUID idStatut, Instant dateDebut) {
        jdbcTemplate.update("""
                UPDATE intervention
                SET id_statut_intervention = :statut,
                    date_debut = COALESCE(date_debut, :debut)
                WHERE id_evenement = :event AND id_vehicule = :vehicule
                """, new MapSqlParameterSource()
                .addValue("statut", idStatut)
                .addValue("debut", Timestamp.from(dateDebut))
                .addValue("event", idEvenement)
                .addValue("vehicule", idVehicule));
    }

    public int annulerInterventionsEnAttente(UUID idEvenement, UUID statutEnAttente, UUID statutAnnule) {
        return jdbcTemplate.update("""
                UPDATE intervention
                SET id_statut_intervention = :statutAnnule
                WHERE id_evenement = :event
                  AND id_statut_intervention = :statutAttente
                """, new MapSqlParameterSource()
                .addValue("event", idEvenement)
                .addValue("statutAnnule", statutAnnule)
                .addValue("statutAttente", statutEnAttente));
    }

    public void insertInterventionEnCours(UUID idEvenement, UUID idVehicule, Instant dateDebut, UUID statutEnCours) {
        jdbcTemplate.update("""
                INSERT INTO intervention (id_evenement, date_debut, date_fin, id_vehicule, id_statut_intervention)
                VALUES (:event, :debut, NULL, :vehicule, :statut)
                ON CONFLICT DO NOTHING
                """, new MapSqlParameterSource()
                .addValue("event", idEvenement)
                .addValue("debut", Timestamp.from(dateDebut))
                .addValue("vehicule", idVehicule)
                .addValue("statut", statutEnCours));
    }

    public List<InterventionSnapshotResponse> findSnapshots() {
        return jdbcTemplate.query(SNAPSHOT_QUERY, this::mapSnapshot);
    }

    public List<InterventionSnapshotResponse> findSnapshotsByEvenement(UUID idEvenement) {
        return jdbcTemplate.query(
                SNAPSHOT_QUERY + " WHERE i.id_evenement = :event",
                new MapSqlParameterSource("event", idEvenement),
                this::mapSnapshot
        );
    }

    public Optional<InterventionSnapshotResponse> findSnapshotByIds(UUID idEvenement, UUID idVehicule) {
        List<InterventionSnapshotResponse> res = jdbcTemplate.query(
                SNAPSHOT_QUERY + " WHERE i.id_evenement = :event AND i.id_vehicule = :vehicule",
                new MapSqlParameterSource()
                        .addValue("event", idEvenement)
                        .addValue("vehicule", idVehicule),
                this::mapSnapshot
        );
        return res.stream().findFirst();
    }

    private InterventionSnapshotResponse mapSnapshot(ResultSet rs, int rowNum) throws SQLException {
        return new fr.cpe.sdmis.dto.InterventionSnapshotResponse(
                rs.getObject("id_evenement", UUID.class),
                rs.getTimestamp("date_debut_intervention") != null ? rs.getTimestamp("date_debut_intervention").toInstant() : null,
                rs.getTimestamp("date_fin_intervention") != null ? rs.getTimestamp("date_fin_intervention").toInstant() : null,
                rs.getString("status_intervention"),
                rs.getObject("id_vehicule", UUID.class),
                rs.getString("plaque_immat")
        );
    }

    public void cloturerIntervention(UUID idEvenement, UUID idVehicule) {
        UUID statutTerminee = resolveStatutInterventionByNom(STATUT_INTERVENTION_TERMINEE);
        jdbcTemplate.update("""
                UPDATE intervention
                SET id_statut_intervention = :statut,
                    date_fin = COALESCE(date_fin, :fin)
                WHERE id_evenement = :event AND id_vehicule = :vehicule
                """, new MapSqlParameterSource()
                .addValue("statut", statutTerminee)
                .addValue("fin", Timestamp.from(Instant.now()))
                .addValue("event", idEvenement)
                .addValue("vehicule", idVehicule));
    }

    public void updateVehiculeStatutDisponible(UUID vehiculeId) {
        if (vehiculeId == null) {
            return;
        }
        try {
            UUID statutVehiculeId = jdbcTemplate.queryForObject("""
                    SELECT id_statut
                    FROM statut_vehicule
                    WHERE lower(nom_statut) = lower(:nom)
                    """, new MapSqlParameterSource("nom", STATUT_VEHICULE_DISPONIBLE), UUID.class);
            jdbcTemplate.update("""
                    UPDATE vehicule
                    SET id_statut = :statut
                    WHERE id_vehicule = :vehicule
                    """, new MapSqlParameterSource()
                    .addValue("statut", statutVehiculeId)
                    .addValue("vehicule", vehiculeId));
        } catch (EmptyResultDataAccessException e) {
            LOGGER.error("Statut véhicule 'Disponible' introuvable, mise à jour ignorée");
        } catch (DataAccessException e) {
            LOGGER.error("Echec mise à jour statut 'Disponible' pour véhicule {} : {}", vehiculeId, e.getMessage());
        }
    }

    public boolean hasInterventionEnCours(UUID idEvenement) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM intervention i
                JOIN statut_intervention si ON si.id_statut_intervention = i.id_statut_intervention
                WHERE i.id_evenement = :event AND lower(si.nom) = lower(:nom)
                """, new MapSqlParameterSource()
                .addValue("event", idEvenement)
                .addValue("nom", STATUT_INTERVENTION_EN_COURS),
                Integer.class);
        return count != null && count > 0;
    }
}
