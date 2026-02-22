"use client";

import * as React from "react";
import { Config, ConfigValue } from "@/types";

import { BooleanField, ImageField, ImagesField, JsonField, NumberField, SelectField, TextareaField, TextField, VideosField } from "./config-field-components";

interface ConfigFieldProps {
  config: Config;
  value: ConfigValue;
  onChange: (key: string, value: ConfigValue) => void;
}

export const ConfigField = ({ config, value, onChange }: ConfigFieldProps) => {
  const handleChange = (newValue: ConfigValue) => onChange(config.key, newValue);

  switch (config.type) {
    case "TEXT":
      return <TextField config={config} value={value} onChange={handleChange} />;
    case "NUMBER":
      return <NumberField config={config} value={value} onChange={handleChange} decimal={false} />;
    case "DECIMAL":
      return <NumberField config={config} value={value} onChange={handleChange} decimal={true} />;
    case "BOOLEAN":
      return <BooleanField value={value} onChange={handleChange} />;
    case "SELECT":
      return <SelectField config={config} value={value} onChange={handleChange} />;
    case "TEXTAREA":
      return <TextareaField config={config} value={value} onChange={handleChange} />;
    case "IMAGE":
      return <ImageField configKey={config.key} value={value} onChange={handleChange} />;
    case "IMAGES":
      return <ImagesField configKey={config.key} value={value} onChange={handleChange} />;
    case "VIDEO":
      return <VideosField value={value} onChange={handleChange} />;
    case "VIDEOS":
      return <VideosField value={value} onChange={handleChange} />;
    case "JSON":
      return <JsonField value={value} onChange={handleChange} />;
    default:
      return <JsonField value={value} onChange={handleChange} />;
  }
};
