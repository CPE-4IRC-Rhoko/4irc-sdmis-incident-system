package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.TypeEvenementResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class TypeEvenementRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public TypeEvenementRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<TypeEvenementResponse> findAll() {
        return jdbcTemplate.query(
                "SELECT id_type_evenement, nom FROM type_evenement ORDER BY id_type_evenement",
                new TypeRowMapper()
        );
    }

    private static class TypeRowMapper implements RowMapper<TypeEvenementResponse> {
        @Override
        public TypeEvenementResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new TypeEvenementResponse(
                    rs.getObject("id_type_evenement", UUID.class),
                    rs.getString("nom")
            );
        }
    }
}
