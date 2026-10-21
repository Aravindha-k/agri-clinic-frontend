import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, Copy, Check } from "lucide-react";
import { copyTextToClipboard } from "../../utils/clipboard";

/**
 * One-time device token display. The plaintext token is returned by the
 * backend ONLY at registration / rotation — it can never be retrieved again.
 */
export default function DeviceTokenModal({ token, deviceName, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;

  const copy = async () => {
    const ok = await copyTextToClipboard(token);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <div className="confirm-dialog-root" role="dialog" aria-modal="true" aria-labelledby="device-token-title">
      <div className="confirm-dialog-backdrop" aria-hidden="true" />
      <div className="confirm-dialog-center">
        <div className="enterprise-modal confirm-dialog-modal" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className="enterprise-modal__icon enterprise-modal__icon--danger">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="device-token-title" className="enterprise-modal__title">
                Device token issued
              </h3>
              <p className="enterprise-modal__message">
                {deviceName ? `Token for "${deviceName}". ` : ""}
                This token is shown <strong>only once</strong>. Copy it now and store it
                securely — it cannot be recovered later. Anyone holding this token can
                submit attendance events as this device.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-mono text-[12.5px] text-amber-900">
              {token}
            </code>
            <button type="button" onClick={copy} className="btn btn-secondary btn-md flex-shrink-0">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" /> Copy
                </>
              )}
            </button>
          </div>
          <div className="enterprise-modal__footer">
            <button type="button" onClick={onClose} className="btn btn-primary btn-md">
              I have stored the token
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
