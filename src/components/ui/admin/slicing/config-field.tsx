"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { CircularProgress, Img, NumberInput, ProgressBar } from "@/components";

import { Config, ConfigValue, DiscountType, Files } from "@/types";

import { filesApi } from "@/utils";

interface ConfigFieldProps {
  config: Config;
  value: ConfigValue;
  onChange: (configId: string, newValue: ConfigValue) => void;
}

interface Helper {
  isUploadingImage: boolean;
  uploadProgressImage: number;
  isUploadingImages: boolean;
  uploadProgressImages: number;
  isUploadingVideo: boolean;
  uploadProgressVideo: number;
  isUploadingVideos: boolean;
  uploadProgressVideos: number;
  isDeletingImage: boolean;
  deletingProgressImage: number;
  isDeletingImages: boolean;
  deletingProgressImages: number;
  isDeletingVideo: boolean;
  deletingProgressVideo: number;
  isDeletingVideos: boolean;
  deletingProgressVideos: number;
}

export const ConfigField = ({ config, value, onChange }: ConfigFieldProps) => {
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const imagesInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const videosInputRef = React.useRef<HTMLInputElement | null>(null);

  const [helper, setHelper] = React.useState<Helper>({
    isUploadingImage: false,
    uploadProgressImage: 0,
    isUploadingImages: false,
    uploadProgressImages: 0,
    isUploadingVideo: false,
    uploadProgressVideo: 0,
    isUploadingVideos: false,
    uploadProgressVideos: 0,
    isDeletingImage: false,
    deletingProgressImage: 0,
    isDeletingImages: false,
    deletingProgressImages: 0,
    isDeletingVideo: false,
    deletingProgressVideo: 0,
    isDeletingVideos: false,
    deletingProgressVideos: 0,
  });

  const handleChange = (newValue: ConfigValue): void => {
    onChange(config.key, newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    handleChange(e.target.value);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    if (config.value === DiscountType.PERCENTAGE) {
      if (value > 100 || value < 0) return;
    }
    handleChange(value);
  };

  const handleDecimalChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value);
    if (config.value === DiscountType.PERCENTAGE) {
      if (value > 100 || value < 0) return;
    }
    handleChange(value);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    handleChange(e.target.checked);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    handleChange(e.target.value);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    handleChange(e.target.value);
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video", multiple: boolean = false): Promise<void> => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const uploadKey = multiple ? `${type}s` : type;
    const loadingKey = `isUploading${uploadKey.charAt(0).toUpperCase() + uploadKey.slice(1)}` as keyof Helper;
    const progressKey = `uploadProgress${uploadKey.charAt(0).toUpperCase() + uploadKey.slice(1)}` as keyof Helper;

    try {
      setHelper((prev) => ({ ...prev, [loadingKey]: true }));

      const onProgress = (progress: number) => {
        setHelper((prev) => ({ ...prev, [progressKey]: progress }));
      };

      const uploadFn = type === "image" ? (files: File[]) => filesApi.uploadImages(files, config.key, onProgress) : (files: File[]) => filesApi.uploadVideos(files, onProgress);

      const uploadedFiles = await uploadFn(files);

      if (multiple) {
        const currentFiles = (value as Files[]) || [];
        handleChange([...currentFiles, ...uploadedFiles]);
      } else {
        handleChange(uploadedFiles[0]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add file";
      toast.error(errorMessage);
    } finally {
      setHelper((prev) => ({ ...prev, [loadingKey]: false, [progressKey]: 0 }));
    }
  };

  const handleRemoveFiles = async (subPath: string): Promise<void> => {
    const refs = [imageInputRef, imagesInputRef, videoInputRef, videosInputRef];
    refs.forEach((ref) => {
      if (ref.current) ref.current.value = "";
    });

    const typeConfigMap = {
      IMAGE: { loadingProperty: "isDeletingImage", isArrayType: false },
      IMAGES: { loadingProperty: "isDeletingImages", isArrayType: true },
      VIDEO: { loadingProperty: "isDeletingVideo", isArrayType: false },
      VIDEOS: { loadingProperty: "isDeletingVideos", isArrayType: true },
    } as const;

    const typeConfig = typeConfigMap[config.type as keyof typeof typeConfigMap];

    if (!typeConfig) return;

    const { loadingProperty, isArrayType } = typeConfig;

    try {
      setHelper((prev) => ({ ...prev, [loadingProperty]: true }));

      await filesApi.delete(subPath);

      if (isArrayType) {
        const currentFiles = (value as Files[]) || [];
        const updatedFiles = currentFiles.filter((file) => file.path !== subPath);
        handleChange(updatedFiles);
      } else {
        handleChange(undefined);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete file";
      toast.error(errorMessage);
    } finally {
      setHelper((prev) => ({ ...prev, [loadingProperty]: false }));
    }
  };

  switch (config.type) {
    case "TEXT":
      return <input type="text" value={(value as string) || ""} onChange={handleInputChange} className="input-form" placeholder={config.description} />;

    case "NUMBER":
      return <NumberInput value={(value as number) || ""} onChange={handleNumberChange} className="input-form" />;

    case "DECIMAL":
      return <NumberInput value={(value as number) || ""} onChange={handleDecimalChange} className="input-form" />;

    case "BOOLEAN":
      return (
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={(value as boolean) || false} onChange={handleCheckboxChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray rounded" />
          <span className="text-sm text-gray">Enabled</span>
        </label>
      );

    case "SELECT":
      return (
        <select value={(value as string) || ""} onChange={handleSelectChange} className="input-form">
          <option value="">Select an option</option>
          {config.validation.options &&
            config.validation.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
      );

    case "TEXTAREA":
      return <textarea value={(value as string) || ""} onChange={handleTextareaChange} rows={4} className="input-form" placeholder={config.description} />;

    case "IMAGE":
      const imageValue = value as Files;
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
              <input type="file" id="imageValue" ref={imageInputRef} onChange={(e) => handleUploadFiles(e, "image")} hidden accept="image/*" />
              <label htmlFor="imageValue" className="file-label">
                Choose file
              </label>
              <label className="text-sm text-slate-500 whitespace-nowrap">{imageValue.filename}</label>
              <small className="pr-2 ms-auto text-gray/70">Max 5mb. (aspect ratio of 1:1)</small>
            </div>
            {helper.isUploadingImage && <ProgressBar uploadProgress={helper.uploadProgressImages} />}
          </div>

          {imageValue && (
            <div className="relative w-80">
              <button onClick={() => handleRemoveFiles(imageValue.path)} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-1 bg-secondary">
                <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative overflow-hidden rounded-lg">
                <Img src={imageValue.path} alt={imageValue.alt} className="rounded-lg aspect-square w-full" cover />
                {helper.isDeletingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="flex flex-col items-center space-y-4">
                      <CircularProgress progress={helper.deletingProgressImage} />
                      <div className="text-sm font-medium text-white">Deleting...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );

    case "IMAGES":
      const imagesValue = (value as Files[]) || [];
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
              <input type="file" id="imagesValue" ref={imagesInputRef} onChange={(e) => handleUploadFiles(e, "image", true)} hidden multiple accept="image/*" />
              <label htmlFor="imagesValue" className="file-label">
                Choose image
              </label>
              <label className="text-sm text-slate-500 whitespace-nowrap">{imagesValue.length} Images</label>
              <small className="pr-2 ms-auto text-gray/70">Max 5mb. (aspect ratio of 1:1)</small>
            </div>
            {helper.isUploadingImages && <ProgressBar uploadProgress={helper.uploadProgressImages} />}
          </div>

          {imagesValue.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagesValue.map((image, index) => (
                <div key={index} className="relative rounded-lg">
                  <button onClick={() => handleRemoveFiles(image.path)} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-1 bg-secondary">
                    <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="relative overflow-hidden rounded-lg shadow-lg">
                    <Img src={image.path} alt={`Selected image ${index + 1}`} className="w-full rounded-lg aspect-square" cover />
                    {helper.isDeletingImages && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="flex flex-col items-center space-y-4">
                          <CircularProgress progress={helper.deletingProgressImages} />
                          <div className="text-sm font-medium text-white">Deleting...</div>
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

    case "VIDEO":
      const videoValue = value as Files;
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
              <input type="file" id="videoValue" ref={videoInputRef} onChange={(e) => handleUploadFiles(e, "video")} hidden accept="video/mp4,video/x-m4v,video/*" />
              <label htmlFor="videoValue" className="file-label">
                Choose video
              </label>
              <small className="pr-2 ms-auto text-gray/70">Max 15mb. (aspect ratio of 16:9)</small>
            </div>
            {helper.isUploadingVideo && <ProgressBar uploadProgress={helper.uploadProgressVideo} />}
          </div>

          {videoValue && (
            <div className="relative w-96">
              <button onClick={() => handleRemoveFiles(videoValue.path)} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-1 bg-secondary">
                <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative overflow-hidden rounded-lg">
                <div className="relative w-96 h-auto overflow-hidden rounded-lg shadow-md">
                  <video src={videoValue.url} aria-label={videoValue.originalName} className="w-full h-auto" autoPlay muted loop controls />
                </div>
                {helper.isDeletingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="flex flex-col items-center space-y-4">
                      <CircularProgress progress={helper.deletingProgressImage} />
                      <div className="text-sm font-medium text-white">Deleting...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );

    case "VIDEOS":
      const videosValue = (value as Files[]) || [];
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
              <input type="file" id="videosValue" ref={videosInputRef} onChange={(e) => handleUploadFiles(e, "video", true)} hidden multiple accept="video/mp4,video/x-m4v,video/*" />
              <label htmlFor="videosValue" className="file-label">
                Choose videos
              </label>
              <label className="text-sm text-slate-500 whitespace-nowrap">{videosValue.length} Videos</label>
              <small className="pr-2 ms-auto text-gray/70">Max 15mb. (aspect ratio of 16:9)</small>
            </div>
            {helper.isUploadingVideos && <ProgressBar uploadProgress={helper.uploadProgressVideos} />}
          </div>
          {videosValue.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {videosValue.map((video, index) => (
                <div key={index} className="relative rounded-lg">
                  <button onClick={() => handleRemoveFiles(video.path)} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-1 bg-secondary">
                    <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="relative overflow-hidden rounded-lg shadow-lg">
                    <div className="relative w-full h-auto overflow-hidden rounded-lg shadow-md">
                      <video src={video.url} aria-label={video.originalName} className="w-full h-auto" autoPlay muted loop controls />
                    </div>

                    {helper.isDeletingImages && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="flex flex-col items-center space-y-4">
                          <CircularProgress progress={helper.deletingProgressImages} />
                          <div className="text-sm font-medium text-white">Deleting...</div>
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

    default:
      return (
        <input
          type="text"
          value={JSON.stringify(value)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            try {
              handleChange(JSON.parse(e.target.value));
            } catch {
              // Invalid JSON, keep as string for now
            }
          }}
          className="input-form"
        />
      );
  }
};
