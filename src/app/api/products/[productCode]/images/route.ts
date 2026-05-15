import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  const { productCode } = await params;
  const code = decodeURIComponent(productCode).trim();

  if (!code) {
    return NextResponse.json(
      { error: "product_code is required" },
      { status: 400, headers: CORS }
    );
  }

  // Optional quality filter — "high" | "low"; omit to return all
  const quality = req.nextUrl.searchParams.get("quality");
  if (quality !== null && quality !== "high" && quality !== "low") {
    return NextResponse.json(
      { error: 'quality must be "high" or "low"' },
      { status: 400, headers: CORS }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Optional API key validation — if header present, validate it
  const apiKey = req.headers.get("X-API-Key");
  if (apiKey) {
    const { data: keyRow } = await supabase
      .from("ext_api_keys")
      .select("user_id, last_used_at")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (!keyRow) {
      return NextResponse.json(
        { error: "Invalid API key." },
        { status: 401, headers: CORS }
      );
    }

    // Update last_used_at without blocking the response
    supabase
      .from("ext_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("api_key", apiKey)
      .then(() => {});
  }

  let query = supabase
    .from("ext_product_images")
    .select("id, resolution_type, position, public_url, created_at")
    .eq("product_code", code)
    .is("deleted_at", null)
    .order("resolution_type")
    .order("position");

  // When quality is specified, include only that resolution plus manuals
  if (quality) {
    query = query.or(`resolution_type.eq.${quality},resolution_type.eq.manual`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS }
    );
  }

  const images  = data.filter((r) => r.resolution_type !== "manual");
  const manuals = data.filter((r) => r.resolution_type === "manual");

  return NextResponse.json(
    {
      product_code: code,
      quality: quality ?? "all",
      total: images.length,
      images,
      manuals,
    },
    {
      status: 200,
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
