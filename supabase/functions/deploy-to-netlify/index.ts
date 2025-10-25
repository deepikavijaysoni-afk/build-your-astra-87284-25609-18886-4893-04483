import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { htmlContent, siteName } = await req.json();

    if (!htmlContent) {
      throw new Error("HTML content is required");
    }

    console.log("Deploying to Netlify:", { siteName, contentLength: htmlContent.length });

    const netlifyToken = Deno.env.get("NETLIFY_ACCESS_TOKEN");
    if (!netlifyToken) {
      throw new Error("Netlify access token not configured");
    }

    // Create ZIP file manually using Uint8Array
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlContent);
    
    // Create a simple ZIP file structure
    // ZIP format: Local File Header + File Data + Central Directory + End of Central Directory
    const filename = "index.html";
    const filenameBytes = encoder.encode(filename);
    
    // Local File Header
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    localHeader.set([0x50, 0x4b, 0x03, 0x04]); // Local file header signature
    localHeader.set([0x0a, 0x00], 4); // Version needed to extract
    localHeader.set([0x00, 0x00], 6); // General purpose bit flag
    localHeader.set([0x00, 0x00], 8); // Compression method (0 = no compression)
    localHeader.set([0x00, 0x00], 10); // Last mod file time
    localHeader.set([0x00, 0x00], 12); // Last mod file date
    
    // CRC-32 (we'll use 0 for uncompressed)
    const crc32 = 0;
    localHeader.set([crc32 & 0xff, (crc32 >> 8) & 0xff, (crc32 >> 16) & 0xff, (crc32 >> 24) & 0xff], 14);
    
    // Compressed size
    localHeader.set([htmlBytes.length & 0xff, (htmlBytes.length >> 8) & 0xff, (htmlBytes.length >> 16) & 0xff, (htmlBytes.length >> 24) & 0xff], 18);
    
    // Uncompressed size
    localHeader.set([htmlBytes.length & 0xff, (htmlBytes.length >> 8) & 0xff, (htmlBytes.length >> 16) & 0xff, (htmlBytes.length >> 24) & 0xff], 22);
    
    // Filename length
    localHeader.set([filenameBytes.length & 0xff, (filenameBytes.length >> 8) & 0xff], 26);
    
    // Extra field length
    localHeader.set([0x00, 0x00], 28);
    
    // Filename
    localHeader.set(filenameBytes, 30);
    
    // Central Directory Header
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    centralHeader.set([0x50, 0x4b, 0x01, 0x02]); // Central directory file header signature
    centralHeader.set([0x0a, 0x00], 4); // Version made by
    centralHeader.set([0x0a, 0x00], 6); // Version needed to extract
    centralHeader.set([0x00, 0x00], 8); // General purpose bit flag
    centralHeader.set([0x00, 0x00], 10); // Compression method
    centralHeader.set([0x00, 0x00], 12); // Last mod file time
    centralHeader.set([0x00, 0x00], 14); // Last mod file date
    
    // CRC-32
    centralHeader.set([crc32 & 0xff, (crc32 >> 8) & 0xff, (crc32 >> 16) & 0xff, (crc32 >> 24) & 0xff], 16);
    
    // Compressed size
    centralHeader.set([htmlBytes.length & 0xff, (htmlBytes.length >> 8) & 0xff, (htmlBytes.length >> 16) & 0xff, (htmlBytes.length >> 24) & 0xff], 20);
    
    // Uncompressed size
    centralHeader.set([htmlBytes.length & 0xff, (htmlBytes.length >> 8) & 0xff, (htmlBytes.length >> 16) & 0xff, (htmlBytes.length >> 24) & 0xff], 24);
    
    // Filename length
    centralHeader.set([filenameBytes.length & 0xff, (filenameBytes.length >> 8) & 0xff], 28);
    
    // Extra field length, File comment length, Disk number start
    centralHeader.set([0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 30);
    
    // Internal file attributes
    centralHeader.set([0x00, 0x00], 36);
    
    // External file attributes
    centralHeader.set([0x00, 0x00, 0x00, 0x00], 38);
    
    // Relative offset of local header
    centralHeader.set([0x00, 0x00, 0x00, 0x00], 42);
    
    // Filename
    centralHeader.set(filenameBytes, 46);
    
    const centralDirOffset = localHeader.length + htmlBytes.length;
    
    // End of Central Directory Record
    const endRecord = new Uint8Array(22);
    endRecord.set([0x50, 0x4b, 0x05, 0x06]); // End of central dir signature
    endRecord.set([0x00, 0x00], 4); // Number of this disk
    endRecord.set([0x00, 0x00], 6); // Disk where central directory starts
    endRecord.set([0x01, 0x00], 8); // Number of central directory records on this disk
    endRecord.set([0x01, 0x00], 10); // Total number of central directory records
    
    // Size of central directory
    endRecord.set([centralHeader.length & 0xff, (centralHeader.length >> 8) & 0xff, (centralHeader.length >> 16) & 0xff, (centralHeader.length >> 24) & 0xff], 12);
    
    // Offset of start of central directory
    endRecord.set([centralDirOffset & 0xff, (centralDirOffset >> 8) & 0xff, (centralDirOffset >> 16) & 0xff, (centralDirOffset >> 24) & 0xff], 16);
    
    // ZIP file comment length
    endRecord.set([0x00, 0x00], 20);
    
    // Combine all parts
    const zipBytes = new Uint8Array(localHeader.length + htmlBytes.length + centralHeader.length + endRecord.length);
    let offset = 0;
    zipBytes.set(localHeader, offset);
    offset += localHeader.length;
    zipBytes.set(htmlBytes, offset);
    offset += htmlBytes.length;
    zipBytes.set(centralHeader, offset);
    offset += centralHeader.length;
    zipBytes.set(endRecord, offset);

    console.log("ZIP file created, size:", zipBytes.length);

    // Step 1: Create a new site on Netlify
    const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: siteName || `astra-app-${Date.now()}`,
      }),
    });

    if (!createSiteResponse.ok) {
      const errorText = await createSiteResponse.text();
      console.error("Failed to create site:", errorText);
      throw new Error(`Failed to create site: ${createSiteResponse.status} - ${errorText}`);
    }

    const siteData = await createSiteResponse.json();
    const siteId = siteData.id;
    console.log("Site created:", siteId);

    // Step 2: Deploy the ZIP file to the site
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${netlifyToken}`,
        "Content-Type": "application/zip",
      },
      body: zipBytes,
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error("Failed to deploy:", errorText);
      throw new Error(`Failed to deploy: ${deployResponse.status} - ${errorText}`);
    }

    const deployData = await deployResponse.json();
    console.log("Deploy initiated:", deployData.id);

    // Step 3: Wait for deployment to be ready (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    let deployStatus = deployData.state;

    while (attempts < maxAttempts && deployStatus !== "ready") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployData.id}`,
        {
          headers: {
            "Authorization": `Bearer ${netlifyToken}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        deployStatus = statusData.state;
        console.log("Deploy status:", deployStatus);

        if (deployStatus === "error") {
          throw new Error("Deployment failed on Netlify");
        }

        if (deployStatus === "ready") {
          break;
        }
      }

      attempts++;
    }

    if (deployStatus !== "ready") {
      console.log("Deployment timeout, but site may still be deploying");
    }

    const siteUrl = siteData.ssl_url || siteData.url;
    console.log("Deployment successful:", siteUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: siteUrl,
        siteId: siteData.id,
        siteName: siteData.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in deploy-to-netlify function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
