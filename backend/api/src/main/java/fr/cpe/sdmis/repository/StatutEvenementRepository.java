package fr.cpe.sdmis.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class StatutEvenementRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public StatutEvenementRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UUID> findIdByNom(String nomStatut) {
        return jdbcTemplate.query("""
                        SELECT id_statut
                        FROM statut_evenement
                        WHERE lower(nom_statut) = lower(:nom)
                        LIMIT 1
                        """,
                new MapSqlParameterSource("nom", nomStatut),
                (rs) -> rs.next() ? Optional.of(rs.getObject(1, UUID.class)) : Optional.empty());
    }
}
