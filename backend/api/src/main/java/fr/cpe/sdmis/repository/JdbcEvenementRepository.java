package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.domain.model.Evenement;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcEvenementRepository implements EvenementRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcEvenementRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Evenement save(Evenement evenement) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", evenement.id())
                .addValue("description", evenement.description())
                .addValue("latitude", evenement.latitude())
                .addValue("longitude", evenement.longitude())
                .addValue("date_evenement", evenement.dateEvenement())
                .addValue("id_type_evenement", evenement.idTypeEvenement())
                .addValue("id_statut", evenement.idStatut())
                .addValue("id_severite", evenement.idSeverite());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update("""
                INSERT INTO evenement (description, latitude, longitude, date_evenement, id_type_evenement, id_statut, id_severite)
                VALUES (:description, :latitude, :longitude, :date_evenement, :id_type_evenement, :id_statut, :id_severite)
                """, params, keyHolder, new String[]{"id_evenement"});

        Number generatedId = keyHolder.getKey();
        return new Evenement(
                generatedId != null ? generatedId.intValue() : evenement.id(),
                evenement.description(),
                evenement.latitude(),
                evenement.longitude(),
                evenement.dateEvenement(),
                evenement.idTypeEvenement(),
                evenement.idStatut(),
                evenement.idSeverite(),
                evenement.nomTypeEvenement(),
                evenement.nomStatut(),
                evenement.nomSeverite(),
                evenement.valeurEchelle(),
                evenement.nbVehiculesNecessaire()
        );
    }

    @Override
    public Optional<Evenement> findById(Integer id) {
        List<Evenement> results = jdbcTemplate.query(
                """
                SELECT e.id_evenement, e.description, e.latitude, e.longitude, e.date_evenement,
                       e.id_type_evenement, e.id_statut, e.id_severite,
                       te.nom AS nom_type_evenement,
                       se.nom_statut,
                       sv.nom_severite, sv.valeur_echelle, sv.nb_vehicules_necessaire
                FROM evenement e
                JOIN type_evenement te ON te.id_type_evenement = e.id_type_evenement
                JOIN statut_evenement se ON se.id_statut = e.id_statut
                JOIN severite sv ON sv.id_severite = e.id_severite
                WHERE e.id_evenement = :id
                """,
                new MapSqlParameterSource("id", id),
                new EvenementRowMapper()
        );
        return results.stream().findFirst();
    }

    @Override
    public List<Evenement> findAll() {
        return jdbcTemplate.query(
                """
                SELECT e.id_evenement, e.description, e.latitude, e.longitude, e.date_evenement,
                       e.id_type_evenement, e.id_statut, e.id_severite,
                       te.nom AS nom_type_evenement,
                       se.nom_statut,
                       sv.nom_severite, sv.valeur_echelle, sv.nb_vehicules_necessaire
                FROM evenement e
                JOIN type_evenement te ON te.id_type_evenement = e.id_type_evenement
                JOIN statut_evenement se ON se.id_statut = e.id_statut
                JOIN severite sv ON sv.id_severite = e.id_severite
                ORDER BY e.date_evenement DESC
                """,
                new EvenementRowMapper()
        );
    }

    private static class EvenementRowMapper implements RowMapper<Evenement> {
        @Override
        public Evenement mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Evenement(
                    rs.getInt("id_evenement"),
                    rs.getString("description"),
                    rs.getDouble("latitude"),
                    rs.getDouble("longitude"),
                    rs.getTimestamp("date_evenement").toInstant(),
                    rs.getInt("id_type_evenement"),
                    rs.getInt("id_statut"),
                    rs.getInt("id_severite"),
                    rs.getString("nom_type_evenement"),
                    rs.getString("nom_statut"),
                    rs.getString("nom_severite"),
                    rs.getInt("valeur_echelle"),
                    rs.getInt("nb_vehicules_necessaire")
            );
        }
    }
}
