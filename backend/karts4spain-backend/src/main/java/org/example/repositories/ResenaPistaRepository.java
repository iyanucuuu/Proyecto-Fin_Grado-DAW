package org.example.repositories;

import org.example.entities.ResenaPista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResenaPistaRepository extends JpaRepository<ResenaPista, Integer> {

    @Query("SELECT r FROM ResenaPista r WHERE r.pista.idPista = :idPista ORDER BY r.fechaCreacion DESC")
    List<ResenaPista> findByPistaIdPistaOrderByFechaCreacionDesc(@Param("idPista") Integer idPista);

    @Query("SELECT r FROM ResenaPista r WHERE r.usuario.id_usuario = :idUsuario AND r.pista.idPista = :idPista")
    Optional<ResenaPista> findByUsuarioIdUsuarioAndPistaIdPista(@Param("idUsuario") Long idUsuario, @Param("idPista") Integer idPista);

    @Modifying
    @Transactional
    @Query("DELETE FROM ResenaPista r WHERE r.usuario.id_usuario = :idUsuario AND r.pista.idPista = :idPista")
    void deleteByUsuarioIdUsuarioAndPistaIdPista(@Param("idUsuario") Long idUsuario, @Param("idPista") Integer idPista);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM ResenaPista r WHERE r.usuario.id_usuario = :idUsuario AND r.pista.idPista = :idPista")
    boolean existsByUsuarioIdUsuarioAndPistaIdPista(@Param("idUsuario") Long idUsuario, @Param("idPista") Integer idPista);
}
