package org.example.repositories;

import org.example.entities.InscripcionCarrera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InscripcionCarreraRepository extends JpaRepository<InscripcionCarrera, Long> {
    List<InscripcionCarrera> findByIdCarrera(Long idCarrera);
    Optional<InscripcionCarrera> findByIdCarreraAndIdUsuario(Long idCarrera, Long idUsuario);
    void deleteByIdCarreraAndIdUsuario(Long idCarrera, Long idUsuario);
    void deleteByIdCarrera(Long idCarrera);
}
