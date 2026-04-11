import { NextRequest, NextResponse } from "next/server";

import { logError, prisma } from "@/lib";

import { SelectOption } from "@/types";

// GET - Fetch all locations within a specific province, district, or sub-district
export async function GET(request: NextRequest) {
  const pathAPI = "GET /locations/checkout";
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const subDistrict = searchParams.get("sub_district");

    let result: SelectOption[] = [];

    switch (type) {
      case "provinces":
        const provinces = await prisma.location.findMany({
          select: {
            province: true,
          },
          distinct: ["province"],
          orderBy: {
            province: "asc",
          },
        });
        result = provinces.filter((p) => p.province).map((p) => ({ label: p.province, value: p.province }));
        break;

      case "districts":
        if (!province) {
          return NextResponse.json({ success: false, message: "Province parameter is required" }, { status: 400 });
        }

        const districts = await prisma.location.findMany({
          where: {
            province: province,
          },
          select: {
            district: true,
          },
          distinct: ["district"],
          orderBy: {
            district: "asc",
          },
        });
        result = districts.filter((d) => d.district).map((d) => ({ label: d.district, value: d.district }));
        break;

      case "sub_districts":
        if (!province || !district) {
          return NextResponse.json({ success: false, message: "Province and district parameters are required" }, { status: 400 });
        }

        const subDistricts = await prisma.location.findMany({
          where: {
            province: province,
            district: district,
          },
          select: {
            sub_district: true,
          },
          distinct: ["sub_district"],
          orderBy: {
            sub_district: "asc",
          },
        });
        result = subDistricts.filter((sd) => sd.sub_district).map((sd) => ({ label: sd.sub_district, value: sd.sub_district }));
        break;

      case "villages":
        if (!province || !district || !subDistrict) {
          return NextResponse.json({ success: false, message: "Province, district, and sub_district parameters are required" }, { status: 400 });
        }

        const villages = await prisma.location.findMany({
          where: {
            province: province,
            district: district,
            sub_district: subDistrict,
          },
          select: {
            village: true,
          },
          distinct: ["village"],
          orderBy: {
            village: "asc",
          },
        });
        result = villages.filter((v) => v.village).map((v) => ({ label: v.village, value: v.village }));
        break;

      default:
        return NextResponse.json({ success: false, message: "Invalid type parameter. Use: provinces, districts, sub_districts, or villages" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Success", data: result });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
