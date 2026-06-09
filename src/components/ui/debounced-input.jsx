import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export function DebouncedInput({ value, onChange, delay = 500, ...props }) {
  const [localValue, setLocalValue] = useState(value || "");
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
    <Input
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
