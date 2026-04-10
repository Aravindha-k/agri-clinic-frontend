import { useState, useRef, useEffect } from "react";

export default function CustomDropdown({
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    disabled = false,
    labelKey = "name_en",
    subLabelKey = "name_ta",
    className = "",
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

    // Debug: log options
    useEffect(() => {
        console.log("CustomDropdown options:", options);
    }, [options]);

    const selected = options.find((opt) => opt.id === value);

    return (
        <div ref={ref} className={`relative ${className}`} style={{ position: "relative" }}>
            <button
                type="button"
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-left focus:ring-2 focus:ring-green-500 transition ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-green-400"}`}
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
            >
                {selected
                    ? (
                        <span>
                            {selected[labelKey]}{subLabelKey && selected[subLabelKey] ? ` (${selected[subLabelKey]})` : ""}
                        </span>
                    )
                    : <span className="text-gray-400">{placeholder}</span>
                }
                <span className="float-right text-gray-400 ml-2">▼</span>
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-56 overflow-y-auto animate-fade-in">
                    {(options || []).length === 0 ? (
                        <div className="px-4 py-3 text-gray-400 text-sm">No options</div>
                    ) : (
                        (options || []).map((opt) => (
                            <div
                                key={opt.id}
                                className={`px-4 py-2 cursor-pointer transition hover:bg-green-50 ${value === opt.id ? "bg-green-100 font-semibold" : ""}`}
                                onClick={() => {
                                    onChange(opt.id);
                                    setOpen(false);
                                }}
                            >
                                {opt[labelKey]}{subLabelKey && opt[subLabelKey] ? ` (${opt[subLabelKey]})` : ""}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
