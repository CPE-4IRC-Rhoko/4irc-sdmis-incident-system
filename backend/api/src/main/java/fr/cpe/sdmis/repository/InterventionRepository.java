package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.InterventionResponse;
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

@Repository
public class InterventionRepository {
    private static final Logger LOGGER = LoggerFactory.getLogger(InterventionRepository.class);
    private static final String STATUT_EN_ATTENTE = "En attente";
    private static final String STATUT_VEHICULE_PROPOSITION = "En proposition";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public InterventionRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void saveFromMessage(InterventionMessage message) {
        UUID statutInterventionId = resolveStatutIntervention();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id_evenement", message.getIdEvenement())
                .addValue("date_debut", Timestamp.from(defaultDateDebut(message.getDateCreation())))
                .addValue("date_fin", null)
                .addValue("id_vehicule", message.getVehiculeId())
                .addValue("id_statut_intervention", statutInterventionId);

        try {
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

    private Instant defaultDateDebut(Instant fromMessage) {
        return fromMessage != null ? fromMessage : Instant.now();
    }
}
