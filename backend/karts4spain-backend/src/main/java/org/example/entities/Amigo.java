package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "amigos")
@Getter
@Setter
public class Amigo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idRelacion;

    @ManyToOne
    @JoinColumn(name = "id_usuario_solicita")
    private Usuario solicitante;

    @ManyToOne
    @JoinColumn(name = "id_usuario_acepta")
    private Usuario aceptante;

    private String estado;
}