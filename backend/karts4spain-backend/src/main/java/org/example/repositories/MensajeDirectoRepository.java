package org.example.repositories;

import org.example.entities.MensajeDirecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MensajeDirectoRepository extends JpaRepository<MensajeDirecto, Long> {

    /** Todos los mensajes entre dos usuarios (en cualquier dirección), recientes primero */
    @Query("""
        SELECT m FROM MensajeDirecto m
        WHERE (m.idRemitente = :a AND m.idDestinatario = :b)
           OR (m.idRemitente = :b AND m.idDestinatario = :a)
        ORDER BY m.createdAt ASC
    """)
    List<MensajeDirecto> findConversacion(@Param("a") Long a, @Param("b") Long b);

    /** Todos los mensajes en los que participa el usuario (para listar conversaciones) */
    @Query("""
        SELECT m FROM MensajeDirecto m
        WHERE m.idRemitente = :id OR m.idDestinatario = :id
        ORDER BY m.createdAt DESC
    """)
    List<MensajeDirecto> findTodosDelUsuario(@Param("id") Long id);

    /** Marcar como leídos los mensajes no leídos que llegan al destinatario desde un remitente */
    @Modifying
    @Query("""
        UPDATE MensajeDirecto m SET m.leido = true
        WHERE m.idRemitente = :remitente AND m.idDestinatario = :destinatario AND m.leido = false
    """)
    void marcarLeidos(@Param("remitente") Long remitente, @Param("destinatario") Long destinatario);
}
