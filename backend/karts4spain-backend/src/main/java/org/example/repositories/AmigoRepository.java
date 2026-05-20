package org.example.repositories;

import org.example.entities.Amigo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AmigoRepository extends JpaRepository<Amigo, Integer> {

    @Query("SELECT a FROM Amigo a WHERE (a.solicitante.id_usuario = :id OR a.aceptante.id_usuario = :id) AND a.estado = 'aceptado'")
    List<Amigo> findAmigosAceptados(@Param("id") Long id);

    @Query("SELECT a FROM Amigo a WHERE a.aceptante.id_usuario = :id AND a.estado = 'pendiente'")
    List<Amigo> findSolicitudesPendientes(@Param("id") Long id);

    @Query("SELECT COUNT(a) FROM Amigo a WHERE a.aceptante.id_usuario = :id AND a.estado = 'pendiente'")
    long countSolicitudesPendientes(@Param("id") Long id);

    @Query("SELECT a FROM Amigo a WHERE (a.solicitante.id_usuario = :id OR a.aceptante.id_usuario = :id)")
    List<Amigo> findTodasRelaciones(@Param("id") Long id);
}
