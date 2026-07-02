import Foundation
import Capacitor
import UIKit

/// Native UIPanGestureRecognizer that drives the full-screen player's
/// drag-to-dismiss gesture directly from UIKit, bypassing WKWebView
/// pointer-event latency and touch-action conflicts.
///
/// Restricted to the drag handle zone (safe-area top + 72pt) so queue
/// scrolling and other interactions below the handle are never intercepted.
/// JS calls setEnabled(true/false) when the player opens/closes.
@objc(NativeDrag)
public class NativeDrag: CAPPlugin, CAPBridgedPlugin, UIGestureRecognizerDelegate {
    public let identifier = "NativeDrag"
    public let jsName     = "NativeDrag"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
    ]

    private var pan:     UIPanGestureRecognizer?
    private var enabled: Bool = false
    private var active:  Bool = false  // this gesture is a confirmed drag-to-dismiss

    public override func load() {
        DispatchQueue.main.async {
            let gr = UIPanGestureRecognizer(target: self, action: #selector(self.handlePan(_:)))
            gr.delegate = self
            gr.maximumNumberOfTouches = 1
            self.webView?.addGestureRecognizer(gr)
            self.pan = gr
        }
    }

    // MARK: – Plugin methods

    @objc func setEnabled(_ call: CAPPluginCall) {
        let value = call.getBool("enabled", false) ?? false
        DispatchQueue.main.async {
            self.enabled = value
            if !value { self.active = false }
        }
        call.resolve()
    }

    // MARK: – Gesture handler

    @objc private func handlePan(_ gr: UIPanGestureRecognizer) {
        guard enabled else { return }
        let t = gr.translation(in: gr.view)
        let v = gr.velocity(in: gr.view)

        switch gr.state {
        case .began:
            // Only activate when touch starts inside the drag handle zone.
            // The handle sits just below the safe area inset (~36pt tall).
            // We use safeAreaInsets from the webView's window so the zone
            // tracks correctly on every device regardless of notch/island size.
            let safeTop  = webView?.safeAreaInsets.top ?? 0
            let location = gr.location(in: gr.view)
            let inHandleZone = location.y < (safeTop + 72)   // safe-area + handle height + buffer

            if inHandleZone && t.y > 0 {
                active = true
                // Reset translation so deltaY is relative to when .began fired
                gr.setTranslation(.zero, in: gr.view)
                notifyListeners("dragStart", data: [:])
            }

        case .changed:
            guard active else { return }
            notifyListeners("dragMove", data: ["deltaY": Double(max(0, t.y))])

        case .ended, .cancelled:
            guard active else { return }
            active = false
            notifyListeners("dragEnd", data: [
                "deltaY":    Double(max(0, t.y)),
                "velocityY": Double(v.y),   // pts/sec — JS converts to pts/ms
            ])

        default:
            break
        }
    }

    // MARK: – UIGestureRecognizerDelegate

    // Allow our recognizer to run alongside all WKWebView gestures (scroll, tap, etc.)
    public func gestureRecognizer(
        _ gr: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
    ) -> Bool { return true }
}
