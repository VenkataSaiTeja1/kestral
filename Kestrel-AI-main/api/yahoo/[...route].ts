export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  // pathname starts with /api/yahoo/...
  const subpath = url.pathname.replace(/^\/api\/yahoo/, "");

  let targetUrl = "";
  if (subpath.startsWith("/chart")) {
    targetUrl = `https://query1.finance.yahoo.com/v8/finance${subpath}${url.search}`;
  } else if (subpath.startsWith("/search")) {
    targetUrl = `https://query1.finance.yahoo.com/v1/finance${subpath}${url.search}`;
  } else {
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to proxy request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
