export const ProgressBar = ({ uploadProgress }: { uploadProgress: number }) => (
  <div className="flex items-center w-full gap-3">
    {/* v1 put the fill percentage on a bar with no track behind it, so it read as a
        floating stub rather than progress. The track is the missing half. */}
    <div className="flex-1 h-1 overflow-hidden rounded-full bg-muted">
      <div className="h-full duration-300 ease-out rounded-full bg-primary" style={{ width: `${uploadProgress}%` }} />
    </div>
    <div className="text-xs text-body/60 tabular-nums">{Math.round(uploadProgress)}%</div>
  </div>
);
