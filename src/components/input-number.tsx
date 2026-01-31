"use client";

import { InputHTMLAttributes, useCallback } from "react";

export const NumberInput = (props: InputHTMLAttributes<HTMLInputElement>) => {
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
  }, []);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.addEventListener("wheel", handleWheel, { passive: false });
    },
    [handleWheel]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.removeEventListener("wheel", handleWheel);
    },
    [handleWheel]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  return <input {...props} type="number" onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown} />;
};
