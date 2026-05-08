import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("ext_product_images")
    .select("id, resolution_type, position, public_url, created_at")
    .eq("product_code", code)
    .order("resolution_type") // high before low
    .order("position");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS }
    );
  }

  return NextResponse.json(
    { product_code: code, total: data.length, images: data },
    {
      status: 200,
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
