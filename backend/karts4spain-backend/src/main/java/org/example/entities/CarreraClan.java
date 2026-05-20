package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "carreras_clan")
@Getter @Setter
public class CarreraClan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_escuderia")
    private Long idEscuderia;

    private String titulo;
    private String descripcion;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    private String pista;

    @Column(name = "id_creador")
    private Long idCreador;

    @Column(name = "username_creador")
    private String usernameCreador;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
