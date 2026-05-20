package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_clan")
@Getter @Setter
public class MensajeChatClan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_escuderia")
    private Long idEscuderia;

    @Column(name = "id_usuario")
    private Long idUsuario;

    private String username;

    @Column(name = "foto_perfil")
    private String fotoPerfil;

    private String mensaje;

    private String tipo = "mensaje";   // "mensaje" | "carrera"

    @Column(name = "id_carrera")
    private Long idCarrera;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
