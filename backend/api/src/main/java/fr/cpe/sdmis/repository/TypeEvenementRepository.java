package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.dto.TypeEvenementResponse;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
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

    public Optional<UUID> findIdByNom(String nomTypeEvenement) {
        return jdbcTemplate.query("""
                        SELECT id_type_evenement FROM type_evenement
                        WHERE lower(nom) = lower(:nom)
                        LIMIT 1
                        """,
                new MapSqlParameterSource("nom", nomTypeEvenement),
                rs -> rs.next() ? Optional.of(rs.getObject(1, UUID.class)) : Optional.empty());
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
