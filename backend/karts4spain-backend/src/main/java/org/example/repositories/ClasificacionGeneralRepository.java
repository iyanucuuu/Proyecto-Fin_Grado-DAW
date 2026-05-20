package org.example.repositories;

import org.example.entities.ClasificacionGeneral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ClasificacionGeneralRepository extends JpaRepository<ClasificacionGeneral, Long> {
    Optional<ClasificacionGeneral> findByIdUsuario(Long idUsuario);
}
