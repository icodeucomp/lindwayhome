"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { PiArrowLeft, PiArrowRight, PiImage, PiX } from "react-icons/pi";

import { Img, ProgressBar } from "@/components";

import { filesApi } from "@/utils";

import { Files } from "@/types";

import { Field } from "./form";
import { Badge } from "./ui";

/**
 * Multi-image picker for the product form.
 *
 * Uploads land in `<uploads>/temp/` with `isMoved: false` and only move into
 * `products/<sku>/` when the product itself is saved (§A5.5) — so abandoning the
 * form leaves nothing but temp files, which the cleanup sweep collects.
 *
 * Removing an image here only drops it from the array. That is deliberate: on save,
 * `resolveFiles` deletes whatever was in the previous value and is absent from the
 * new one, which is exactly how image removal is meant to work. Deleting the file
 * eagerly would destroy it even if the admin then cancelled the form.
 */
export const ProductImages = ({ value, onChange, error }: { value: Files[]; onChange: (images: Files[]) => void; error?: string }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const uploaded = await filesApi.uploadImages(files, setProgress);
      onChange([...value, ...uploaded]);
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Failed to upload images");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setIsUploading(false);
      setProgress(0);
    }
  };

  const removeAt = (index: number) => onChange(value.filter((_, position) => position !== index));

  const moveBy = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;

    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Field label="Images" required error={error} hint="JPG or PNG, up to 5 MB each. The first image is the one listings and the cart show.">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} id="product-images" type="file" hidden multiple accept="image/*" onChange={handleUpload} disabled={isUploading} />
        <label
          htmlFor="product-images"
          className={`inline-flex items-center gap-2 px-5 py-2.5 font-heading text-xs font-semibold uppercase tracking-[0.12em] border rounded-sm duration-200 ${isUploading ? "cursor-not-allowed border-border text-body/40" : "cursor-pointer border-border text-body hover:border-primary hover:text-primary"}`}
        >
          <PiImage className="size-4" />
          {isUploading ? "Uploading…" : "Choose images"}
        </label>
        <span className="text-xs text-body/45">
          {value.length} image{value.length === 1 ? "" : "s"}
        </span>
      </div>

      {isUploading && (
        <div className="mt-3">
          <ProgressBar uploadProgress={progress} />
        </div>
      )}

      {value.length > 0 && (
        <div className="grid gap-4 mt-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((image, index) => (
            <div key={image.path ?? `${image.filename}-${index}`} className="group">
              <div className="relative overflow-hidden border rounded-sm border-border bg-muted">
                <Img src={image.url} alt={image.alt || image.originalName} className="w-full aspect-square" cover />

                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${image.originalName}`}
                  className="absolute grid rounded-full opacity-0 cursor-pointer top-2 right-2 size-6 place-items-center bg-body/80 text-light hover:bg-red-700 duration-200 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <PiX className="size-3.5" />
                </button>

                {index === 0 && (
                  <span className="absolute top-2 left-2">
                    <Badge className="bg-body/85 text-light">Primary</Badge>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-xs truncate text-body/45">{image.originalName}</span>
                <span className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveBy(index, -1)}
                    disabled={index === 0}
                    aria-label="Move earlier"
                    className="grid rounded-sm cursor-pointer size-5 place-items-center text-body/40 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <PiArrowLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBy(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label="Move later"
                    className="grid rounded-sm cursor-pointer size-5 place-items-center text-body/40 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <PiArrowRight className="size-3.5" />
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Field>
  );
};
