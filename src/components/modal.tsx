"use client";

import * as React from "react";

import { motion } from "framer-motion";

import { PiX } from "react-icons/pi";

import { ModalProps } from "@/types";

export const Modal = ({ isVisible, onClose, children, isSmall = false }: ModalProps) => {
  React.useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 flex items-center justify-center w-full h-full min-h-screen p-4 bg-body/50 z-1000">
      <motion.div
        className={`relative w-full mx-auto rounded-sm shadow-xl bg-light border border-border overflow-hidden ${isSmall ? "max-w-lg" : "max-w-3xl"}`}
        style={{ maxHeight: "calc(100vh - 2rem)" }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Square, bordered, and on-palette — the round outlined circle it replaced was
            the only round control left in the storefront. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute z-10 grid transition-colors border top-4 right-4 size-9 place-items-center border-border text-body hover:border-primary hover:text-primary"
        >
          <PiX className="size-4" />
        </button>
        <div className="p-5 overflow-y-auto md:px-10" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
