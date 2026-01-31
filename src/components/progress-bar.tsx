export const ProgressBar = ({ uploadProgress }: { uploadProgress: number }) => (
  <div className="flex items-center w-full gap-2 mb-2">
    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out text-gray/30" style={{ width: `${uploadProgress}%` }} />
    <div className="text-sm text-gray">{Math.round(uploadProgress)}%</div>
  </div>
);
