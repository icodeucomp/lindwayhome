import { useState } from "react";

import { Modal } from "@/components/modal";

// Type definitions
interface KebayaSizeData {
  size: string;
  bust: string;
  hips: string;
}

interface BatikSizeData {
  size: string;
  length: string;
  waist: string;
  bottomWidth: string;
}

type TabType = "kebaya" | "batik";

interface SizeDataMap {
  kebaya: KebayaSizeData[];
  batik: BatikSizeData[];
}

const sizeData: SizeDataMap = {
  kebaya: [
    { size: "XS", bust: "86", hips: "96" },
    { size: "S", bust: "90", hips: "100" },
    { size: "M", bust: "94", hips: "104" },
    { size: "L", bust: "98", hips: "108" },
    { size: "XL", bust: "102", hips: "112" },
    { size: "2XL", bust: "106", hips: "116" },
    { size: "3XL", bust: "110", hips: "120" },
  ],
  batik: [
    { size: "XS", length: "98", waist: "63", bottomWidth: "140" },
    { size: "S", length: "100", waist: "66", bottomWidth: "144" },
    { size: "M", length: "102", waist: "70", bottomWidth: "148" },
    { size: "L", length: "104", waist: "74", bottomWidth: "152" },
    { size: "XL", length: "106", waist: "78", bottomWidth: "156" },
    { size: "2XL", length: "108", waist: "82", bottomWidth: "160" },
    { size: "3XL", length: "110", waist: "86", bottomWidth: "164" },
  ],
};

export const WomenModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<TabType>("kebaya");

  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <h4 className="mb-4 text-xl font-bold text-center sm:text-2xl sm:font-semibold md:text-3xl text-gray">Women&apos;s Size Guide</h4>
      <div className="max-w-2xl py-4 mx-auto bg-light">
        <div className="flex justify-between mb-6 text-xs font-medium border-b border-gray sm:text-sm">
          <button
            onClick={() => setActiveTab("kebaya")}
            className={`px-4 py-2 flex-1 border-b-2 transition-colors ${activeTab === "kebaya" ? "border-gray text-gray" : "border-transparent text-dark"}`}
          >
            For Kebaya & Everyday Wear
          </button>
          <button onClick={() => setActiveTab("batik")} className={`px-4 py-2 flex-1 border-b-2 transition-colors ${activeTab === "batik" ? "border-gray text-gray" : "border-transparent text-dark"}`}>
            Batik Skirts
          </button>
        </div>

        <div className="mb-6 overflow-hidden text-xs border-2 rounded-lg border-gray sm:text-sm md:text-base">
          <table className="w-full">
            <thead>
              <tr className="bg-gray text-light">
                <th className="px-4 py-3 font-medium text-left border-r border-gray">Size Chart</th>
                {activeTab === "kebaya" ? (
                  <>
                    <th className="px-4 py-3 font-medium text-left border-r border-gray">Size Bust (cm)</th>
                    <th className="px-4 py-3 font-medium text-left">Hips (cm)</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium text-left border-r border-gray">Size Length (cm)</th>
                    <th className="px-4 py-3 font-medium text-left border-r border-gray">Waist (cm)</th>
                    <th className="px-4 py-3 font-medium text-left">Bottom Width (cm)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === "kebaya"
                ? sizeData.kebaya.map((row: KebayaSizeData, index: number) => (
                    <tr key={row.size} className={index % 2 === 0 ? "bg-gray/10" : "bg-light"}>
                      <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray">{row.size}</td>
                      <td className="px-4 py-3 border-r text-gray border-gray">{row.bust}</td>
                      <td className="px-4 py-3 text-gray">{row.hips}</td>
                    </tr>
                  ))
                : sizeData.batik.map((row: BatikSizeData, index: number) => (
                    <tr key={row.size} className={index % 2 === 0 ? "bg-gray/10" : "bg-light"}>
                      <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray">{row.size}</td>
                      <td className="px-4 py-3 border-r text-gray border-gray">{row.length}</td>
                      <td className="px-4 py-3 border-r text-gray border-gray">{row.waist}</td>
                      <td className="px-4 py-3 text-gray">{row.bottomWidth}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 sm:space-y-6 text-gray">
          {activeTab === "batik" && (
            <div className="text-xs font-bold sm:text-sm">
              <h3 className="text-sm font-bold sm:text-base">Note</h3>
              <ul className="pl-6 list-disc">
                <li>Please note a 1-2cm size variation from the guide.</li>
                <li>Skirt with an elastic waistband.</li>
              </ul>
            </div>
          )}
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
