package org.example.repositories;

import org.example.entities.UsuarioLogro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsuarioLogroRepository extends JpaRepository<UsuarioLogro, Integer> {

    /** Devuelve todos los logros desbloqueados por un usuario dado su ID */
    List<UsuarioLogro> findByIdUsuario(Integer idUsuario);

    /** Comprueba si un usuario ya tiene un logro concreto */
    boolean existsByIdUsuarioAndLogroIdLogro(Integer idUsuario, Integer idLogro);
}
