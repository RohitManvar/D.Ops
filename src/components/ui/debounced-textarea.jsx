import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

export function DebouncedTextarea({ value, onChange, delay = 500, ...props }) {
  const [localValue, setLocalValue] = useState(value || "");
  const onChangeRef = useRef(onChange);

  // Keep ref fresh
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync from props if external value changes (and we're not currently typing)
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== (value || "")) {
        onChangeRef.current(localValue);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [localValue, delay, value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = (e) => {
    if (localValue !== (value || "")) {
      onChangeRef.current(localValue);
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <Textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
