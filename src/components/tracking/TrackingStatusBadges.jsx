import { Navigation, Wifi, WifiOff } from "lucide-react";
import {
  resolveWorkStatusKey,
  resolveGpsOnlineKey,
  resolveMovementKey,
} from "../../utils/trackingStatus";

function Badge({ bg, text, border, dot, label, pulse, icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}
    >
      {Icon ? <Icon className="w-3 h-3" /> : (
        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
      )}
      {label}
    </span>
  );
}

export function WorkStatusBadge({ employee, status }) {
  const key = status ? resolveWorkStatusKey({ work_status: status }) : resolveWorkStatusKey(employee ?? {});
  const cfg = {
    working: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: "Working",
      pulse: true,
    },
    auto_ended: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      dot: "bg-amber-500",
      label: "Auto Ended",
      pulse: false,
    },
    stopped: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-400",
      label: "Stopped",
      pulse: false,
    },
  };
  const c = cfg[key] ?? cfg.stopped;
  return <Badge {...c} />;
}

export function GpsOnlineBadge({ employee, status }) {
  const key = status
    ? String(status).toUpperCase() === "ONLINE"
      ? "online"
      : "offline"
    : resolveGpsOnlineKey(employee ?? {});
  const online = key === "online";
  return (
    <Badge
      bg={online ? "bg-blue-50" : "bg-orange-50"}
      text={online ? "text-blue-700" : "text-orange-700"}
      border={online ? "border-blue-200" : "border-orange-200"}
      dot={online ? "bg-blue-500" : "bg-orange-500"}
      label={online ? "Online" : "Offline"}
      pulse={online}
      icon={online ? Wifi : WifiOff}
    />
  );
}

export function MovementBadge({ employee, status }) {
  const key = status
    ? String(status).toLowerCase()
    : resolveMovementKey(employee ?? {});
  const cfg = {
    moving: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: "Moving",
    },
    idle: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      label: "Idle",
    },
    stopped: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-400",
      label: "Stopped",
    },
  };
  const c = cfg[key] ?? cfg.stopped;
  return <Badge {...c} icon={Navigation} pulse={key === "moving"} />;
}
