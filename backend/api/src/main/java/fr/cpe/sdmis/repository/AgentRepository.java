package fr.cpe.sdmis.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class AgentRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AgentRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insertAgent(UUID idUtilisateur,
                            UUID idVehicule,
                            UUID idCaserne,
                            UUID idRole,
                            UUID idStatut,
                            String nom,
                            String prenom) {
        jdbcTemplate.update("""
                INSERT INTO agent (id_agent, nom, prenom, id_vehicule, id_caserne, id_role, id_statut)
                VALUES (:user, :nom, :prenom, :vehicule, :caserne, :role, :statut)
                """, new MapSqlParameterSource()
                .addValue("user", idUtilisateur.toString())
                .addValue("nom", nom)
                .addValue("prenom", prenom)
                .addValue("vehicule", idVehicule)
                .addValue("caserne", idCaserne)
                .addValue("role", idRole)
                .addValue("statut", idStatut));
    }

    public java.util.Optional<fr.cpe.sdmis.dto.AgentVehiculeResponse> findVehiculeByAgentId(UUID agentId) {
        return jdbcTemplate.query("""
                        SELECT v.id_vehicule,
                               v.plaque_immat,
                               v.latitude,
                               v.longitude,
                               v.derniere_position_connue,
                               v.id_caserne,
                               v.id_statut
                        FROM agent a
                        LEFT JOIN vehicule v ON v.id_vehicule = a.id_vehicule
                        WHERE a.id_agent = :agent
                        LIMIT 1
                        """,
                new MapSqlParameterSource("agent", agentId.toString()),
                rs -> {
                    if (rs.next() && rs.getObject("id_vehicule") != null) {
                        java.time.OffsetDateTime ts = null;
                        java.sql.Timestamp t = rs.getTimestamp("derniere_position_connue");
                        if (t != null) {
                            ts = t.toInstant().atOffset(java.time.ZoneOffset.UTC);
                        }
                        return java.util.Optional.of(new fr.cpe.sdmis.dto.AgentVehiculeResponse(
                                rs.getObject("id_vehicule", java.util.UUID.class),
                                rs.getString("plaque_immat"),
                                rs.getObject("latitude") != null ? rs.getDouble("latitude") : null,
                                rs.getObject("longitude") != null ? rs.getDouble("longitude") : null,
                                ts,
                                rs.getObject("id_caserne", java.util.UUID.class),
                                rs.getObject("id_statut", java.util.UUID.class)
                        ));
                    }
                    return java.util.Optional.empty();
                });
    }
}
