package org.example.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "carreras_pista")
@Getter @Setter
public class CarreraPista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_pista")
    private Integer idPista;

    @Column(name = "id_usuario_creador")
    private Long idUsuarioCreador;

    @Column(name = "username_creador")
    private String usernameCreador;

    private String titulo;
    private String descripcion;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** FK de solo lectura hacia pistas — excluida de JSON para evitar problemas de serialización */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pista", referencedColumnName = "id_pista", insertable = false, updatable = false)
    private Pista pista;
}
