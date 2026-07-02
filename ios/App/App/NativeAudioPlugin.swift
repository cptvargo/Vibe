import Foundation
import Capacitor
import AVFoundation
import MediaPlayer

@objc(NativeAudio)
public class NativeAudio: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAudio"
    public let jsName = "NativeAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preload",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDuration",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setNowPlaying", returnType: CAPPluginReturnPromise),
    ]

    private var playerA: AVPlayer?
    private var playerB: AVPlayer?
    private var activeSlot: String = "A"
    private var timeObserverA: Any?
    private var timeObserverB: Any?
    private var kvoA: NSKeyValueObservation?
    private var kvoB: NSKeyValueObservation?
    private var artworkCache: [String: MPMediaItemArtwork] = [:]

    private var activePlayer: AVPlayer? {
        activeSlot == "A" ? playerA : playerB
    }
    private var inactivePlayer: AVPlayer? {
        activeSlot == "A" ? playerB : playerA
    }

    // MARK: - Plugin Methods

    @objc func play(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Invalid URL"); return
        }
        let slot = call.getString("slot") ?? "A"

        DispatchQueue.main.async {
            self.setupPlayer(slot: slot, url: url)
            self.activeSlot = slot

            let player = slot == "A" ? self.playerA : self.playerB
            player?.play()

            self.startTimeObserver(slot: slot)
            self.observeEnd(slot: slot)
            call.resolve()
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.activePlayer?.pause()
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.activePlayer?.play()
            call.resolve()
        }
    }

    @objc func seek(_ call: CAPPluginCall) {
        guard let seconds = call.getDouble("seconds") else { call.reject("Missing seconds"); return }
        DispatchQueue.main.async {
            let time = CMTime(seconds: seconds, preferredTimescale: 1000)
            self.activePlayer?.seek(to: time)
            call.resolve()
        }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let volume = call.getFloat("volume") else { call.reject("Missing volume"); return }
        let slot = call.getString("slot") ?? activeSlot
        DispatchQueue.main.async {
            let player = slot == "A" ? self.playerA : self.playerB
            player?.volume = volume
            call.resolve()
        }
    }

    @objc func preload(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Invalid URL"); return
        }
        let slot = call.getString("slot") ?? "B"
        DispatchQueue.main.async {
            self.setupPlayer(slot: slot, url: url)
            // Set volume to 0 so preloaded track is silent until activated
            let player = slot == "A" ? self.playerA : self.playerB
            player?.volume = 0
            call.resolve()
        }
    }

    @objc func getDuration(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let duration = self.activePlayer?.currentItem?.duration
            let seconds = duration.map { CMTimeGetSeconds($0) } ?? 0
            call.resolve(["duration": seconds.isNaN || seconds.isInfinite ? 0 : seconds])
        }
    }

    @objc func setNowPlaying(_ call: CAPPluginCall) {
        var info: [String: Any] = [:]
        if let title       = call.getString("title")       { info[MPMediaItemPropertyTitle]              = title }
        if let artist      = call.getString("artist")      { info[MPMediaItemPropertyArtist]             = artist }
        if let album       = call.getString("album")       { info[MPMediaItemPropertyAlbumTitle]         = album }
        if let duration    = call.getDouble("duration")    { info[MPMediaItemPropertyPlaybackDuration]   = duration }
        if let currentTime = call.getDouble("currentTime") { info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime }
        info[MPNowPlayingInfoPropertyPlaybackRate] = call.getBool("isPlaying", false) ? 1.0 : 0.0

        // Tell iOS the definitive playback state so the lock screen shows the right button
        if #available(iOS 13.0, *) {
            MPNowPlayingInfoCenter.default().playbackState =
                (call.getBool("isPlaying", false) ?? false) ? .playing : .paused
        }

        if let artworkUrl = call.getString("artworkUrl") {
            if let cached = artworkCache[artworkUrl] {
                info[MPMediaItemPropertyArtwork] = cached
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
            } else if let url = URL(string: artworkUrl) {
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
                URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
                    DispatchQueue.main.async {
                        if let data = data, let image = UIImage(data: data) {
                            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                            self?.artworkCache[artworkUrl] = artwork
                            var updated = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? info
                            updated[MPMediaItemPropertyArtwork] = artwork
                            MPNowPlayingInfoCenter.default().nowPlayingInfo = updated
                        }
                    }
                }.resume()
            }
        } else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
        call.resolve()
    }

    // MARK: - Helpers

    private func setupPlayer(slot: String, url: URL) {
        let item = AVPlayerItem(url: url)
        if slot == "A" {
            removeTimeObserver(slot: "A")
            kvoA?.invalidate()
            playerA = AVPlayer(playerItem: item)
            playerA?.volume = 1
            kvoA = playerA?.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
                self?.handlePlayerStateChange(slot: "A", player: player)
            }
        } else {
            removeTimeObserver(slot: "B")
            kvoB?.invalidate()
            playerB = AVPlayer(playerItem: item)
            playerB?.volume = 1
            kvoB = playerB?.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
                self?.handlePlayerStateChange(slot: "B", player: player)
            }
        }
    }

    private func handlePlayerStateChange(slot: String, player: AVPlayer) {
        guard slot == activeSlot else { return }
        let isPlaying   = player.timeControlStatus == .playing
        let isBuffering = player.timeControlStatus == .waitingToPlayAtSpecifiedRate
        DispatchQueue.main.async {
            self.notifyListeners("statechange", data: [
                "isPlaying":   isPlaying,
                "isBuffering": isBuffering
            ])
        }
    }

    private func startTimeObserver(slot: String) {
        removeTimeObserver(slot: slot)
        let player = slot == "A" ? playerA : playerB
        let observer = player?.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.5, preferredTimescale: 600),
            queue: .main
        ) { [weak self] time in
            let seconds = CMTimeGetSeconds(time)
            if !seconds.isNaN && !seconds.isInfinite {
                self?.notifyListeners("timeupdate", data: ["currentTime": seconds, "slot": slot])
            }
        }
        if slot == "A" { timeObserverA = observer } else { timeObserverB = observer }
    }

    private func removeTimeObserver(slot: String) {
        if slot == "A", let obs = timeObserverA { playerA?.removeTimeObserver(obs); timeObserverA = nil }
        if slot == "B", let obs = timeObserverB { playerB?.removeTimeObserver(obs); timeObserverB = nil }
    }

    private func observeEnd(slot: String) {
        let player = slot == "A" ? playerA : playerB
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player?.currentItem,
            queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("ended", data: ["slot": slot])
        }
    }
}
