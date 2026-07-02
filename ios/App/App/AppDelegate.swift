import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var silentPlayer: AVAudioPlayer?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("[Vibe] AVAudioSession setup failed: \(error)")
        }
        startSilentPlayer()
        NotificationCenter.default.addObserver(self, selector: #selector(handleInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        return true
    }

    // Plays a zero-amplitude buffer on loop — keeps AVAudioSession alive
    // so iOS doesn't kill the app when HTML5 audio is paused.
    private func startSilentPlayer() {
        let sampleRate: Double = 44100
        let frameCount: AVAudioFrameCount = 4410
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount
        if let data = buffer.floatChannelData {
            for i in 0..<Int(frameCount) { data[0][i] = 0.0 }
        }
        let tempUrl = FileManager.default.temporaryDirectory.appendingPathComponent("vibe_silence.caf")
        do {
            let file = try AVAudioFile(forWriting: tempUrl, settings: format.settings)
            try file.write(from: buffer)
            silentPlayer = try AVAudioPlayer(contentsOf: tempUrl)
            silentPlayer?.numberOfLoops = -1
            silentPlayer?.volume = 0
            silentPlayer?.prepareToPlay()
            silentPlayer?.play()
        } catch {
            print("[Vibe] Silent player failed: \(error)")
        }
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        if type == .ended {
            try? AVAudioSession.sharedInstance().setActive(true)
            silentPlayer?.play()
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
