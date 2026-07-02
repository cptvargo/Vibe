import Foundation
import Capacitor
import UIKit

/// Native UIPanGestureRecognizer that drives the full-screen player's
/// drag-to-dismiss gesture directly from UIKit, bypassing WKWebView
/// pointer-event latency and touch-action conflicts.
///
/// JS side calls setEnabled(true) when the player opens and
/// setScrollTop(value) on scroll so Swift knows when the inner
/// overflow div is scrolled to the top (safe to start a dismiss drag).
@objc(NativeDrag)
public class NativeDrag: CAPPlugin, CAPBridgedPlugin, UIGestureRecognizerDelegate {
    public let identifier = "NativeDrag"
    public let jsName     = "NativeDrag"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setScrollTop", returnType: CAPPluginReturnPromise),
    ]

    private var pan:       UIPanGestureRecognizer?
    private var enabled:   Bool    = false
    private var scrollTop: CGFloat = 0   // latest value pushed from JS on scroll
    private var active:    Bool    = false  // this gesture instance is a confirmed drag

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

    @objc func setScrollTop(_ call: CAPPluginCall) {
        let value = CGFloat(call.getDouble("value", 0) ?? 0)
        DispatchQueue.main.async { self.scrollTop = value }
        call.resolve()
    }

    // MARK: – Gesture handler

    @objc private func handlePan(_ gr: UIPanGestureRecognizer) {
        guard enabled else { return }
        let t = gr.translation(in: gr.view)
        let v = gr.velocity(in: gr.view)

        switch gr.state {
        case .began:
            // Only activate when swiping down and the inner scroll is at the top
            if t.y > 0 && scrollTop < 2 {
                active = true
                // Reset translation so deltaY starts from 0 regardless of
                // how far the recognizer traveled before .began fired
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
