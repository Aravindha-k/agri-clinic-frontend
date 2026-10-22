import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Copy, Check, Clock3, CheckCircle2, RefreshCw } from "lucide-react";
import { copyTextToClipboard } from "../../utils/clipboard";
import { pairingSecondsLeft, formatPairingCountdown } from "../../utils/attendance";

/**
 * One-time 6-digit pairing code wizard result. The code is returned by the
 * backend ONLY at generation time. The device token is issued later, directly
 * to the kiosk at redemption — it never passes through this panel.
 *
 * `pairing` = { code, expiresAt, deviceUid, shopCode, shopName }
 * `paired`  = true once the device has redeemed the code (detected by polling).
 */
export default function PairingCodeModal({ pairing, paired, onRegenerate, onClose }) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const expiresAt = pairing?.expiresAt;

  useEffect(() => {
    setCopied(false);
    setSecondsLeft(null);
  }, [pairing?.code, expiresAt]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () => setSecondsLeft(pairingSecondsLeft(expiresAt));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (!pairing) return null;

  const expired = secondsLeft === 0;
  const copy = async () => {
    const ok = await copyTextToClipboard(pairing.code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const countdownText = secondsLeft != null ? formatPairingCountdown(secondsLeft) : null;

  return createPortal(
    <div className="confirm-dialog-root" role="dialog" aria-modal="true" aria-labelledby="pairing-code-title">
      <div className="confirm-dialog-backdrop" aria-hidden="true" />
      <div className="confirm-dialog-center">
        <div className="enterprise-modal confirm-dialog-modal" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className={`enterprise-modal__icon ${paired ? "enterprise-modal__icon--success" : "enterprise-modal__icon--primary"}`}>
              {paired ? (
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              ) : (
                <KeyRound className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="pairing-code-title" className="enterprise-modal__title">
                {paired ? "Device paired" : "Setup code"}
              </h3>
              <p className="enterprise-modal__message">
                Shop: <strong>{pairing.shopName || pairing.shopCode}</strong>
                {pairing.deviceUid ? (
                  <>
                    {" "}· Device: <span className="font-mono">{pairing.deviceUid}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {paired ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
              <p className="text-[13.5px] font-semibold text-emerald-800">
                The kiosk has paired successfully and is ready to take attendance.
              </p>
              <p className="text-[12px] text-emerald-700 mt-1">
                It now appears as active in the device list.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-3">
                <code className={`flex-1 rounded-lg border px-4 py-3 text-center font-mono text-[32px] font-bold tracking-[0.35em] ${
                  expired
                    ? "border-slate-200 bg-slate-100 text-slate-400 line-through"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900"
                }`}>
                  {pairing.code}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  disabled={expired}
                  className="btn btn-secondary btn-md flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" aria-hidden="true" /> Copy Code
                    </>
                  )}
                </button>
              </div>
              {secondsLeft != null && (
                <p className={`mt-2 flex items-center gap-1.5 text-[12.5px] ${expired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                  <Clock3 className="w-3.5 h-3.5" aria-hidden="true" />
                  {expired
                    ? "Code expired — generate a new one."
                    : `Expires in ${countdownText}`}
                </p>
              )}
              <p className="mt-3 text-[12.5px] text-slate-600 leading-relaxed">
                Give this code to the Android device operator — it must be
                entered in the <strong>Attendance Kiosk App</strong> setup screen.
                The code works <strong>once</strong> and is never shown again.
              </p>
              <p className="mt-2 text-[12px] text-slate-500">
                Waiting for the device to pair… this screen updates automatically.
              </p>
            </>
          )}

          <div className="enterprise-modal__footer">
            {expired && !paired && onRegenerate && (
              <button type="button" onClick={onRegenerate} className="btn btn-primary btn-md">
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Generate New Code
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`btn btn-md ${paired || !expired ? "btn-primary" : "btn-secondary"}`}
            >
              {paired ? "Done" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
