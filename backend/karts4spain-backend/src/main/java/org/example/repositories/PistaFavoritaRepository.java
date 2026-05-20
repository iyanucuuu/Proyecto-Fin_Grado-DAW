package org.example.repositories;

import org.example.entities.PistaFavorita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PistaFavoritaRepository extends JpaRepository<PistaFavorita, Long> {
    List<PistaFavorita> findByIdUsuario(Long idUsuario);
    Optional<PistaFavorita> findByIdUsuarioAndIdPista(Long idUsuario, Integer idPista);
    void deleteByIdUsuarioAndIdPista(Long idUsuario, Integer idPista);
    boolean existsByIdUsuarioAndIdPista(Long idUsuario, Integer idPista);
}
