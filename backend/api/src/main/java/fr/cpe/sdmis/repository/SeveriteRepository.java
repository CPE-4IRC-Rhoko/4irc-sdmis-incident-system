package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.SeveriteResponse;
import fr.cpe.sdmis.dto.SeveriteEchelleResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class SeveriteRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public SeveriteRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<SeveriteResponse> findAll() {
        return jdbcTemplate.query(
                "SELECT id_severite, nom_severite, valeur_échelle AS valeur_echelle, nb_vehicules_necessaire FROM severite ORDER BY id_severite",
                new SeveriteRowMapper()
        );
    }

    public List<SeveriteEchelleResponse> findEchelles() {
        return jdbcTemplate.query(
                "SELECT id_severite, valeur_échelle AS valeur_echelle FROM severite ORDER BY id_severite",
                new SeveriteEchelleRowMapper()
        );
    }

    private static class SeveriteRowMapper implements RowMapper<SeveriteResponse> {
        @Override
        public SeveriteResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new SeveriteResponse(
                    rs.getObject("id_severite", UUID.class),
                    rs.getString("nom_severite"),
                    rs.getString("valeur_echelle"),
                    rs.getInt("nb_vehicules_necessaire")
            );
        }
    }

    private static class SeveriteEchelleRowMapper implements RowMapper<SeveriteEchelleResponse> {
        @Override
        public SeveriteEchelleResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new SeveriteEchelleResponse(
                    rs.getObject("id_severite", UUID.class),
                    rs.getString("valeur_echelle")
            );
        }
    }
}
