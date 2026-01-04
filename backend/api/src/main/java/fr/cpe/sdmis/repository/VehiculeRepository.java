package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.VehiculeDisponibleResponse;
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

    private static final String STATUT_DISPONIBLE = "Disponible";
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public VehiculeRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<VehiculeDisponibleResponse> findDisponibles() {
        return jdbcTemplate.query("""
                SELECT v.id_vehicule,
                       v.latitude,
                       v.longitude,
                       sv.id_statut,
                       sv.nom_statut,
                       sv.operationnel
                FROM vehicule v
                JOIN statut_vehicule sv ON sv.id_statut = v.id_statut
                WHERE lower(sv.nom_statut) = lower(:nom_statut)
                ORDER BY v.id_vehicule
                """,
                new MapSqlParameterSource("nom_statut", STATUT_DISPONIBLE),
                new VehiculeDisponibleRowMapper());
    }

    private static class VehiculeDisponibleRowMapper implements RowMapper<VehiculeDisponibleResponse> {
        @Override
        public VehiculeDisponibleResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new VehiculeDisponibleResponse(
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
