import { NextRequest, NextResponse } from "next/server";

import { logger, prisma } from "@/lib";

import { SelectOption } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const subDistrict = searchParams.get("sub_district");

    let result: SelectOption[] = [];

    switch (type) {
      case "provinces":
        // Get unique provinces
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

        // Get unique districts for a province
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

        // Get unique sub-districts for a province and district
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

        // Get unique villages for a province, district, and sub-district
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

    return NextResponse.json({
      success: true,
      data: result,
      message: "Success",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /register error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
