package org.example.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id_usuario;

    private String username;
    private String email;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "comunidad_autonoma")
    private String comunidadAutonoma;

    @Column(name = "foto_perfil")
    private String fotoPerfil;

    @Column(name = "id_escuderia")
    private Long id_escuderia;

    @Column(name = "dia_creacion")
    private LocalDate diaCreacion;
}
