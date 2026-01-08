package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.StatutInterventionResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class StatutInterventionRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public StatutInterventionRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<StatutInterventionResponse> findAll() {
        return jdbcTemplate.query(
                "SELECT id_statut_intervention, nom FROM statut_intervention ORDER BY nom",
                new StatutInterventionRowMapper()
        );
    }

    public UUID findIdByNomOrThrow(String nom) {
        return jdbcTemplate.query("""
                        SELECT id_statut_intervention
                        FROM statut_intervention
                        WHERE lower(nom) = lower(:nom)
                        LIMIT 1
                        """,
                new MapSqlParameterSource("nom", nom),
                rs -> rs.next() ? rs.getObject(1, UUID.class)
                        : throwNotFound(nom));
    }

    private UUID throwNotFound(String nom) {
        throw new IllegalStateException("Statut d'intervention introuvable : " + nom);
    }

    private static class StatutInterventionRowMapper implements RowMapper<StatutInterventionResponse> {
        @Override
        public StatutInterventionResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new StatutInterventionResponse(
                    rs.getObject("id_statut_intervention", UUID.class),
                    rs.getString("nom")
            );
        }
    }
}
