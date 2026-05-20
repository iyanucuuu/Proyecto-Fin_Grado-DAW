package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "inscripciones_carrera")
@Getter @Setter
public class InscripcionCarrera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_carrera")
    private Long idCarrera;

    @Column(name = "id_usuario")
    private Long idUsuario;

    private String username;

    @Column(name = "foto_perfil")
    private String fotoPerfil;
}
