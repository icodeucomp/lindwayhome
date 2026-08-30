import { NextRequest, NextResponse } from "next/server";

import { PaxelError, refreshTracking } from "@/services";

import { checkAuth, errorMessage, logError, logResponse, prisma } from "@/lib";

import { paxelStatusLabel } from "@/types/paxel";

/**
 * GET /shipments/:airwaybill — Track a Shipment Status.
 *
 * Pulls the live status from Paxel and folds it into our `Shipment` row, so the
 * admin screen and the database never disagree about where a parcel is.
 *
 * There is no webhook receiver: Paxel publishes one, but it needs a public URL
 * registered with them, which cannot be set up before the account exists. Pull-on-
 * demand is the correct shape until then, and adding the webhook later only makes
 * this cheaper — it does not replace it, since an admin will always want a refresh
 * button that answers now.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ airwaybill: string }> }) {
  const { airwaybill } = await params;
  const pathAPI = `GET /shipments/${airwaybill}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const existing = await prisma.shipment.findUnique({ where: { airwaybillCode: airwaybill }, select: { id: true } });

    if (!existing) {
      return NextResponse.json({ success: false, message: "No shipment recorded for that airwaybill." }, { status: 404 });
    }

    const { shipment, tracked } = await refreshTracking(airwaybill);

    logResponse(pathAPI, Date.now() - startTime, { message: `Tracking refreshed: ${shipment.latestStatus}` });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...shipment,
          shippingCost: shipment.shippingCost.toNumber(),
          statusLabel: paxelStatusLabel(shipment.latestStatus),
          // The untouched courier payload, so an admin can see everything Paxel
          // said rather than only the fields we chose to store.
          raw: tracked,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PaxelError) {
      logError(`${pathAPI} paxel error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.userMessage }, { status: 502 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
