package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class VehiculeSseService {
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(List<VehiculeSnapshotResponse> initialSnapshots) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event()
                    .name("vehicules")
                    .data(initialSnapshots));
        } catch (IOException e) {
            emitters.remove(emitter);
            emitter.complete();
        }
        return emitter;
    }

    public void broadcastSnapshot(VehiculeSnapshotResponse snapshot) {
        broadcast(List.of(snapshot));
    }

    public void broadcastSnapshots(List<VehiculeSnapshotResponse> snapshots) {
        broadcast(snapshots);
    }

    private void broadcast(List<VehiculeSnapshotResponse> snapshots) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("vehicules")
                        .data(snapshots));
            } catch (IOException e) {
                emitters.remove(emitter);
                emitter.complete();
            }
        }
    }
}
