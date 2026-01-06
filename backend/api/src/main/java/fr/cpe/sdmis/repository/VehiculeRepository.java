package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class VehiculeRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public VehiculeRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<VehiculeOperationnelResponse> findOperationnels() {
        return jdbcTemplate.query("""
                SELECT v.id_vehicule,
                       v.latitude,
                       v.longitude,
                       sv.id_statut,
                       sv.nom_statut,
                       sv.operationnel
                FROM vehicule v
                JOIN statut_vehicule sv ON sv.id_statut = v.id_statut
                WHERE sv.operationnel
                  AND NOT EXISTS (
                      SELECT 1 FROM intervention i WHERE i.id_vehicule = v.id_vehicule
                  )
                ORDER BY v.id_vehicule
                """,
                new VehiculeOperationnelRowMapper());
    }

    private static class VehiculeOperationnelRowMapper implements RowMapper<VehiculeOperationnelResponse> {
        @Override
        public VehiculeOperationnelResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new VehiculeOperationnelResponse(
                    rs.getObject("id_vehicule", UUID.class),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getObject("id_statut", UUID.class),
                    rs.getString("nom_statut"),
                    rs.getBoolean("operationnel")
            );
        }
    }
}
