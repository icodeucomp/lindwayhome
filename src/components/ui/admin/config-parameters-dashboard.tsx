"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { PiEye, PiEyeSlash } from "react-icons/pi";

import { useAuthStore } from "@/hooks";

import { configParametersApi } from "@/utils";

import { ApiResponse, ConfigGroup, ConfigValue, EditConfigParameter } from "@/types";

import { AdminButton, Badge, ConfigField, ErrorState, LoadingState, PageHeader, Panel, Spinner } from "./slicing";

const useConfigParameters = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Only the user's pending edits live in state — saved values always come from the server,
  // so a refetch can never be clobbered by a stale local copy.
  const [edits, setEdits] = React.useState<EditConfigParameter>({});

  const { data, isLoading, isError } = configParametersApi.useGetConfigParameters<ApiResponse<ConfigGroup[]>>({ key: ["config-parameters"], enabled: isAuthenticated });

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
  const changedKeys = React.useMemo(() => new Set(Object.keys(edits).filter((key) => JSON.stringify(edits[key]) !== JSON.stringify(savedValues[key]))), [edits, savedValues]);

  const updateConfigParameters = configParametersApi.useUpdateConfigParameters({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-parameters"] });
      setEdits({});
    },
  });

  const handleValueChange = (key: string, newValue: ConfigValue) => setEdits((previous) => ({ ...previous, [key]: newValue }));

  const handleSave = () => updateConfigParameters.mutate(Object.fromEntries([...changedKeys].map((key) => [key, values[key]])));

  return {
    groups: data?.data ?? [],
    isLoading,
    isError,
    isSaving: updateConfigParameters.isPending,
    values,
    changedKeys,
    handleValueChange,
    handleSave,
    handleReset: () => setEdits({}),
  };
};

const GroupNav = ({ groups, activeTab, changedCountByGroup, onTabChange }: { groups: ConfigGroup[]; activeTab: string; changedCountByGroup: Record<string, number>; onTabChange: (name: string) => void }) => (
  <>
    {/* Horizontal tabs — small screens */}
    <div className="flex gap-1 p-2 overflow-x-auto border-b lg:hidden scrollbar border-border">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onTabChange(group.name)}
          className={`flex items-center gap-2 px-4 py-2 font-heading text-xxs font-semibold uppercase tracking-[0.14em] rounded-sm duration-200 cursor-pointer whitespace-nowrap ${activeTab === group.name ? "bg-body text-light" : "text-body/60 hover:text-body"}`}
        >
          {group.label}
          {changedCountByGroup[group.name] > 0 && <span className="px-1.5 rounded-full text-xxs bg-primary text-light">{changedCountByGroup[group.name]}</span>}
        </button>
      ))}
    </div>

    {/* Rail — large screens */}
    <aside className="hidden w-64 border-r lg:block shrink-0 border-border bg-muted/40">
      {groups.map((group) => {
        const isActive = activeTab === group.name;
        return (
          <button
            key={group.id}
            onClick={() => onTabChange(group.name)}
            className={`w-full px-5 py-4 text-left duration-200 cursor-pointer border-l-2 ${isActive ? "bg-light border-l-primary" : "border-l-transparent hover:bg-light/60"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={`font-heading text-xxs font-semibold uppercase tracking-[0.14em] ${isActive ? "text-body" : "text-body/55"}`}>{group.label}</span>
              {changedCountByGroup[group.name] > 0 && <span className="px-1.5 rounded-full text-xxs bg-primary text-light shrink-0">{changedCountByGroup[group.name]}</span>}
            </span>
            {group.description && <span className="block mt-1 text-xs text-body/45 line-clamp-2">{group.description}</span>}
          </button>
        );
      })}
    </aside>
  </>
);

export const ConfigParameterDashboard = () => {
  const [activeTab, setActiveTab] = React.useState("shipping");
  const { groups, isLoading, isError, isSaving, values, changedKeys, handleValueChange, handleSave, handleReset } = useConfigParameters();

  const activeGroup = groups.find((group) => group.name === activeTab) ?? groups[0];
  const hasChanges = changedKeys.size > 0;

  const changedCountByGroup = React.useMemo(() => Object.fromEntries(groups.map((group) => [group.name, group.configs.filter((config) => changedKeys.has(config.key)).length])), [groups, changedKeys]);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Parameters"
        description="Store-wide settings: shipping rates and origin, package dimensions, tax, the member rate and the promo. One value per store — anything with its own rows or lifecycle belongs in a table instead (D12)."
      />

      {isLoading ? (
        <LoadingState message="Loading configuration" />
      ) : isError ? (
        <ErrorState message="We couldn't load your configuration. Please check your connection and try again." />
      ) : (
        <>
          <div className={`sticky top-20 z-40 flex flex-col gap-3 px-5 py-3 mb-6 duration-200 border rounded-sm sm:flex-row sm:items-center sm:justify-between ${hasChanges ? "border-primary bg-primary/7" : "border-border bg-light"}`}>
            <p className="text-sm text-body/70">
              {hasChanges ? (
                <>
                  <span className="text-body">
                    {changedKeys.size} unsaved {changedKeys.size === 1 ? "change" : "changes"}
                  </span>{" "}
                  — nothing is applied until you save.
                </>
              ) : (
                "All settings are saved and up to date."
              )}
            </p>

            <div className="flex gap-2 shrink-0">
              <AdminButton size="sm" onClick={handleReset} disabled={!hasChanges || isSaving}>
                Discard
              </AdminButton>
              <AdminButton size="sm" variant="solid" onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving && <Spinner />}
                {isSaving ? "Saving…" : "Save changes"}
              </AdminButton>
            </div>
          </div>

          <Panel className="flex flex-col overflow-hidden lg:flex-row min-h-160">
            <GroupNav groups={groups} activeTab={activeGroup?.name ?? ""} changedCountByGroup={changedCountByGroup} onTabChange={setActiveTab} />

            <main className="flex-1 p-5 overflow-y-auto sm:p-8 max-h-164 scrollbar">
              {activeGroup ? (
                <>
                  <div className="pb-4 mb-6 border-b border-border">
                    <h2 className="text-xl font-normal font-heading text-body">{activeGroup.label}</h2>
                    {activeGroup.description && <p className="mt-1 text-sm text-body/60">{activeGroup.description}</p>}
                  </div>

                  <div className="space-y-8">
                    {activeGroup.configs.map((config) => {
                      const isChanged = changedKeys.has(config.key);

                      return (
                        <div key={config.id} className={`pl-4 border-l-2 duration-200 ${isChanged ? "border-l-primary" : "border-l-border"}`}>
                          <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <span className="flex items-center gap-2 admin-field-label">
                                {config.label}
                                {isChanged && <Badge className="bg-primary/15 text-primary">Edited</Badge>}
                              </span>
                              {config.description && <p className="mt-1 text-xs text-body/50">{config.description}</p>}
                            </div>

                            <div className="flex items-center gap-2 sm:shrink-0">
                              <span className="font-mono text-xs text-body/35">{config.key}</span>
                              <span title={config.isActive ? "Readable by the storefront" : "Hidden from the storefront"}>
                                {config.isActive ? <PiEye className="size-4 text-primary" /> : <PiEyeSlash className="size-4 text-body/30" />}
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
                <div className="flex items-center justify-center h-full text-sm text-body/45">Select a group to configure</div>
              )}
            </main>
          </Panel>
        </>
      )}
    </>
  );
};
