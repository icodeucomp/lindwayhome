"use client";

import * as React from "react";

import { useAuthStore } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { ConfigField } from "./slicing";
import { Button } from "@/components";

import { FaEye, FaEyeSlash, FaSave } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";

import { configParametersApi } from "@/utils";

import { ApiResponse, ConfigGroup, ConfigValue, EditConfigParameter } from "@/types";

export const ConfigParameterDashboard = () => {
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = React.useState<string>("shipping");
  const [values, setValues] = React.useState<EditConfigParameter>({});
  const [hasChanges, setHasChanges] = React.useState<boolean>(false);

  const {
    data: configData,
    isLoading,
    isError,
  } = configParametersApi.useGetConfigParameters<ApiResponse<ConfigGroup[]>>({
    key: ["config-parameters"],
    enabled: isAuthenticated,
  });

  const updateProduct = configParametersApi.useUpdateConfigParameters({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-parameters"] });
      setHasChanges(false);
    },
  });

  const handleValueChange = (configKey: string, newValue: ConfigValue): void => {
    setValues((prev) => ({ ...prev, [configKey]: newValue }));
    setHasChanges(true);
  };

  const handleSave = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    updateProduct.mutate(values);
  };

  const activeGroup = configData?.data.find((g) => g.name === activeTab);

  React.useEffect(() => {
    const initialValues: EditConfigParameter = {};
    if (configData) {
      configData.data.map((group) => {
        group.configs.map((config) => {
          initialValues[config.key] = config.value;
        });
      });
    }
    setValues(initialValues);
  }, [configData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="loader"></div>
      </div>
    );
  }

  if (isError) {
    return <div className="px-4 py-3 text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading products. Please try again.</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 mb-6 border rounded-lg bg-light border-gray/30">
        <div className="space-y-1 text-gray">
          <div className="flex items-center gap-2">
            <CiSettings className="h-8 w-8 text-blue-600" />

            <h1 className="heading">Parameter Config Management</h1>
          </div>
          <p>Manage your application settings and configurations</p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} className="btn-blue flex items-center gap-2">
            <FaSave className="h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="flex bg-light border border-gray/30 overflow-hidden rounded-lg">
        <div className="w-64 space-y-1">
          {configData?.data.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.name)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                activeTab === group.name ? "bg-blue-100 text-blue-700 shadow-[inset_4px_0_0_0_rgb(37,99,235)]" : "text-gray hover:bg-gray/10"
              }`}
            >
              <div className="font-medium">{group.label}</div>
              <div className="text-sm text-gray mt-1">{group.description}</div>
            </button>
          ))}
        </div>

        <div className="flex-1">
          {activeGroup && (
            <div className="bg-gray/5 p-6 h-full">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray">{activeGroup.label}</h2>
                <p className="text-gray mt-1">{activeGroup.description}</p>
              </div>

              <div className="space-y-6">
                {activeGroup.configs.map((config) => (
                  <div key={config.id} className="bg-light p-4 border border-gray/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray mb-1">{config.label}</label>
                        {config.description && <p className="text-sm text-gray">{config.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray font-mono">{config.key}</span>
                        {config.isActive ? <FaEye className="h-4 w-4 text-green-500" /> : <FaEyeSlash className="h-4 w-4 text-gray" />}
                      </div>
                    </div>

                    <ConfigField config={config} value={values[config.key]} onChange={handleValueChange} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
