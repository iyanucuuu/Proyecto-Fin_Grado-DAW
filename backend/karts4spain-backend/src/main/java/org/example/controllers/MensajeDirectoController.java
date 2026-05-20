package org.example.controllers;

import org.example.entities.MensajeDirecto;
import org.example.repositories.MensajeDirectoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mensajes-directos")
@CrossOrigin(origins = "http://localhost:4200")
public class MensajeDirectoController {

    @Autowired private MensajeDirectoRepository repo;

    /** GET /api/mensajes-directos/usuario/{id} — todos los mensajes del usuario */
    @GetMapping("/usuario/{id}")
    public List<MensajeDirecto> getTodosDelUsuario(@PathVariable Long id) {
        return repo.findTodosDelUsuario(id);
    }

    /** GET /api/mensajes-directos/conversacion?a=X&b=Y — historial entre dos usuarios */
    @GetMapping("/conversacion")
    public List<MensajeDirecto> getConversacion(
            @RequestParam Long a,
            @RequestParam Long b) {
        List<MensajeDirecto> todos = repo.findConversacion(a, b);
        int inicio = Math.max(0, todos.size() - 200);
        return todos.subList(inicio, todos.size());
    }

    /** POST /api/mensajes-directos — enviar mensaje */
    @PostMapping
    public ResponseEntity<MensajeDirecto> enviar(@RequestBody MensajeDirecto mensaje) {
        if (mensaje.getCreatedAt() == null) mensaje.setCreatedAt(LocalDateTime.now());
        if (mensaje.getLeido() == null) mensaje.setLeido(false);
        return ResponseEntity.ok(repo.save(mensaje));
    }

    /** PUT /api/mensajes-directos/leer?remitente=X&destinatario=Y — marcar leídos */
    @Transactional
    @PutMapping("/leer")
    public ResponseEntity<Map<String, String>> marcarLeidos(
            @RequestParam Long remitente,
            @RequestParam Long destinatario) {
        repo.marcarLeidos(remitente, destinatario);
        return ResponseEntity.ok(Map.of("message", "Mensajes marcados como leídos"));
    }

    /** PUT /api/mensajes-directos/{id}/leer — marcar un mensaje individual como leído */
    @Transactional
    @PutMapping("/{id}/leer")
    public ResponseEntity<Map<String, String>> marcarUnoLeido(@PathVariable Long id) {
        repo.findById(id).ifPresent(m -> { m.setLeido(true); repo.save(m); });
        return ResponseEntity.ok(Map.of("message", "Leído"));
    }
}
