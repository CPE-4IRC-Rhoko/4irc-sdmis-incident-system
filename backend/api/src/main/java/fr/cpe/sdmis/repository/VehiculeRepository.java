package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
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

    private static final Logger LOGGER = LoggerFactory.getLogger(VehiculeRepository.class);
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

    public void updateVehicule(VehiculeUpdateRequest request) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", request.id())
                .addValue("lat", request.lat())
                .addValue("lon", request.lon())
                .addValue("ts", request.timestamp() != null ? java.sql.Timestamp.from(request.timestamp().toInstant()) : null);

        jdbcTemplate.update("""
                UPDATE vehicule
                SET latitude = :lat,
                    longitude = :lon,
                    derniere_position_connue = COALESCE(:ts, derniere_position_connue)
                WHERE id_vehicule = :id
                """, params);

        if (request.ressources() != null) {
            request.ressources().forEach((nom, contenance) -> {
                MapSqlParameterSource resParams = new MapSqlParameterSource()
                        .addValue("id", request.id())
                        .addValue("nom", nom)
                        .addValue("contenance", contenance);
                try {
                    int updated = jdbcTemplate.update("""
                            UPDATE est_equipe_de eed
                            SET contenance_courante = :contenance
                            FROM equipement eq
                            WHERE eed.id_equipement = eq.id_equipement
                              AND lower(eq."nom_équipement") = lower(:nom)
                              AND eed.id_vehicule = :id
                            """, resParams);
                    if (updated == 0) {
                        LOGGER.warn("Aucune ressource mise à jour pour véhicule {} et équipement '{}'", request.id(), nom);
                    }
                } catch (DataAccessException ex) {
                    LOGGER.error("Echec mise à jour ressource '{}' pour véhicule {} : {}", nom, request.id(), ex.getMessage());
                }
            });
        }
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
