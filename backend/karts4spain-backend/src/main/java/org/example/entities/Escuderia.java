package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "escuderias")
@Getter
@Setter
public class Escuderia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idEscuderia;

    private String nombre;
    private String descripcion;
    private String logo_url;

    @Column(name = "max_miembros")
    private Integer maxMiembros = 15;

    @Column(name = "comunidad_autonoma")
    private String comunidadAutonoma;

    @Column(name = "fecha_creacion")
    private LocalDate fechaCreacion;

    @ManyToOne
    @JoinColumn(name = "id_lider")
    private Usuario lider;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDate.now();
    }
}