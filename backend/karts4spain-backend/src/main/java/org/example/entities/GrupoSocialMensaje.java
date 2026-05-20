package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "grupos_sociales_mensajes")
@Getter @Setter
public class GrupoSocialMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_grupo")
    private Long idGrupo;

    @Column(name = "id_usuario")
    private Long idUsuario;

    private String username;
    private String mensaje;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
