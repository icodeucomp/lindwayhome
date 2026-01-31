import { Modal } from "@/components/modal";

const sizeData = [
  { size: "0000-NB", height: "56", weight: "1.5" },
  { size: "000 (0-3mo)", height: "62", weight: "3.5" },
  { size: "00 (3-6mo)", height: "68", weight: "5.5" },
  { size: "0 (6-12mo)", height: "76", weight: "6.5" },
  { size: "1yr", height: "78", weight: "9" },
  { size: "2yrs", height: "92", weight: "12" },
  { size: "3yrs", height: "95", weight: "14" },
  { size: "4yrs", height: "100", weight: "16" },
  { size: "5yrs", height: "112", weight: "18" },
  { size: "6yrs", height: "115", weight: "20" },
  { size: "7yrs", height: "122", weight: "22" },
  { size: "8yrs", height: "128", weight: "25" },
  { size: "9yrs", height: "133", weight: "29" },
  { size: "10yrs", height: "138", weight: "33" },
  { size: "11yrs", height: "144", weight: "37" },
  { size: "12yrs", height: "152", weight: "41" },
];

export const BabyModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <h4 className="mb-4 text-xl font-bold text-center sm:text-2xl sm:font-semibold md:text-3xl text-gray">Baby and Kids Size Guide</h4>
      <div className="max-w-2xl py-4 mx-auto space-y-6 bg-light">
        <div className="flex justify-center mb-6 text-center border-b border-gray sm:text-start">
          <p className="py-2 text-sm font-medium transition-colors border-b-2 border-transparent sm:px-4 text-gray">Soft, breathable cotton tees designed for our littlest customers</p>
        </div>

        <div className="mb-6 overflow-hidden text-xs border-2 rounded-lg border-gray sm:text-sm md:text-base">
          <table className="w-full">
            <thead>
              <tr className="bg-gray text-light">
                <th className="px-4 py-3 font-medium text-left border-r border-gray">Size/Age</th>
                <th className="px-4 py-3 font-medium text-left border-r border-gray">Height (cm)</th>
                <th className="px-4 py-3 font-medium text-left">Weight (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {sizeData.map((row, index) => (
                <tr key={row.size} className={index % 2 === 0 ? "bg-gray/10" : "bg-light"}>
                  <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray">{row.size}</td>
                  <td className="px-4 py-3 border-r text-gray border-gray">{row.height}</td>
                  <td className="px-4 py-3 text-gray">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-bold text-gray">Note</h3>
          <ul className="pl-6 text-sm list-disc text-gray">
            <li>Please note a 1-2cm size variation from the guide.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
