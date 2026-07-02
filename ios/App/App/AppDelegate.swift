import UIKit
import Capacitor
import AVFoundation
import MediaPlayer

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var silenceEngine: AVAudioEngine?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        setupAudioSession()
        startSilenceEngine()
        setupRemoteCommandCenter()
        NotificationCenter.default.addObserver(self, selector: #selector(handleInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        return true
    }

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("[Vibe] AVAudioSession setup failed: \(error)")
        }
    }

    // AVAudioEngine playing zero-amplitude silence — no file I/O needed.
    // Keeps AVAudioSession alive even when HTML5 audio is paused,
    // preventing iOS from killing the background process.
    private func startSilenceEngine() {
        let engine = AVAudioEngine()
        let mainMixer = engine.mainMixerNode
        let outputNode = engine.outputNode
        let outputFormat = outputNode.inputFormat(forBus: 0)

        let silenceNode = AVAudioSourceNode(format: outputFormat) { _, _, frameCount, audioBufferList -> OSStatus in
            let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
            for buffer in ablPointer {
                if let data = buffer.mData {
                    memset(data, 0, Int(buffer.mDataByteSize))
                }
            }
            return noErr
        }

        engine.attach(silenceNode)
        engine.connect(silenceNode, to: mainMixer, format: outputFormat)
        engine.connect(mainMixer, to: outputNode, format: outputFormat)
        mainMixer.outputVolume = 0

        do {
            try engine.start()
            silenceEngine = engine
        } catch {
            print("[Vibe] Silence engine failed: \(error)")
        }
    }

    // Register native lock screen controls so iOS treats Vibe as a real music app.
    // Commands forward to JavaScript via mediaSession which VibePlayer already handles.
    private func setupRemoteCommandCenter() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.isEnabled = true
        center.pauseCommand.isEnabled = true
        center.nextTrackCommand.isEnabled = true
        center.previousTrackCommand.isEnabled = true

        center.playCommand.addTarget { [weak self] _ in
            self?.sendToJS("vibePlay")
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.sendToJS("vibePause")
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.sendToJS("vibeNext")
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.sendToJS("vibePrev")
            return .success
        }
    }

    private func sendToJS(_ event: String) {
        DispatchQueue.main.async {
            guard let bridge = (self.window?.rootViewController as? CAPBridgeViewController)?.bridge else { return }
            bridge.triggerWindowJSEvent(eventName: event)
        }
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        switch type {
        case .began:
            // Notify JS so it can remember whether we were playing
            sendToJS("vibeInterruptionBegan")
        case .ended:
            try? AVAudioSession.sharedInstance().setActive(true)
            try? silenceEngine?.start()
            // Only auto-resume if iOS signals we should (e.g. phone call finished, not Siri)
            let opts = (info[AVAudioSessionInterruptionOptionKey] as? UInt)
                .map { AVAudioSession.InterruptionOptions(rawValue: $0) } ?? []
            if opts.contains(.shouldResume) {
                sendToJS("vibeAutoResume")
            }
        @unknown default:
            break
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
