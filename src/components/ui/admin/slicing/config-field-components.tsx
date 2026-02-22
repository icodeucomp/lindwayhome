"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { CircularProgress, Img, ProgressBar, NumberInput } from "@/components";

import { filesApi } from "@/utils";

import { Config, ConfigValue, DiscountType, Files, JsonRow } from "@/types";

export const TextField = ({ config, value, onChange }: { config: Config; value: ConfigValue; onChange: (value: ConfigValue) => void }) => (
  <input type="text" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={config.description} className="input-form" />
);

export const NumberField = ({ config, value, onChange, decimal }: { config: Config; value: ConfigValue; onChange: (value: ConfigValue) => void; decimal: boolean }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = decimal ? parseFloat(e.target.value) : parseInt(e.target.value);
    if (isNaN(parsed)) return;

    const isPercentage = config.value === DiscountType.PERCENTAGE;
    if (isPercentage && (parsed < 0 || parsed > 100)) return;

    onChange(parsed);
  };

  return <NumberInput value={(value as number) || ""} onChange={handleChange} className="input-form" />;
};

export const BooleanField = ({ value, onChange }: { value: ConfigValue; onChange: (value: ConfigValue) => void }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={(value as boolean) || false} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray rounded" />
    <span className="text-sm text-gray">Enabled</span>
  </label>
);

export const SelectField = ({ config, value, onChange }: { config: Config; value: ConfigValue; onChange: (value: ConfigValue) => void }) => (
  <select value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className="input-form">
    <option value="">Select an option</option>
    {config.validation?.options?.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const TextareaField = ({ config, value, onChange }: { config: Config; value: ConfigValue; onChange: (value: ConfigValue) => void }) => (
  <textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={config.description} className="input-form" />
);

export const JsonField = ({ value, onChange }: { value: ConfigValue; onChange: (value: ConfigValue) => void }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [rawMode, setRawMode] = React.useState(false);
  const [rawText, setRawText] = React.useState(() => JSON.stringify(value, null, 2));

  React.useEffect(() => {
    setRawText(JSON.stringify(value, null, 2));
  }, [value]);

  const handleRawChange = (text: string) => {
    setRawText(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch {
      setError("Invalid JSON");
    }
  };

  const isArrayOfObjects = Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null;

  if (isArrayOfObjects && !rawMode) {
    const rows = value as unknown as JsonRow[];
    const keys = Object.keys(rows[0]);

    const updateCell = (rowIndex: number, key: string, cellValue: string) => {
      const updated = rows.map((row, i) => {
        if (i !== rowIndex) return row;
        const original = row[key];
        let parsed: unknown = cellValue;
        if (cellValue === "" || cellValue === "null") {
          parsed = null;
        } else if (typeof original === "number" || original === null) {
          const n = Number(cellValue);
          parsed = isNaN(n) ? cellValue : n;
        }
        return { ...row, [key]: parsed };
      });
      onChange(updated);
    };

    const addRow = () => {
      const emptyRow = keys.reduce<JsonRow>((acc, k) => {
        acc[k] = typeof rows[0][k] === "number" ? 0 : null;
        return acc;
      }, {});
      onChange([...rows, emptyRow]);
    };

    const removeRow = (index: number) => {
      onChange(rows.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray/60 font-mono">Array · {rows.length} rows</span>
          <button type="button" onClick={() => setRawMode(true)} className="text-xs text-blue-500 hover:underline">
            Edit as JSON
          </button>
        </div>

        <div className="overflow-x-auto border border-gray/30 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray/10 border-b border-gray/30">
                {keys.map((k) => (
                  <th key={k} className="px-3 py-2 text-left font-medium text-gray capitalize">
                    {k.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray/20 last:border-0 hover:bg-gray/5">
                  {keys.map((k) => (
                    <td key={k} className="px-3 py-2">
                      <input
                        type="text"
                        value={row[k] === null ? "" : String(row[k])}
                        placeholder={row[k] === null ? "null" : ""}
                        onChange={(e) => updateCell(rowIndex, k, e.target.value)}
                        className="w-full bg-transparent border-b border-gray/30 focus:border-blue-500 outline-none py-0.5 text-gray placeholder:text-gray/30 min-w-20"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeRow(rowIndex)} className="text-red-400 hover:text-red-600" aria-label="Remove row">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addRow} className="text-xs text-blue-600 hover:underline">
          + Add row
        </button>
      </div>
    );
  }

  const isPlainObject = !Array.isArray(value) && typeof value === "object" && value !== null && !rawMode;

  if (isPlainObject) {
    const obj = value as JsonRow;
    const keys = Object.keys(obj);

    const updateKey = (key: string, cellValue: string) => {
      const original = obj[key];
      let parsed: unknown = cellValue;
      if (cellValue === "" || cellValue === "null") {
        parsed = null;
      } else if (typeof original === "number" || original === null) {
        const n = Number(cellValue);
        parsed = isNaN(n) ? cellValue : n;
      }
      onChange({ ...obj, [key]: parsed });
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button type="button" onClick={() => setRawMode(true)} className="text-xs text-blue-500 hover:underline">
            Edit as JSON
          </button>
        </div>

        <div className="border border-gray/30 rounded-lg overflow-hidden">
          {keys.map((k, i) => (
            <div key={k} className={`flex items-center gap-3 px-3 py-2 ${i !== keys.length - 1 ? "border-b border-gray/20" : ""} hover:bg-gray/5`}>
              <span className="text-xs font-mono text-gray/60 w-28 shrink-0 capitalize">{k.replace(/_/g, " ")}</span>
              <input
                type="text"
                value={obj[k] === null ? "" : String(obj[k])}
                placeholder={obj[k] === null ? "null" : ""}
                onChange={(e) => updateKey(k, e.target.value)}
                className="flex-1 bg-transparent border-b border-gray/30 focus:border-blue-500 outline-none py-0.5 text-gray placeholder:text-gray/30"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rawMode && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setRawMode(false);
              setError(null);
            }}
            className="text-xs text-blue-500 hover:underline"
          >
            Back to editor
          </button>
        </div>
      )}
      <textarea value={rawText} onChange={(e) => handleRawChange(e.target.value)} rows={8} spellCheck={false} className={`input-form font-mono text-xs ${error ? "border-red-400" : ""}`} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const ImageField = ({ configKey, value, onChange }: { configKey: string; value: ConfigValue; onChange: (value: ConfigValue) => void }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  const imageValue = value as Files | undefined;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded = await filesApi.uploadImages(files, configKey, setUploadProgress);
      onChange(uploaded[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!imageValue) return;
    if (inputRef.current) inputRef.current.value = "";
    try {
      setDeleting(true);
      await filesApi.delete(imageValue.path);
      onChange(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
          <input type="file" id={`image-${configKey}`} ref={inputRef} onChange={handleUpload} hidden accept="image/*" />
          <label htmlFor={`image-${configKey}`} className="file-label">
            Choose file
          </label>
          <span className="text-sm text-slate-500 whitespace-nowrap">{imageValue?.filename}</span>
          <small className="pr-2 ms-auto text-gray/70">Max 5mb. (1:1)</small>
        </div>
        {uploading && <ProgressBar uploadProgress={uploadProgress} />}
      </div>

      {imageValue && (
        <div className="relative w-80">
          <button onClick={handleDelete} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-10 bg-secondary cursor-pointer">
            <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative overflow-hidden rounded-lg">
            <Img src={imageValue.path} alt={imageValue.alt} className="rounded-lg aspect-square w-full" cover />
            {deleting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-3">
                  <CircularProgress progress={0} />
                  <span className="text-sm font-medium text-white">Deleting...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ImagesField = ({ configKey, value, onChange }: { configKey: string; value: ConfigValue; onChange: (value: ConfigValue) => void }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);

  const images = (value as Files[]) || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded = await filesApi.uploadImages(files, configKey, setUploadProgress);
      onChange([...images, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload images");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (path: string) => {
    if (inputRef.current) inputRef.current.value = "";
    try {
      setDeletingPath(path);
      await filesApi.delete(path);
      onChange(images.filter((f) => f.path !== path));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete image");
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
          <input type="file" id={`images-${configKey}`} ref={inputRef} onChange={handleUpload} hidden multiple accept="image/*" />
          <label htmlFor={`images-${configKey}`} className="file-label">
            Choose images
          </label>
          <span className="text-sm text-slate-500 whitespace-nowrap">{images.length} Images</span>
          <small className="pr-2 ms-auto text-gray/70">Max 5mb. (1:1)</small>
        </div>
        {uploading && <ProgressBar uploadProgress={uploadProgress} />}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative rounded-lg">
              <button
                onClick={() => handleDelete(image.path)}
                type="button"
                className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-10 bg-secondary cursor-pointer"
              >
                <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative overflow-hidden rounded-lg shadow-lg">
                <Img src={image.url} alt={`Image ${index + 1}`} className="w-full rounded-lg aspect-square" cover />
                {deletingPath === image.path && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-3">
                      <CircularProgress progress={0} />
                      <span className="text-sm font-medium text-white">Deleting...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const VideoField = ({ value, onChange }: { value: ConfigValue; onChange: (value: ConfigValue) => void }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  const videoValue = value as Files | undefined;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded = await filesApi.uploadVideos(files, setUploadProgress);
      onChange(uploaded[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!videoValue) return;
    if (inputRef.current) inputRef.current.value = "";
    try {
      setDeleting(true);
      await filesApi.delete(videoValue.path);
      onChange(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete video");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
          <input type="file" id="video-single" ref={inputRef} onChange={handleUpload} hidden accept="video/mp4,video/x-m4v,video/*" />
          <label htmlFor="video-single" className="file-label">
            Choose video
          </label>
          <small className="pr-2 ms-auto text-gray/70">Max 15mb. (16:9)</small>
        </div>
        {uploading && <ProgressBar uploadProgress={uploadProgress} />}
      </div>

      {videoValue && (
        <div className="relative w-96">
          <button onClick={handleDelete} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-10 bg-secondary cursor-pointer">
            <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative overflow-hidden rounded-lg">
            <video src={videoValue.url} aria-label={videoValue.originalName} className="w-full h-auto rounded-lg shadow-md" autoPlay muted loop controls />
            {deleting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-3">
                  <CircularProgress progress={0} />
                  <span className="text-sm font-medium text-white">Deleting...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const VideosField = ({ value, onChange }: { value: ConfigValue; onChange: (value: ConfigValue) => void }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);

  const videos = (value as Files[]) || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    try {
      setUploading(true);
      const uploaded = await filesApi.uploadVideos(files, setUploadProgress);
      onChange([...videos, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload videos");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (path: string) => {
    if (inputRef.current) inputRef.current.value = "";
    try {
      setDeletingPath(path);
      await filesApi.delete(path);
      onChange(videos.filter((v) => v.path !== path));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete video");
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
          <input type="file" id="videos-multiple" ref={inputRef} onChange={handleUpload} hidden multiple accept="video/mp4,video/x-m4v,video/*" />
          <label htmlFor="videos-multiple" className="file-label">
            Choose videos
          </label>
          <span className="text-sm text-slate-500 whitespace-nowrap">{videos.length} Videos</span>
          <small className="pr-2 ms-auto text-gray/70">Max 15mb. (16:9)</small>
        </div>
        {uploading && <ProgressBar uploadProgress={uploadProgress} />}
      </div>

      {videos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {videos.map((video, index) => (
            <div key={index} className="relative rounded-lg">
              <button
                onClick={() => handleDelete(video.path)}
                type="button"
                className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-10 bg-secondary cursor-pointer"
              >
                <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative overflow-hidden rounded-lg shadow-lg">
                <video src={video.url} aria-label={video.originalName} className="w-full h-auto rounded-lg" autoPlay muted loop controls />
                {deletingPath === video.path && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-3">
                      <CircularProgress progress={0} />
                      <span className="text-sm font-medium text-white">Deleting...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
