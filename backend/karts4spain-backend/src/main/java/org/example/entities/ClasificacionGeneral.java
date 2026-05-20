package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "clasificacion_general")
@Getter @Setter
public class ClasificacionGeneral {

    @Id
    @Column(name = "id_usuario")
    private Long idUsuario;

    /** Relación de solo lectura para incluir username/foto en el JSON del ranking */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario", insertable = false, updatable = false)
    private Usuario usuario;

    @Column(name = "puntos_totales")
    private Integer puntosTotales = 0;

    @Column(name = "carreras_corridas")
    private Integer carrerasCorridas = 0;

    private Integer victorias = 0;
    private Integer podios = 0;

    @Column(name = "posicion_actual")
    private Integer posicionActual = 0;
}
