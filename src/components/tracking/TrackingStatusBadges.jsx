import { Navigation, Wifi, WifiOff, MapPinOff, AlertTriangle, Activity } from "lucide-react";
import {
  resolveWorkdayStatusKey,
  resolveGpsDataStatusKey,
  resolveTrackingTaskKey,
  resolveMovementKey,
  WORKDAY_STATUS_LABELS,
  GPS_DATA_STATUS_LABELS,
  TRACKING_TASK_LABELS,
  MOVEMENT_LABELS,
} from "../../utils/trackingStatus";

function Badge({ bg, text, border, dot, label, pulse, icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${bg} ${text} ${border}`}
    >
      {Icon ? <Icon className="w-3 h-3" /> : (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot} ${pulse ? "animate-pulse" : ""}`} />
      )}
      {label}
    </span>
  );
}

const WORKDAY_CFG = {
  working: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    pulse: true,
  },
  ended: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
    pulse: false,
  },
  not_started: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    dot: "bg-gray-400",
    pulse: false,
  },
};

const GPS_DATA_CFG = {
  online: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    pulse: true,
    icon: Wifi,
  },
  offline: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
    pulse: false,
    icon: WifiOff,
  },
  never_sent: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    pulse: false,
    icon: MapPinOff,
  },
};

const TASK_CFG = {
  tracking: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: Activity,
  },
  stopped: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    dot: "bg-gray-400",
    icon: null,
  },
  permission_issue: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    icon: AlertTriangle,
  },
  unknown: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
};

export function WorkdayStatusBadge({ employee }) {
  const key = resolveWorkdayStatusKey(employee ?? {});
  const c = WORKDAY_CFG[key] ?? WORKDAY_CFG.not_started;
  return <Badge {...c} label={WORKDAY_STATUS_LABELS[key]} />;
}

/** @deprecated use WorkdayStatusBadge */
export function WorkStatusBadge({ employee, status }) {
  const key = status
    ? resolveWorkdayStatusKey({ work_status: status })
    : resolveWorkdayStatusKey(employee ?? {});
  const c = WORKDAY_CFG[key] ?? WORKDAY_CFG.not_started;
  return <Badge {...c} label={WORKDAY_STATUS_LABELS[key]} />;
}

export function GpsDataStatusBadge({ employee }) {
  const key = resolveGpsDataStatusKey(employee ?? {});
  const c = GPS_DATA_CFG[key] ?? GPS_DATA_CFG.offline;
  return <Badge {...c} label={GPS_DATA_STATUS_LABELS[key]} icon={c.icon} />;
}

/** @deprecated use GpsDataStatusBadge */
export function GpsOnlineBadge({ employee, status }) {
  const key = status
    ? String(status).toUpperCase() === "ONLINE"
      ? "online"
      : "offline"
    : resolveGpsDataStatusKey(employee ?? {});
  const c = GPS_DATA_CFG[key === "online" ? "online" : "offline"];
  return <Badge {...c} label={GPS_DATA_STATUS_LABELS[key === "online" ? "online" : "offline"]} icon={c.icon} />;
}

export function TrackingTaskBadge({ employee }) {
  const key = resolveTrackingTaskKey(employee ?? {});
  const c = TASK_CFG[key] ?? TASK_CFG.unknown;
  return <Badge {...c} label={TRACKING_TASK_LABELS[key]} icon={c.icon} pulse={key === "tracking"} />;
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
      label: MOVEMENT_LABELS.moving,
    },
    idle: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      label: MOVEMENT_LABELS.idle,
    },
    stopped: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-400",
      label: MOVEMENT_LABELS.stopped,
    },
  };
  const c = cfg[key] ?? cfg.stopped;
  return <Badge {...c} icon={Navigation} pulse={key === "moving"} />;
}
