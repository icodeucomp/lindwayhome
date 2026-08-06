"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { PiImage, PiX } from "react-icons/pi";

import { Img, ProgressBar } from "@/components";

import { filesApi } from "@/utils";

import { Files } from "@/types";

import { Field } from "./form";

/**
 * Single cover image. Same two-phase pipeline as `ProductImages` (§A5.5): the upload
 * lands in temp with `isMoved: false` and only moves when the record is saved, and
 * clearing it here only drops the reference — `resolveFiles` deletes the old file on
 * save, so cancelling the form destroys nothing.
 */
export const SingleImageField = ({ id, label, value, onChange, required, error, hint, aspect = "aspect-16/10" }: {
  id: string;
  label: string;
  value: Files | null;
  onChange: (image: Files | null) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  aspect?: string;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const [uploaded] = await filesApi.uploadImages(files.slice(0, 1), setProgress);
      onChange(uploaded);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} id={id} type="file" hidden accept="image/*" onChange={handleUpload} disabled={isUploading} />
        <label
          htmlFor={id}
          className={`inline-flex items-center gap-2 px-5 py-2.5 font-heading text-xs font-semibold uppercase tracking-[0.12em] border rounded-sm duration-200 ${isUploading ? "cursor-not-allowed border-border text-body/40" : "cursor-pointer border-border text-body hover:border-primary hover:text-primary"}`}
        >
          <PiImage className="size-4" />
          {isUploading ? "Uploading…" : value ? "Replace image" : "Choose image"}
        </label>
        {value && <span className="text-xs truncate text-body/45">{value.originalName}</span>}
      </div>

      {isUploading && (
        <div className="mt-3">
          <ProgressBar uploadProgress={progress} />
        </div>
      )}

      {value && (
        <div className="relative mt-4 overflow-hidden border rounded-sm group max-w-md border-border bg-muted">
          <Img src={value.url} alt={value.alt || value.originalName} className={`w-full ${aspect}`} cover />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute grid rounded-full opacity-0 cursor-pointer top-2 right-2 size-6 place-items-center bg-body/80 text-light hover:bg-red-700 duration-200 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <PiX className="size-3.5" />
          </button>
        </div>
      )}
    </Field>
  );
};
