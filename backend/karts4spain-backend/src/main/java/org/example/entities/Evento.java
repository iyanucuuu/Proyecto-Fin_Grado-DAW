package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "eventos")
@Getter
@Setter
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idEvento;

    @ManyToOne
    @JoinColumn(name = "id_pista")
    private Pista pista;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario; // creador del evento

    private String nombreEvento;
    private LocalDateTime fechaEvento;
    private String descripcion;
    private Integer maxParticipantes;

    @Column(columnDefinition = "VARCHAR DEFAULT 'abierto'")
    private String estado = "abierto"; // abierto/cerrado/cancelado

    private String tipoEvento; // carrera, quedada, entrenamiento...
}