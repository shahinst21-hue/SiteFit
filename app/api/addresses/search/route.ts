import { addressRoute } from "@/lib/addresses/routes";
export const runtime = "nodejs";
export async function POST(request: Request) { return addressRoute(request, "search"); }
