import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestAccountDeletion } from "@/lib/pdpa";
import { catchAsync } from "@/lib/errors";

export const POST = catchAsync(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deletionDate, gracePeriodDays } = await requestAccountDeletion(user.id);

  return NextResponse.json({
    message: "Account deletion requested",
    deletionDate,
    gracePeriodDays,
    note: `Your account has been deactivated and will be permanently deleted on ${deletionDate.toLocaleDateString()}. You can cancel this request within the grace period.`,
  });
});
