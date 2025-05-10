# Implementing Cloudflare CDN for Supabase Storage Videos

## 1. Introduction
The goal of this guide is to optimize the delivery of course videos, currently hosted in Supabase Storage, by integrating Cloudflare's Content Delivery Network (CDN). This will improve video streaming performance for your users.

**Benefits:**
-   **Faster Load Times:** Videos will be cached on Cloudflare's global network of edge servers, closer to your users, reducing latency.
-   **Reduced Origin Load:** Less traffic will hit your Supabase Storage directly, potentially lowering costs and improving resilience.
-   **Improved User Experience:** Smoother video playback and quicker start times.
-   **Bandwidth Savings:** Cloudflare caches content, reducing bandwidth consumption from your origin (Supabase).

## 2. Prerequisites
-   An active Supabase project with your MP4 course videos already uploaded to a Supabase Storage bucket.
-   An active Cloudflare account. You can start with the free plan.
-   A custom domain name (e.g., `yourplatform.com`) that you control and can update DNS records for.
-   Access to your application's codebase to update video URLs.

## 3. Part 1: Supabase Storage Configuration (Review)

Before setting up Cloudflare, ensure your Supabase Storage is configured appropriately.

### 3.1. Video Storage
-   Confirm that your videos are stored in a specific Supabase Storage bucket (e.g., `course-videos`).

### 3.2. Bucket Access Level
-   For the simplest CDN integration with Cloudflare caching "everything," your Supabase Storage bucket containing the videos should be **Public**.
    -   Public URLs for Supabase Storage objects typically look like: `https://<your-project-ref>.supabase.co/storage/v1/object/public/<your-bucket-name>/<video-file.mp4>`
-   **To make a bucket public (if not already):**
    1.  Go to your Supabase Project Dashboard.
    2.  Navigate to "Storage" from the sidebar.
    3.  Select your video bucket.
    4.  Click on "Bucket settings".
    5.  If it's not public, you might need to edit its policies or toggle its public access setting. Typically, creating a bucket with "Public access" enabled is the easiest.
    ```sql
    -- Example policy for public read access (Apply in Supabase SQL Editor if needed, or manage through UI)
    -- This is generally handled by making the bucket "Public" in the UI.
    -- For granular control:
    -- CREATE POLICY "Public read access for videos"
    -- ON storage.objects FOR SELECT
    -- USING ( bucket_id = 'course-videos' ); -- Replace 'course-videos' with your bucket name
    ```
    *Caution: Ensure only intended files are in a public bucket.*

### 3.3. CORS Configuration
-   Cross-Origin Resource Sharing (CORS) must be configured on your Supabase Storage bucket to allow your Cloudflare domain (e.g., `videos.yourplatform.com`) to request the video files.
-   Supabase typically has permissive CORS settings for public buckets by default.
-   **To check/configure CORS in Supabase Dashboard:**
    1.  Storage -> Select your bucket.
    2.  Look for CORS settings or bucket policies.
    3.  Ensure `GET` requests are allowed from your Cloudflare domain or `*` (wildcard).
    ```json
    // Example CORS rule (often managed via Supabase UI under Bucket Settings > CORS Configuration)
    // [
    //   {
    //     "allowedOrigins": ["https://videos.yourplatform.com", "https://yourplatform.com"],
    //     "allowedMethods": ["GET", "HEAD"],
    //     "allowedHeaders": ["content-type", "x-upsert"],
    //     "exposeHeaders": [],
    //     "maxAgeSeconds": 300
    //   }
    // ]
    ```
    If you're using a wildcard `*` for allowed origins on a public bucket, this is usually sufficient.

## 4. Part 2: Cloudflare Setup and Configuration

This section details the steps to perform in your Cloudflare dashboard.

### 4.1. Add Your Domain to Cloudflare
1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2.  On the home page, click the **"+ Add a Site"** button.
3.  Enter your root domain name (e.g., `yourplatform.com`) and click **"Add site"**.
4.  Select a plan. The **Free plan** is sufficient for CDN services. Click **"Continue"**.
5.  Cloudflare will scan your domain's existing DNS records. Review these for accuracy. If you have existing records for your main site, they should ideally be imported. Click **"Continue"**.
6.  Cloudflare will then display two Cloudflare nameservers (e.g., `sue.ns.cloudflare.com` and `tom.ns.cloudflare.com`). You **must** go to your domain registrar (where you purchased your domain, e.g., GoDaddy, Namecheap) and replace your current nameservers with the ones provided by Cloudflare.
    -   This change can take anywhere from a few minutes to 48 hours to propagate globally, though it's often much quicker.
7.  Once you've updated the nameservers at your registrar, return to the Cloudflare setup page and click **"Done, check nameservers"**. Cloudflare will periodically check for the nameserver update. You will receive an email when your site is active on Cloudflare.

### 4.2. Create a CNAME Record for Video Delivery
Once your domain is active on Cloudflare:
1.  In the Cloudflare dashboard, select your active domain.
2.  Navigate to the **"DNS"** > **"Records"** section from the left sidebar.
3.  Click **"Add record"**.
4.  Configure the CNAME record as follows:
    -   **Type:** `CNAME`
    -   **Name:** `videos` (This will create the subdomain `videos.yourplatform.com`. You can choose another name like `cdn-media`, `stream`, etc.)
    -   **Target:** Your Supabase project's storage hostname. This is the part of your Supabase URL *without* `https://` or any path. It looks like `<your-project-ref>.supabase.co`.
        -   **Example:** If your Supabase storage URL is `https://xyzabcdef.supabase.co/storage/v1/...`, the target is `xyzabcdef.supabase.co`.
        -   **CRITICAL:** Do *not* include `https://` or `/storage/v1/...` in the Target field.
    -   **Proxy status:** Ensure this is **Proxied** (it will show an orange cloud icon). This is essential for Cloudflare's CDN and other features to apply.
    -   **TTL (Time To Live):** `Auto` is generally fine.
5.  Click **"Save"**.

### 4.3. Optimize Caching with Page Rules
Page Rules allow you to define specific settings for certain URL patterns.
1.  In the Cloudflare dashboard for your domain, navigate to **"Rules"** > **"Page Rules"** from the left sidebar.
2.  Click **"Create Page Rule"**. (Free plans typically come with 3 Page Rules).
3.  **If the URL matches:**
    -   Enter the URL pattern for your video content that will be served via the new `videos` subdomain.
    -   Pattern: `videos.yourplatform.com/storage/v1/object/public/<your-bucket-name>/*`
        -   Replace `videos.yourplatform.com` with your chosen subdomain if different.
        -   Replace `<your-bucket-name>` with the actual name of your Supabase Storage bucket (e.g., `course-videos`).
        -   The `*` at the end is a wildcard, meaning it will match all files within that path.
4.  **Then the settings are:** (Click "Add a Setting" for each)
    -   **Setting 1: Cache Level**
        -   Select: `Cache Everything`
        -   *Reason: This rule tells Cloudflare to cache all content matching the pattern, including video files, regardless of what headers Supabase might send.*
    -   **Setting 2: Edge Cache TTL**
        -   Select: A long duration, for example, `7 days` or `a month`.
        -   *Reason: Video files usually don't change frequently. A longer Edge Cache TTL means Cloudflare keeps the file in its cache longer, improving hit rates.*
    -   **Setting 3: Browser Cache TTL**
        -   Select: An appropriate duration, for example, `1 day` or `4 hours`.
        -   *Reason: This tells the user's browser how long to cache the video. Setting this avoids browsers re-requesting the video too frequently from Cloudflare if the user revisits or replays.*
    -   **(Optional) Setting 4: Origin Cache Control**
        -   Select: `On` or `Off`.
        -   If `On`, Cloudflare will respect `Cache-Control` and `Expires` headers from Supabase for how long to cache *at the edge* before revalidating. However, `Cache Everything` and `Edge Cache TTL` usually take precedence.
        -   If `Off`, Cloudflare will ignore origin cache headers and rely solely on the `Edge Cache TTL` you set. For aggressively caching static assets like videos, `Off` can be more straightforward if you want to solely manage cache duration via Cloudflare.
        -   *Recommendation: Start with it `On`. If Supabase doesn't send ideal cache headers for videos, you can turn this `Off` or adjust Supabase's storage object metadata.*
5.  Click **"Save and Deploy Page Rule"**. Ensure the rule is enabled.

### 4.4. (Optional) Review Global Caching and SSL/TLS Settings
-   **Caching > Configuration:**
    -   **Caching Level:** `Standard` is typical. Your Page Rule will override this for the video path.
    -   **Browser Cache TTL:** `Respect Existing Headers` is a common global default. Again, your Page Rule takes precedence.
-   **SSL/TLS > Overview:**
    -   Ensure your SSL/TLS encryption mode is set to **Full** or **Full (strict)**.
        -   `Full` encrypts between the browser and Cloudflare, and between Cloudflare and your origin (Supabase). Supabase supports HTTPS, so this is good.
        -   `Full (strict)` additionally requires a trusted CA certificate on the origin. Supabase uses trusted certs.
        -   Do **not** use `Flexible`, as it means traffic between Cloudflare and Supabase would be unencrypted.
-   **SSL/TLS > Edge Certificates:**
    -   Ensure "Always Use HTTPS" is **On**. This will redirect any HTTP requests for your videos to HTTPS.

## 5. Part 3: Update Your Application
Now, you need to modify your application to serve videos using the new Cloudflare CDN URLs.

1.  Identify where your application constructs or references the URLs for Supabase Storage videos. This will likely be in your frontend code (e.g., Next.js components or services).
2.  Change the base URL from the direct Supabase Storage domain to your new Cloudflare-proxied domain.

    -   **Old URL structure:**
        `https://<your-project-ref>.supabase.co/storage/v1/object/public/<your-bucket-name>/<video-file.mp4>`
    -   **New URL structure:**
        `https://videos.yourplatform.com/storage/v1/object/public/<your-bucket-name>/<video-file.mp4>`

    The key change is replacing `https://<your-project-ref>.supabase.co` with `https://videos.yourplatform.com`. The rest of the path (`/storage/v1/object/public/<your-bucket-name>/<video-file.mp4>`) remains identical.

    **Example (JavaScript/TypeScript):**
    ```javascript
    // const supabaseProjectRef = 'your-project-ref';
    // const bucketName = 'course-videos';
    // const videoFileName = 'lesson1.mp4';

    // Old URL
    // const videoUrl = `https://<span class="triple-backtick-replacement">${supabaseProjectRef}</span>.supabase.co/storage/v1/object/public/<span class="triple-backtick-replacement">${bucketName}</span>/<span class="triple-backtick-replacement">${videoFileName}</span>`;

    // New URL
    const cdnDomain = 'videos.yourplatform.com'; // Or your chosen subdomain
    const videoUrl = `https://<span class="triple-backtick-replacement">${cdnDomain}</span>/storage/v1/object/public/<span class="triple-backtick-replacement">${bucketName}</span>/<span class="triple-backtick-replacement">${videoFileName}</span>`;
    ```

3.  Deploy your application changes.

## 6. Part 4: Testing and Verification
Thorough testing is crucial to ensure the CDN is working correctly.

1.  **Clear Browser Cache:** Clear your browser's cache and cookies, or use an incognito/private browsing window to ensure you're not testing with locally cached files.
2.  **Load Pages with Videos:** Access the pages in your application that contain the videos.
3.  **Verify Video Playback:** Ensure videos load and play smoothly. Test seeking (jumping to different parts of the video) as Cloudflare supports byte-range requests, which are necessary for this.
4.  **Inspect Network Requests:**
    -   Open your browser's Developer Tools (usually by pressing F12).
    -   Go to the "Network" tab.
    -   Filter requests if necessary (e.g., by "Media" or by typing part of the video file name).
    -   Load a page with a video. Click on the video file request in the Network tab.
    -   Examine the **Response Headers**:
        -   `Server`: Should indicate `cloudflare`.
        -   `CF-Cache-Status`: This is key!
            -   **`MISS`**: The first time Cloudflare requests the file from Supabase for a specific edge location.
            -   **`HIT`**: On subsequent requests (or requests from other users near that same Cloudflare edge), this indicates the video was served from Cloudflare's cache. This is your goal!
            -   **`REVALIDATED`**: Cloudflare checked with Supabase if the file changed and confirmed it hasn't.
            -   **`DYNAMIC`**: Should not occur for these assets with your Page Rule.
            -   **`UPDATING`**, **`EXPIRED`**: Other states indicating cache management.
        -   `Age`: Shows (in seconds) how long the object has been in Cloudflare's cache at that edge location.
        -   `cf-ray`: A unique ID for the request through Cloudflare, helpful for debugging with Cloudflare support.
5.  **Test from Different Locations/Networks (Optional):** If possible, test from a different network or use online tools that can request URLs from various locations to see the CDN in action globally.
6.  **Check Cloudflare Analytics:**
    -   In the Cloudflare dashboard, go to **"Analytics & Logs"**.
    -   You can see data on requests, bandwidth served by Cloudflare vs. origin, cache hit ratio, etc. Filter by your `videos.yourplatform.com` hostname if possible. This will give you insights into how effective the CDN caching is.

## 7. Part 5: Maintenance and Advanced Topics

### 7.1. Cache Purging
-   If you update a video file in Supabase Storage by overwriting it with a new version *using the same filename*, Cloudflare's cache will still hold the old version until the Edge Cache TTL expires.
-   To force Cloudflare to fetch the new version immediately, you must purge the cache.
-   **How to Purge:**
    1.  In Cloudflare Dashboard: "Caching" > "Configuration".
    2.  Click **"Purge Cache"**.
    3.  Select **"Custom Purge"**.
    4.  Enter the full URL(s) of the video(s) you updated (e.g., `https://videos.yourplatform.com/storage/v1/object/public/<your-bucket-name>/<updated-video.mp4>`). You can purge multiple URLs at once.
    5.  Click **"Purge"**.
    -   Avoid using "Purge Everything" unless absolutely necessary, as it clears all cached content for your entire domain and can temporarily increase load on your origin.

### 7.2. Using Signed URLs with Supabase Storage (Advanced)
-   If your Supabase bucket is **private** and you use signed URLs for video access, direct CDN caching as described (with "Cache Everything") becomes problematic. Signed URLs are unique and often short-lived, making them difficult for a CDN to cache effectively.
-   Solutions for private content involve more complex setups, such as:
    -   Cloudflare Workers to validate tokens or sign requests.
    -   Cloudflare Access policies.
    -   Short-lived signed URLs from Supabase with shorter CDN cache times, potentially caching based on a path prefix if the signature part can be ignored by the cache key (requires advanced Cloudflare settings like "Cache Key" modifications).
-   *The plan above assumes a public Supabase bucket for simplest video CDN integration.*

### 7.3. Cloudflare Stream
-   For more advanced video requirements like adaptive bitrate streaming (HLS/DASH), on-the-fly transcoding, video analytics, and a dedicated player, Cloudflare offers **Cloudflare Stream**.
-   This is a separate product where you upload videos directly to Cloudflare. It's more powerful for video-specific needs but differs from simply CDN-enabling existing Supabase Storage.

### 7.4. Monitoring and Optimization
-   Regularly check Cloudflare Analytics for your video subdomain to monitor:
    -   Cache Hit Ratio: Aim for a high ratio.
    -   Bandwidth Saved: See how much data Cloudflare is serving on your behalf.
    -   Geographic distribution of requests.
-   Adjust Page Rules (e.g., Edge Cache TTL) based on observed patterns and how frequently your video content changes.

## 8. Local Testing and Integration with Existing Codebase

### 8.1. Local Testing Considerations

When testing your Cloudflare CDN integration locally before deploying to Vercel, there are some important limitations to be aware of:

#### What you CAN test locally:

1.  **URL Generation Logic:** You can run your local Next.js development server (`pnpm run dev`) and verify that your frontend code correctly constructs the new Cloudflare CDN URLs.
2.  **Supabase CORS Configuration:** Ensure your Supabase Storage bucket CORS settings allow requests from your local development environment.

#### What you CANNOT fully test locally:

1.  **Actual CDN Caching:** The Cloudflare caching behavior (`CF-Cache-Status: HIT`) relies on DNS routing through Cloudflare's network. Local requests won't go through Cloudflare's edge network.
2.  **Page Rules & Edge TTL:** Cloudflare's page rules only apply when traffic is actually routed through Cloudflare.
3.  **Analytics:** Local traffic won't appear in your Cloudflare analytics dashboard.

#### Local Testing Steps:

1.  **Update Application Code:** Modify your Next.js components to use the CDN URL format.
2.  **Update Supabase CORS:** Add your local development URL (e.g., `http://localhost:3000`) to allowed origins.
    ```json
    [
      "https://yourplatform.com",
      "https://videos.yourplatform.com",
      "http://localhost:3000" 
    ]
    ```
3.  **Test with Vercel Preview URLs:** Deploy to a Vercel preview environment (which Vercel creates for pull requests) for a more complete test with actual Cloudflare CDN integration, before going to production.

### 8.2. Integration with Existing Project Code

Based on your project's codebase, here's how to integrate Cloudflare CDN with your existing video handling logic:

#### 1. File Structure Analysis

Your project already has several components for handling video uploads and storage:

- **Upload Component:** `components/modules/video-uploader.tsx`
- **Upload API Endpoint:** `app/api/admin/storage/upload/route.ts`
- **Storage Helpers:** `lib/supabase/upload-helpers.ts`

#### 2. Integration Points

1. **Create a CDN URL Generator Function**

   Add a new utility function in `lib/supabase/upload-helpers.ts`:

   ```typescript
   /**
    * Returns a CDN URL for a given Supabase Storage URL
    * @param supabaseUrl The original Supabase Storage URL
    * @returns The CDN URL for the same resource
    */
   export function getCdnUrl(supabaseUrl: string): string {
     // In production, convert Supabase URLs to Cloudflare CDN URLs
     if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VIDEO_CDN_DOMAIN) {
       const cdnDomain = process.env.NEXT_PUBLIC_VIDEO_CDN_DOMAIN; // e.g. "videos.yourplatform.com"
       const supabaseDomain = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '');
       
       if (supabaseDomain && supabaseUrl.includes(supabaseDomain)) {
         return supabaseUrl.replace(
           `https://${supabaseDomain}`, 
           `https://${cdnDomain}`
         );
       }
     }
     
     // In development or if CDN is not configured, return the original URL
     return supabaseUrl;
   }
   ```

2. **Modify the Upload API Response**

   Update `app/api/admin/storage/upload/route.ts` to include the CDN URL in the response:

   ```typescript
   // In the POST handler, after generating the publicUrl:
   import { getCdnUrl } from '@/lib/supabase/upload-helpers';

   // Existing code:
   const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
   const publicUrl = urlData?.publicUrl;
   
   // Add this:
   const cdnUrl = publicUrl ? getCdnUrl(publicUrl) : null;
   
   // And then in the response JSON:
   return NextResponse.json({
     message: 'File uploaded successfully.',
     path: uploadData.path,
     fullPath: fullPath,
     publicUrl: publicUrl,
     cdnUrl: cdnUrl  // Add the CDN URL to the response
   });
   ```

3. **Add Environment Variables**

   Add the new environment variable to your `.env` files:

   ```
   # .env.local (for development)
   NEXT_PUBLIC_VIDEO_CDN_DOMAIN=

   # .env.production (for production)
   NEXT_PUBLIC_VIDEO_CDN_DOMAIN=videos.yourplatform.com
   ```

4. **Update Video Components**

   Modify any component that displays videos to prefer the CDN URL when available. For example, in your video player components:

   ```typescript
   // Example modification to a video player component
   import { getCdnUrl } from '@/lib/supabase/upload-helpers';

   // Inside your component:
   const optimizedVideoUrl = videoUrl ? getCdnUrl(videoUrl) : '';

   return (
     <video 
       src={optimizedVideoUrl} 
       controls 
       className="w-full h-auto max-h-[400px]"
     />
   );
   ```

5. **Create a Custom Video Player Hook**

   For more advanced needs, consider creating a React hook to handle video URLs:

   ```typescript
   // hooks/useOptimizedVideo.ts
   import { useEffect, useState } from 'react';
   import { getCdnUrl } from '@/lib/supabase/upload-helpers';

   export function useOptimizedVideo(originalUrl: string | undefined) {
     const [videoUrl, setVideoUrl] = useState<string>('');
     const [isLoading, setIsLoading] = useState<boolean>(true);
     const [error, setError] = useState<Error | null>(null);

     useEffect(() => {
       if (!originalUrl) {
         setVideoUrl('');
         setIsLoading(false);
         return;
       }

       try {
         // Transform the URL for CDN delivery
         const optimizedUrl = getCdnUrl(originalUrl);
         setVideoUrl(optimizedUrl);
         setIsLoading(false);
       } catch (err) {
         console.error('Error optimizing video URL:', err);
         setError(err instanceof Error ? err : new Error('Error optimizing video URL'));
         // Fallback to original URL if there's an error
         setVideoUrl(originalUrl);
         setIsLoading(false);
       }
     }, [originalUrl]);

     return { videoUrl, isLoading, error };
   }
   ```

### 8.3. Example Implementation Changes

In the existing `VideoUploader` component (`components/modules/video-uploader.tsx`), you would make these changes:

```tsx
// Inside VideoUploader component
import { getCdnUrl } from '@/lib/supabase/upload-helpers';

// Existing code:
const [videoUrl, setVideoUrl] = useState<string | undefined>(currentVideoUrl);

// When handling successful upload:
const data = await response.json();
      
// Set the video URL from the response
// Old approach:
// setVideoUrl(data.publicUrl || data.fullPath);

// New approach with CDN:
setVideoUrl(data.cdnUrl || data.publicUrl || data.fullPath);
      
// Call the callback with the new video URL
onUploadComplete(data.cdnUrl || data.publicUrl || data.fullPath, data.path);
```

This comprehensive integration approach ensures that:

1. Both development and production environments work properly
2. The transition to using CDN URLs is seamless
3. You have fallbacks if the CDN is unavailable
4. The implementation is maintainable and can be easily updated

This comprehensive plan should enable you to successfully implement Cloudflare CDN for your Supabase-hosted videos, leading to a better streaming experience for your users.