import { Modal } from "@/components/modal";

const sizeData = [
  { size: "XS", bust: "119", hips: "112" },
  { size: "S", bust: "123", hips: "116" },
  { size: "M", bust: "127", hips: "120" },
  { size: "L", bust: "131", hips: "124" },
  { size: "XL", bust: "135", hips: "128" },
  { size: "2XL", bust: "139", hips: "132" },
  { size: "3XL", bust: "143", hips: "136" },
];

export const MenModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <h4 className="mb-4 text-xl font-bold text-center sm:text-2xl sm:font-semibold md:text-3xl text-gray">Men&apos;s Size Guide</h4>
      <div className="max-w-2xl py-4 mx-auto bg-light">
        <div className="flex justify-center mb-6 text-center border-b border-gray sm:text-start">
          <p className="py-2 text-sm font-medium transition-colors border-b-2 border-transparent sm:px-4 text-gray">For Shirt & Everyday Wear</p>
        </div>

        <div className="mb-6 overflow-hidden text-xs border-2 rounded-lg border-gray sm:text-sm md:text-base">
          <table className="w-full">
            <thead>
              <tr className="bg-gray text-light">
                <th className="px-4 py-3 font-medium text-left border-r border-gray">Size Chart</th>
                <th className="px-4 py-3 font-medium text-left border-r border-gray">Size Bust (cm)</th>
                <th className="px-4 py-3 font-medium text-left">Hips (cm)</th>
              </tr>
            </thead>
            <tbody>
              {sizeData.map((row, index) => (
                <tr key={row.size} className={index % 2 === 0 ? "bg-gray/10" : "bg-light"}>
                  <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray">{row.size}</td>
                  <td className="px-4 py-3 border-r text-gray border-gray">{row.bust}</td>
                  <td className="px-4 py-3 text-gray">{row.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 sm:space-y-6 text-gray">
          <div className="text-xs font-bold sm:text-sm">
            <h3 className="text-sm font-bold sm:text-base">Note</h3>
            <ul className="pl-6 list-disc">
              <li>Please note a 1-2cm size variation from the guide.</li>
            </ul>
          </div>
          <p className="text-xs sm:text-sm">
            *Most of our garments follow a tailored silhouette. If you&apos;re between sizes or prefer a looser fit, we recommend sizing up. Many of our skirts include an adjustable or elastic
            waistband for comfort.
          </p>
          <div className="text-xs sm:text-sm">
            <h3 className="text-sm font-bold sm:text-base">How to Measure</h3>
            <p className="">No measuring tape? No problem. Here&apos;s a quick guide to help you get it right:</p>
            <ul className="pl-6 list-disc">
              <li>
                <span className="font-medium">Bust</span> - Measure around the fullest part of your chest.
              </li>
              <li>
                <span className="font-medium">Waist</span> - Measure at the narrowest part of your waist.
              </li>
              <li>
                <span className="font-medium">Hips</span> - Measure around the widest part of your hips.
              </li>
              <li>
                <span className="font-medium">Shoulders</span> - From edge to edge, across the back.
              </li>
              <li>
                <span className="font-medium">Arm Length</span> - From shoulder to wrist for long sleeves.
              </li>
              <li>
                <span className="font-medium">Skirt Length</span> - From waistline down to desired length.
              </li>
            </ul>
          </div>
          <p className="text-xs sm:text-sm text-gray">
            <span className="font-medium">Tip:</span> Keep the tape comfortably snug—not tight.
          </p>
        </div>
      </div>
    </Modal>
  );
};
