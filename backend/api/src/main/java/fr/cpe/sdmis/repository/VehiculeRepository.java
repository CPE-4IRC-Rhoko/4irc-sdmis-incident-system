package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.dto.EquipementContenanceResponse;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSetMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
                """,
                new VehiculeOperationnelRowMapper());
    }

    public List<VehiculeSnapshotResponse> findSnapshots() {
        return jdbcTemplate.query(baseSnapshotQuery(""), new MapSqlParameterSource(), new SnapshotRowMapper());
    }

    public Optional<VehiculeSnapshotResponse> findSnapshotById(UUID vehiculeId) {
        List<VehiculeSnapshotResponse> res = jdbcTemplate.query(
                baseSnapshotQuery("WHERE v.id_vehicule = :id"),
                new MapSqlParameterSource("id", vehiculeId),
                new SnapshotRowMapper()
        );
        return res.stream().findFirst();
    }

    public Optional<VehiculeSnapshotResponse> findSnapshotByPlaque(String plaqueImmat) {
        List<VehiculeSnapshotResponse> res = jdbcTemplate.query(
                baseSnapshotQuery("WHERE v.plaque_immat = :plaque"),
                new MapSqlParameterSource("plaque", plaqueImmat),
                new SnapshotRowMapper()
        );
        return res.stream().findFirst();
    }

    public List<VehiculeIdentResponse> findCleIdent() {
        return jdbcTemplate.query("""
                SELECT id_vehicule, plaque_immat, cle_ident
                FROM vehicule
                ORDER BY plaque_immat
                """, new IdentRowMapper());
    }

    public List<VehiculeEnRouteResponse> findVehiculesEnRoute() {
        return jdbcTemplate.query("""
                SELECT v.id_vehicule,
                       v.latitude AS v_lat,
                       v.longitude AS v_lon,
                       i.id_evenement,
                       e.latitude AS e_lat,
                       e.longitude AS e_lon
                FROM vehicule v
                JOIN statut_vehicule sv ON sv.id_statut = v.id_statut
                JOIN intervention i ON i.id_vehicule = v.id_vehicule
                JOIN evenement e ON e.id_evenement = i.id_evenement
                WHERE sv.nom_statut = 'En route'
                """, new VehiculeEnRouteRowMapper());
    }

    public void updateVehicule(VehiculeUpdateRequest request) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("plaque", request.plaqueImmat())
                .addValue("lat", request.lat())
                .addValue("lon", request.lon())
                .addValue("ts", request.timestamp() != null ? java.sql.Timestamp.from(request.timestamp().toInstant()) : null);

        jdbcTemplate.update("""
                UPDATE vehicule
                SET latitude = :lat,
                    longitude = :lon,
                    derniere_position_connue = COALESCE(:ts, derniere_position_connue)
                WHERE plaque_immat = :plaque
                """, params);

        if (request.ressources() != null) {
            request.ressources().forEach((nom, contenance) -> {
                MapSqlParameterSource resParams = new MapSqlParameterSource()
                        .addValue("plaque", request.plaqueImmat())
                        .addValue("nom", nom)
                        .addValue("contenance", contenance);
                try {
                    int updated = jdbcTemplate.update("""
                            UPDATE est_equipe_de eed
                            SET contenance_courante_ = :contenance
                            FROM vehicule v
                            JOIN equipement eq ON lower(eq.nom_equipement) = lower(:nom)
                            WHERE v.plaque_immat = :plaque
                              AND eed.id_vehicule = v.id_vehicule
                              AND eed.id_equipement = eq.id_equipement
                            """, resParams);
                    if (updated == 0) {
                        LOGGER.warn("Aucune ressource mise à jour pour véhicule {} et équipement '{}'", request.plaqueImmat(), nom);
                    }
                } catch (DataAccessException ex) {
                    LOGGER.error("Echec mise à jour ressource '{}' pour véhicule {} : {}", nom, request.plaqueImmat(), ex.getMessage());
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

    private static class SnapshotRowMapper implements RowMapper<VehiculeSnapshotResponse> {
        @Override
        public VehiculeSnapshotResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            UUID id = rs.getObject("id_vehicule", UUID.class);
            double lat = rs.getDouble("latitude");
            double lon = rs.getDouble("longitude");
            OffsetDateTime derniere = rs.getTimestamp("derniere_position_connue")
                    .toInstant()
                    .atOffset(ZoneOffset.UTC);
            String statut = rs.getString("nom_statut");
            String caserne = rs.getString("nom_de_la_caserne");

            Object rawEquipements = rs.getObject("equipements");
            List<EquipementContenanceResponse> equipements = new ArrayList<>();
            if (rawEquipements != null) {
                // rawEquipements is a PGobject/JSON string; parse manually
                try {
                    String json = rawEquipements.toString();
                    com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                    List<Map<String, Object>> list = om.readValue(json, om.getTypeFactory().constructCollectionType(List.class, Map.class));
                    for (Map<String, Object> map : list) {
                        String nom = (String) map.get("nom_equipement");
                        Integer contenance = map.get("contenance_courante") != null
                                ? ((Number) map.get("contenance_courante")).intValue()
                                : null;
                        equipements.add(new EquipementContenanceResponse(nom, contenance));
                    }
                } catch (Exception ignored) {
                }
            }

            return new VehiculeSnapshotResponse(id, lat, lon, derniere, statut, caserne, equipements);
        }
    }

    private static class IdentRowMapper implements RowMapper<VehiculeIdentResponse> {
        @Override
        public VehiculeIdentResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new VehiculeIdentResponse(
                    rs.getObject("id_vehicule", UUID.class),
                    rs.getString("plaque_immat"),
                    rs.getString("cle_ident")
            );
        }
    }

    private static class VehiculeEnRouteRowMapper implements RowMapper<VehiculeEnRouteResponse> {
        @Override
        public VehiculeEnRouteResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new VehiculeEnRouteResponse(
                    rs.getObject("id_vehicule", UUID.class),
                    rs.getDouble("v_lat"),
                    rs.getDouble("v_lon"),
                    rs.getObject("id_evenement", UUID.class),
                    rs.getDouble("e_lat"),
                    rs.getDouble("e_lon")
            );
        }
    }

    private String baseSnapshotQuery(String whereClause) {
        String where = (whereClause == null || whereClause.isBlank()) ? "" : " " + whereClause + " ";
        return """
                SELECT
                  v.id_vehicule,
                  v.latitude,
                  v.longitude,
                  v.derniere_position_connue,
                  sv.nom_statut,
                  c.nom_de_la_caserne,
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'nom_equipement', e.nom_equipement,
                      'contenance_courante', eed.contenance_courante_
                    )
                    ORDER BY e.nom_equipement
                  ) AS equipements
                FROM vehicule v
                JOIN est_equipe_de eed ON eed.id_vehicule = v.id_vehicule
                JOIN equipement e ON e.id_equipement = eed.id_equipement
                JOIN statut_vehicule sv ON sv.id_statut = v.id_statut
                JOIN caserne c ON c.id_caserne = v.id_caserne
                """ + where + """
                GROUP BY v.id_vehicule, v.latitude, v.longitude, v.derniere_position_connue, sv.nom_statut, c.nom_de_la_caserne
                ORDER BY v.id_vehicule
                """;
    }
}
