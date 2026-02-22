"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { useAuthStore } from "@/hooks";

import { ConfigField } from "./slicing";
import { Button } from "@/components";

import { configParametersApi } from "@/utils";

import { useQueryClient } from "@tanstack/react-query";
import { FaEye, FaEyeSlash, FaSave } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";

import { ApiResponse, ConfigGroup, ConfigValue, EditConfigParameter } from "@/types";

function useConfigParameters() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [values, setValues] = React.useState<EditConfigParameter>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  const { data, isLoading, isError } = configParametersApi.useGetConfigParameters<ApiResponse<ConfigGroup[]>>({
    key: ["config-parameters"],
    enabled: isAuthenticated,
  });

  React.useEffect(() => {
    if (!data) return;
    const initial: EditConfigParameter = {};
    data.data.forEach((group) => {
      group.configs.forEach((config) => {
        initial[config.key] = config.value;
      });
    });
    setValues(initial);
    setHasChanges(false);
  }, [data]);

  const mutation = configParametersApi.useUpdateConfigParameters({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-parameters"] });
      setHasChanges(false);
      toast.success("Configuration saved successfully");
    },
    onError: () => {
      toast.error("Failed to save configuration");
    },
  });

  const handleValueChange = (key: string, newValue: ConfigValue) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
    setHasChanges(true);
  };

  const handleSave = () => mutation.mutate(values);

  return {
    groups: data?.data ?? [],
    isLoading,
    isError,
    isSaving: mutation.isPending,
    values,
    hasChanges,
    handleValueChange,
    handleSave,
  };
}

interface TabSidebarProps {
  groups: ConfigGroup[];
  activeTab: string;
  onTabChange: (name: string) => void;
}

const TabSidebar = ({ groups, activeTab, onTabChange }: TabSidebarProps) => (
  <aside className="w-64 shrink-0 border-r border-gray/30">
    {groups.map((group) => (
      <button
        key={group.id}
        onClick={() => onTabChange(group.name)}
        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === group.name ? "bg-blue-100 text-blue-700 shadow-[inset_4px_0_0_0_rgb(37,99,235)]" : "text-gray hover:bg-gray/10"}`}
      >
        <div className="font-medium">{group.label}</div>
        {group.description && <div className="text-sm text-gray mt-1 line-clamp-2">{group.description}</div>}
      </button>
    ))}
  </aside>
);

export const ConfigParameterDashboard = () => {
  const [activeTab, setActiveTab] = React.useState("shipping");
  const { groups, isLoading, isError, isSaving, values, hasChanges, handleValueChange, handleSave } = useConfigParameters();

  const activeGroup = groups.find((g) => g.name === activeTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="loader" />
      </div>
    );
  }

  if (isError) {
    return <div className="px-4 py-3 text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading configuration. Please try again.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border rounded-lg bg-light border-gray/30">
        <div className="flex items-center gap-2 text-gray">
          <CiSettings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="heading">Parameter Config Management</h1>
            <p className="text-sm">Manage your application settings and configurations</p>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} className="btn-blue flex items-center gap-2">
            <FaSave className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="flex bg-light border border-gray/30 overflow-hidden rounded-lg min-h-160">
        <TabSidebar groups={groups} activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 bg-gray/5 p-6 overflow-y-auto max-h-164">
          {activeGroup ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray">{activeGroup.label}</h2>
                {activeGroup.description && <p className="text-gray mt-1">{activeGroup.description}</p>}
              </div>

              <div className="space-y-4">
                {activeGroup.configs.map((config) => (
                  <div key={config.id} className="bg-light p-4 border border-gray/30 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray mb-0.5">{config.label}</label>
                        {config.description && <p className="text-sm text-gray/70">{config.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <span className="text-xs text-gray/50 font-mono">{config.key}</span>
                        {config.isActive ? <FaEye className="h-4 w-4 text-green-500" /> : <FaEyeSlash className="h-4 w-4 text-gray/40" />}
                      </div>
                    </div>

                    <ConfigField config={config} value={values[config.key]} onChange={handleValueChange} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray/40">Select a group to configure</div>
          )}
        </main>
      </div>
    </div>
  );
};
