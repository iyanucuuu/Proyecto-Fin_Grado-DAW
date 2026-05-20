package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "resultados_carreras")
@Getter @Setter
public class ResultadoCarrera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_carrera")
    private Long idCarrera;

    private String username;
    private Integer posicion;
    private Integer puntos;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** FK de solo lectura hacia carreras_pista para obtener título y pista */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_carrera", insertable = false, updatable = false)
    private CarreraPista carreraPista;
}
