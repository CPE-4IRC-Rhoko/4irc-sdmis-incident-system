package fr.cpe.sdmis.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CaserneRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public CaserneRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findAll() {
        return jdbcTemplate.queryForList("SELECT * FROM caserne", Map.of());
    }

    public Optional<Map<String, Object>> findByVehiculeId(UUID vehiculeId) {
        List<Map<String, Object>> res = jdbcTemplate.queryForList("""
                SELECT c.*
                FROM caserne c
                JOIN vehicule v ON v.id_caserne = c.id_caserne
                WHERE v.id_vehicule = :vehicule
                LIMIT 1
                """, Map.of("vehicule", vehiculeId));
        if (res.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(res.get(0));
    }
}
