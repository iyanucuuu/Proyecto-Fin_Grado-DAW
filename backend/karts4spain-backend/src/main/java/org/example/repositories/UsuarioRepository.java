package org.example.repositories;

import org.example.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByUsernameIgnoreCase(String username);
    Optional<Usuario> findByEmail(String email);

    @Query("SELECT u FROM Usuario u WHERE u.id_escuderia = :idEscuderia")
    List<Usuario> findByIdEscuderia(@Param("idEscuderia") Long idEscuderia);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.id_escuderia = :idEscuderia")
    long countByIdEscuderia(@Param("idEscuderia") Long idEscuderia);
}
