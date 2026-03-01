import { Pagination } from "@/components";
import { ApiResponse, Location } from "@/types";
import { FaEdit, FaMapPin, FaTrash } from "react-icons/fa";

interface LocationListsProps {
  locationsData: ApiResponse<Location[]> | undefined;
  isLoading: boolean;
  currentPage: number;
  handleEdit: (location: Location) => void;
  setDeleteConfirm: (locationId: string) => void;
  handlePageChange: (newPage: number) => void;
}

export const LocationLists = ({ locationsData, isLoading, currentPage, handleEdit, setDeleteConfirm, handlePageChange }: LocationListsProps) => {
  const locations = locationsData?.data || [];
  const pagination = locationsData?.pagination;
  return (
    <div className="bg-light rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-District</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Village</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinates</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-light divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center py-8">
                    <div className="loader"></div>
                  </div>
                  <p className="mt-2 text-gray-500">Loading locations...</p>
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FaMapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No locations found</p>
                </td>
              </tr>
            ) : (
              locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.province}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{location.district}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{location.sub_district}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{location.village}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      <span>Lat: {location.approx_lat.toFixed(6)}</span>
                      <span>Long: {location.approx_long.toFixed(6)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(location)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Edit">
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(location.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer" title="Delete">
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && locations.length > 0 && pagination && (
        <div className="bg-light px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
            </div>
            <Pagination page={currentPage} setPage={handlePageChange} totalPage={pagination.totalPages || 0} isNumber />
          </div>
        </div>
      )}
    </div>
  );
};
