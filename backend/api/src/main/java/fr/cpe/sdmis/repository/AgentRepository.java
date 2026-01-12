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
}
