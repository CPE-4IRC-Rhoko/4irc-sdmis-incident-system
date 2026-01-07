package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.VehiculeSelectionResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class VehiculeSelectionRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public VehiculeSelectionRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<VehiculeSelectionResponse> findSelectedForEvent(UUID eventId) {
        return jdbcTemplate.query("""
                        SELECT * FROM get_selected_vehicles_for_event(:eventId)
                        """,
                new MapSqlParameterSource("eventId", eventId),
                new SelectionRowMapper());
    }

    private static class SelectionRowMapper implements RowMapper<VehiculeSelectionResponse> {
        @Override
        public VehiculeSelectionResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new VehiculeSelectionResponse(
                    rs.getObject("id_vehicule", UUID.class),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getObject("contenance_totale", BigDecimal.class),
                    rs.getDouble("distance_km"),
                    rs.getInt("rn"),
                    rs.getObject("sum_contenance", BigDecimal.class),
                    rs.getObject("seuil", BigDecimal.class),
                    rs.getBoolean("seuil_ok")
            );
        }
    }
}
