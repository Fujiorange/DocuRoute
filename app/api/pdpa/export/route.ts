import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportUserData, exportUserDataCSV } from "@/lib/pdpa";
import { catchAsync } from "@/lib/errors";

export const GET = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  if (format === "csv") {
    const csv = await exportUserDataCSV(user.id);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="docuroute-data-export-${Date.now()}.csv"`,
      },
    });
  }

  const data = await exportUserData(user.id);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="docuroute-data-export-${Date.now()}.json"`,
    },
  });
});
