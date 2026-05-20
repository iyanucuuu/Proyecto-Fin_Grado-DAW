package org.example.repositories;

import org.example.entities.ResultadoCarrera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ResultadoCarreraRepository extends JpaRepository<ResultadoCarrera, Long> {
    /** Historial de carreras de un piloto por su username, ordenado del más reciente al más antiguo */
    List<ResultadoCarrera> findByUsernameIgnoreCaseOrderByCreatedAtDesc(String username);
}
