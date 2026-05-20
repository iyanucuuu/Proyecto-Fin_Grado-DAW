package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "logros_usuarios")
@Getter
@Setter
public class UsuarioLogro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_logro_usuario")
    private Integer id;

    /** ID del usuario que ha desbloqueado el logro */
    @Column(name = "id_usuario")
    private Integer idUsuario;

    /** Detalle completo del logro (join con tabla logros) */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_logro")
    private Logro logro;

    /** Fecha en que se obtuvo el logro (timestamptz en BD) */
    @Column(name = "fecha_obtencion")
    private LocalDateTime fechaObtencion;
}
