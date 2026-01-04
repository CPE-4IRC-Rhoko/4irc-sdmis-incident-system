package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.InterventionResponse;
import fr.cpe.sdmis.messaging.InterventionMessage;
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
    private static final String STATUT_EN_ATTENTE = "En attente";

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

        jdbcTemplate.update("""
                INSERT INTO intervention (id_evenement, date_debut, date_fin, id_vehicule, id_statut_intervention)
                VALUES (:id_evenement, :date_debut, :date_fin, :id_vehicule, :id_statut_intervention)
                ON CONFLICT (id_evenement) DO NOTHING
                ON CONFLICT ON CONSTRAINT intervention_id_vehicule_key DO NOTHING
                """, params);
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

    private Instant defaultDateDebut(Instant fromMessage) {
        return fromMessage != null ? fromMessage : Instant.now();
    }
}
