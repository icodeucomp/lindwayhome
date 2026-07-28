"use client";

import * as React from "react";

import { useAuthStore } from "@/hooks";

import { ConfigField, ErrorState, LoadingState, Panel, Spinner } from "./slicing";
import { Button } from "@/components";

import { configParametersApi } from "@/utils";

import { useQueryClient } from "@tanstack/react-query";
import { FaEye, FaEyeSlash, FaSave } from "react-icons/fa";

import { ApiResponse, ConfigGroup, ConfigValue, EditConfigParameter } from "@/types";

const useConfigParameters = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Only the user's pending edits live in state — saved values always come from the server,
  // so a refetch can never be clobbered by a stale local copy.
  const [edits, setEdits] = React.useState<EditConfigParameter>({});

  const { data, isLoading, isError } = configParametersApi.useGetConfigParameters<ApiResponse<ConfigGroup[]>>({
    key: ["config-parameters"],
    enabled: isAuthenticated,
  });

  const savedValues = React.useMemo(() => {
    const initial: EditConfigParameter = {};
    data?.data.forEach((group) => {
      group.configs.forEach((config) => {
        initial[config.key] = config.value;
      });
    });
    return initial;
  }, [data]);

  const values = React.useMemo(() => ({ ...savedValues, ...edits }), [savedValues, edits]);

  // An edit that matches the saved value again is not a change.
  const changedKeys = React.useMemo(
    () => new Set(Object.keys(edits).filter((key) => JSON.stringify(edits[key]) !== JSON.stringify(savedValues[key]))),
    [edits, savedValues],
  );

  const updateConfigParameters = configParametersApi.useUpdateConfigParameters({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-parameters"] });
      setEdits({});
    },
  });

  const handleValueChange = (key: string, newValue: ConfigValue) => {
    setEdits((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSave = () => {
    const changedValues = Object.fromEntries([...changedKeys].map((key) => [key, values[key]]));
    updateConfigParameters.mutate(changedValues);
  };

  const handleReset = () => setEdits({});

  return {
    groups: data?.data ?? [],
    isLoading,
    isError,
    isSaving: updateConfigParameters.isPending,
    values,
    changedKeys,
    handleValueChange,
    handleSave,
    handleReset,
  };
};

interface GroupNavProps {
  groups: ConfigGroup[];
  activeTab: string;
  changedCountByGroup: Record<string, number>;
  onTabChange: (name: string) => void;
}

const GroupNav = ({ groups, activeTab, changedCountByGroup, onTabChange }: GroupNavProps) => (
  <>
    {/* Horizontal tabs — small screens */}
    <div className="flex gap-2 p-2 overflow-x-auto border-b lg:hidden scrollbar border-gray/15">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onTabChange(group.name)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium duration-300 rounded-lg cursor-pointer whitespace-nowrap ${
            activeTab === group.name ? "bg-gray text-light" : "text-gray hover:bg-gray/10"
          }`}
        >
          {group.label}
          {changedCountByGroup[group.name] > 0 && (
            <span className={`px-1.5 text-xxs font-bold rounded-full ${activeTab === group.name ? "bg-light text-gray" : "bg-blue-100 text-blue-700"}`}>{changedCountByGroup[group.name]}</span>
          )}
        </button>
      ))}
    </div>

    {/* Sidebar — large screens */}
    <aside className="hidden w-64 border-r lg:block shrink-0 border-gray/15">
      {groups.map((group) => {
        const isActive = activeTab === group.name;
        return (
          <button
            key={group.id}
            onClick={() => onTabChange(group.name)}
            className={`w-full px-4 py-3 text-left duration-300 cursor-pointer border-l-4 ${isActive ? "bg-gray/10 border-l-gray" : "border-l-transparent text-gray hover:bg-gray/5"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`font-medium ${isActive ? "text-darker-gray" : ""}`}>{group.label}</span>
              {changedCountByGroup[group.name] > 0 && <span className="px-1.5 text-xxs font-bold text-blue-700 bg-blue-100 rounded-full shrink-0">{changedCountByGroup[group.name]}</span>}
            </div>
            {group.description && <p className="mt-1 text-xs text-gray/70 line-clamp-2">{group.description}</p>}
          </button>
        );
      })}
    </aside>
  </>
);

export const ConfigParameterDashboard = () => {
  const [activeTab, setActiveTab] = React.useState("shipping");
  const { groups, isLoading, isError, isSaving, values, changedKeys, handleValueChange, handleSave, handleReset } = useConfigParameters();

  const activeGroup = groups.find((g) => g.name === activeTab) ?? groups[0];
  const hasChanges = changedKeys.size > 0;

  const changedCountByGroup = React.useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach((group) => {
      counts[group.name] = group.configs.filter((config) => changedKeys.has(config.key)).length;
    });
    return counts;
  }, [groups, changedKeys]);

  if (isLoading) {
    return (
      <Panel>
        <LoadingState message="Loading configuration..." />
      </Panel>
    );
  }

  if (isError) {
    return (
      <Panel>
        <ErrorState message="We couldn't load your configuration. Please check your connection and try again." />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unsaved changes bar */}
      <div
        className={`sticky top-20 z-40 flex flex-col gap-3 px-4 py-3 duration-300 border rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between ${
          hasChanges ? "bg-blue-50 border-blue-200" : "bg-light border-gray/15"
        }`}
      >
        <p className="text-sm text-gray">
          {hasChanges ? (
            <>
              <span className="font-semibold text-darker-gray">
                {changedKeys.size} unsaved {changedKeys.size === 1 ? "change" : "changes"}
              </span>{" "}
              — remember to save before leaving this page.
            </>
          ) : (
            "All settings are saved and up to date."
          )}
        </p>

        <div className="flex gap-2 shrink-0">
          <Button onClick={handleReset} disabled={!hasChanges || isSaving} className="btn-outline disabled:opacity-50">
            Discard
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="flex items-center justify-center gap-2 btn-blue">
            {isSaving ? <Spinner /> : <FaSave className="size-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <Panel className="flex flex-col overflow-hidden lg:flex-row min-h-160">
        <GroupNav groups={groups} activeTab={activeGroup?.name ?? ""} changedCountByGroup={changedCountByGroup} onTabChange={setActiveTab} />

        <main className="flex-1 p-4 overflow-y-auto bg-gray/5 sm:p-6 max-h-164 scrollbar">
          {activeGroup ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-darker-gray">{activeGroup.label}</h2>
                {activeGroup.description && <p className="mt-1 text-sm text-gray/70">{activeGroup.description}</p>}
              </div>

              <div className="space-y-4">
                {activeGroup.configs.map((config) => {
                  const isChanged = changedKeys.has(config.key);
                  return (
                    <div key={config.id} className={`p-4 duration-300 border rounded-lg bg-light ${isChanged ? "border-blue-300 ring-1 ring-blue-200" : "border-gray/15"}`}>
                      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <label className="flex items-center gap-2 text-sm font-semibold text-darker-gray">
                            {config.label}
                            {isChanged && <span className="px-1.5 py-0.5 text-xxs font-bold text-blue-700 bg-blue-100 rounded-full">Edited</span>}
                          </label>
                          {config.description && <p className="mt-0.5 text-xs text-gray/70">{config.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0">
                          <span className="font-mono text-xs text-gray/50">{config.key}</span>
                          <span title={config.isActive ? "Visible on the storefront" : "Hidden from the storefront"}>
                            {config.isActive ? <FaEye className="text-green-500 size-4" /> : <FaEyeSlash className="size-4 text-gray/40" />}
                          </span>
                        </div>
                      </div>

                      <ConfigField config={config} value={values[config.key]} onChange={handleValueChange} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray/50">Select a group to configure</div>
          )}
        </main>
      </Panel>
    </div>
  );
};
