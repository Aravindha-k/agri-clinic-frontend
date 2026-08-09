import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  labelKey = "name_en",
  subLabelKey = "name_ta",
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = options.find((opt) => opt.id === value);

  return (
    <div ref={ref} className={`custom-dropdown relative ${className}`}>
      <button
        type="button"
        id={id}
        className={`custom-dropdown__trigger${disabled ? " is-disabled" : ""}${open ? " is-open" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`custom-dropdown__value${selected ? "" : " is-placeholder"}`}>
          {selected
            ? `${selected[labelKey]}${subLabelKey && selected[subLabelKey] ? ` (${selected[subLabelKey]})` : ""}`
            : placeholder}
        </span>
        <ChevronDown className="custom-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="custom-dropdown__menu" role="listbox">
          {(options || []).length === 0 ? (
            <div className="custom-dropdown__empty">No options</div>
          ) : (
            (options || []).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={value === opt.id}
                className={`custom-dropdown__option${value === opt.id ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                {opt[labelKey]}
                {subLabelKey && opt[subLabelKey] ? ` (${opt[subLabelKey]})` : ""}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
