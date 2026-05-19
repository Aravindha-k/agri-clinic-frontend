/**
 * Compact SaaS-style card shell for admin list grids.
 */
export function AdminCard({ children, className = "", onClick, as: Tag = "article" }) {
  const interactive = Boolean(onClick);
  return (
    <Tag
      className={`admin-card ${interactive ? "admin-card--interactive" : ""} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </Tag>
  );
}

export function AdminCardAccent() {
  return <div className="admin-card__accent" aria-hidden="true" />;
}

export function AdminCardBody({ children, className = "" }) {
  return <div className={`admin-card__body ${className}`.trim()}>{children}</div>;
}

export function AdminCardFooter({ children, className = "" }) {
  return <div className={`admin-card__footer ${className}`.trim()}>{children}</div>;
}

export function AdminCardMetaRow({ icon: Icon, tone = "neutral", children }) {
  return (
    <div className="admin-card__meta-row">
      {Icon && (
        <span className={`list-meta-icon list-meta-icon--${tone}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
      )}
      <span className="admin-card__meta-text truncate">{children}</span>
    </div>
  );
}
