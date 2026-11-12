import { NextRequest, NextResponse } from "next/server";

import { checkAuth, errorMessage, getClientIp, logError, logRequest, logResponse } from "@/lib";
import { getTeamAccessSummary, saveTeamAccess } from "@/services";
import { TeamAccessSchema } from "@/types";

import { z } from "zod";

// GET - Current team sign-in (username only; the password hash never leaves the server)
export async function GET(request: NextRequest) {
  const pathAPI = "GET /team-access";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;

  const startTime = Date.now();
  try {
    logRequest(pathAPI, request, null, getClientIp(request));

    const data = await getTeamAccessSummary();

    logResponse(pathAPI, Date.now() - startTime, { data });
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - Change the team username and/or password. Changing either signs everyone out.
export async function PUT(request: NextRequest) {
  const pathAPI = "PUT /team-access";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;

  const startTime = Date.now();
  try {
    const body = await request.json();

    // The password is left out of the log.
    logRequest(pathAPI, request, { username: body?.username, passwordChanged: Boolean(body?.password) }, getClientIp(request));

    const data = TeamAccessSchema.parse(body);

    if (!data.password && !(await getTeamAccessSummary()).isConfigured) {
      return NextResponse.json({ success: false, message: "Set a password the first time" }, { status: 400 });
    }

    await saveTeamAccess(data);

    const message = data.password ? "Team sign-in updated. Everyone has been signed out." : "Team username updated. Everyone has been signed out.";

    logResponse(pathAPI, Date.now() - startTime, { message });
    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
