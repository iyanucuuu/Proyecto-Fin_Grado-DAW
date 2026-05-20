package org.example.repositories;

import org.example.entities.InscripcionCarreraPista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InscripcionCarreraPistaRepository extends JpaRepository<InscripcionCarreraPista, Long> {
    List<InscripcionCarreraPista> findByIdCarrera(Long idCarrera);
    List<InscripcionCarreraPista> findByIdCarreraIn(List<Long> ids);
    Optional<InscripcionCarreraPista> findByIdCarreraAndIdUsuario(Long idCarrera, Long idUsuario);
    void deleteByIdCarreraAndIdUsuario(Long idCarrera, Long idUsuario);
    void deleteByIdCarrera(Long idCarrera);
    boolean existsByIdCarreraAndIdUsuario(Long idCarrera, Long idUsuario);
}
