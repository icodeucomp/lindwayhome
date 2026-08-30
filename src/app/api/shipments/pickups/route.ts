import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { PaxelError, formatPickupDate, getShippingOrigin, listPickupsByDate } from "@/services";

import { checkAuth, errorMessage, logError, logResponse } from "@/lib";

import { PickupListQuerySchema } from "@/types";

/**
 * GET /shipments/pickups?date=YYYY-MM-DD — Get All Shipment By Pickup Date.
 *
 * The static `pickups` segment sits beside the dynamic `[airwaybill]` one; Next
 * resolves static segments first, so an airwaybill can never be mistaken for this
 * route.
 *
 * Omitting `date` means today, read in the store's timezone rather than the
 * server's — a UTC-hosted app would otherwise show tomorrow's pickups from 4pm WITA.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathAPI = `GET /shipments/pickups`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const origin = await getShippingOrigin();
    const requested = searchParams.get("date") ?? formatPickupDate(new Date(), origin.timeZone);

    const { date } = PickupListQuerySchema.parse({ date: requested });

    const data = await listPickupsByDate(date);

    logResponse(pathAPI, Date.now() - startTime, { message: `${data.shipments.length} pickup(s) on ${date}` });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    if (error instanceof PaxelError) {
      logError(`${pathAPI} paxel error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.userMessage }, { status: 502 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
