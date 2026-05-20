package org.example.repositories;

import org.example.entities.ValoracionPista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface ValoracionPistaRepository extends JpaRepository<ValoracionPista, Long> {

    @Query(value = "SELECT * FROM valoraciones_pista WHERE id_pista = :idPista", nativeQuery = true)
    List<ValoracionPista> findByIdPista(@Param("idPista") Integer idPista);

    @Query(value = "SELECT * FROM valoraciones_pista WHERE id_pista = :idPista AND id_usuario = :idUsuario LIMIT 1", nativeQuery = true)
    Optional<ValoracionPista> findByIdPistaAndIdUsuario(@Param("idPista") Integer idPista, @Param("idUsuario") Long idUsuario);

    @Query(value = "SELECT * FROM valoraciones_pista", nativeQuery = true)
    List<ValoracionPista> findAll();

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM valoraciones_pista WHERE id_pista = :idPista AND id_usuario = :idUsuario", nativeQuery = true)
    void deleteByIdPistaAndIdUsuario(@Param("idPista") Integer idPista, @Param("idUsuario") Long idUsuario);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO valoraciones_pista (id_pista, id_usuario, nota) VALUES (:idPista, :idUsuario, :nota) ON CONFLICT (id_pista, id_usuario) DO UPDATE SET nota = :nota", nativeQuery = true)
    void upsertValoracion(@Param("idPista") Integer idPista, @Param("idUsuario") Long idUsuario, @Param("nota") Integer nota);
}
