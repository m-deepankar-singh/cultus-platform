TITLE: Trigger Deployment with Vercel Deploy Hook
DESCRIPTION: Trigger a new deployment for a connected Git repository by making an HTTP GET or POST request to a unique URL generated for your Project's Deploy Hook. This method allows initiating deployments without requiring a new commit to the repository.
SOURCE: https://vercel.com/docs/deployments

LANGUAGE: APIDOC
CODE:
```
HTTP Method: GET or POST
Endpoint: Unique URL generated for a Project's Deploy Hook
Purpose: Trigger a new deployment for a connected Git repository without a new commit.
```

----------------------------------------

TITLE: Generate Text with AI SDK using Different LLM Providers
DESCRIPTION: The AI SDK provides a unified API for text generation across various LLM providers. These examples demonstrate how to use the `generateText` function with OpenAI's GPT-4o and Anthropic's Claude Sonnet 3.7, showcasing the ease of switching between models by changing only the model import and instantiation.
SOURCE: https://vercel.com/docs/ai-sdk

LANGUAGE: TypeScript
CODE:
```
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
 
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain the concept of quantum entanglement.',
});
```

LANGUAGE: TypeScript
CODE:
```
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
 
const { text } = await generateText({
  model: anthropic('claude-3-7-sonnet-20250219'),
  prompt: 'How many people will live in the world in 2040?',
});
```

----------------------------------------

TITLE: Define a Vercel Function with Web Handler
DESCRIPTION: This snippet demonstrates how to define a basic Vercel Function using the Web Handler signature. It exports a `GET` function that takes a `Request` object and returns a `Response` object. This signature is compatible with Next.js App Router and other frameworks, requiring Node.js 18 or later.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

----------------------------------------

TITLE: Stream Text from OpenAI Model in Next.js API Route
DESCRIPTION: Demonstrates how to create a Vercel Function (Next.js API route) to stream text responses from an OpenAI model using Vercel's AI SDK. The function sends a placeholder prompt to 'gpt-4o-mini' and returns the response as a text stream, setting the appropriate 'Content-Type' header for event streams.
SOURCE: https://vercel.com/docs/functions/streaming-functions

LANGUAGE: TypeScript
CODE:
```
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
 
// This method must be named GET
export async function GET() {
  // Make a request to OpenAI's API based on
  // a placeholder prompt
  const response = streamText({
    model: openai('gpt-4o-mini'),
    messages: [{ role: 'user', content: 'What is the capital of Australia?' }],
  });
  // Respond with the stream
  return response.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream'
    }
  });
}
```

----------------------------------------

TITLE: Next.js Edge Middleware for Dynamic Feature Rollback
DESCRIPTION: This Next.js Edge Middleware snippet illustrates how to implement a dynamic emergency fallback mechanism using Vercel Edge Config. It checks a boolean variable (`isNewVersionActive`) from Edge Config to determine whether to serve the new Vercel feature or rewrite the request to a legacy server path, allowing for instant rollbacks without code deployments.
SOURCE: https://vercel.com/docs/incremental-migration/migration-guide

LANGUAGE: TypeScript
CODE:
```
import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
 
export const config = {
  matcher: ['/'], // URL to match
};
 
export async function middleware(request: NextRequest) {
  try {
    // Check whether the new version should be shown - isNewVersionActive is a boolean value stored in Edge Config that you can update from your Project dashboard without any code changes
    const isNewVersionActive = await get<boolean>('isNewVersionActive');
 
    // If `isNewVersionActive` is false, rewrite to the legacy server URL
    if (!isNewVersionActive) {
      request.nextUrl.pathname = `/legacy-path`;
      return NextResponse.rewrite(request.nextUrl);
    }
  } catch (error) {
    console.error(error);
  }
}
```

----------------------------------------

TITLE: Secure Vercel Cron Jobs with Next.js Route Handlers
DESCRIPTION: This snippet demonstrates how to secure Vercel cron job invocations using a Next.js App Router Route Handler. It validates the incoming `Authorization` header against a `CRON_SECRET` environment variable, returning a 401 Unauthorized response if the secret does not match. It also notes compatibility considerations for TypeScript versions below 5.2.
SOURCE: https://vercel.com/docs/cron-jobs/manage-cron-jobs

LANGUAGE: TypeScript
CODE:
```
import type { NextRequest } from 'next/server';
 
export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }
 
  return Response.json({ success: true });
}
```

----------------------------------------

TITLE: Query an AWS RDS Instance with Vercel Functions
DESCRIPTION: This example shows how to perform a database `SELECT` query on an AWS RDS instance from a Vercel function. It utilizes `@aws-sdk/rds-signer` for authentication token generation and `pg` for PostgreSQL client operations. The function initializes an RDS signer with OIDC credentials and a PostgreSQL connection pool, then executes a sample query against a specified database table. Required environment variables include `RDS_PORT`, `RDS_HOSTNAME`, `RDS_DATABASE`, `RDS_USERNAME`, `RDS_CA_PEM`, `AWS_REGION`, and `AWS_ROLE_ARN`.
SOURCE: https://vercel.com/docs/oidc/aws

LANGUAGE: Shell
CODE:
```
pnpm i @aws-sdk/rds-signer @vercel/functions pg
```

LANGUAGE: JavaScript
CODE:
```
import { awsCredentialsProvider } from '@vercel/functions/oidc';
import { Signer } from '@aws-sdk/rds-signer';
import { Pool } from 'pg';
 
const RDS_PORT = parseInt(process.env.RDS_PORT!);
const RDS_HOSTNAME = process.env.RDS_HOSTNAME!;
const RDS_DATABASE = process.env.RDS_DATABASE!;
const RDS_USERNAME = process.env.RDS_USERNAME!;
const RDS_CA_PEM = process.env.RDS_CA_PEM!;
const AWS_REGION = process.env.AWS_REGION!;
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN!;
 
// Initialize the RDS Signer
const signer = new Signer({
  // Use the Vercel AWS SDK credentials provider
  credentials: awsCredentialsProvider({
    roleArn: AWS_ROLE_ARN,
  }),
  region: AWS_REGION,
  port: RDS_PORT,
  hostname: RDS_HOSTNAME,
  username: RDS_USERNAME,
});
 
// Initialize the Postgres Pool
const pool = new Pool({
  password: signer.getAuthToken,
  user: RDS_USERNAME,
  host: RDS_HOSTNAME,
  database: RDS_DATABASE,
  port: RDS_PORT,
});
 
// Export the route handler
export async function GET() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT * FROM my_table');
    return Response.json(rows);
  } finally {
    client.release();
  }
}
```

----------------------------------------

TITLE: Configure Next.js Rewrites with Fallback to Legacy Server
DESCRIPTION: This Next.js configuration uses `async rewrites` with a `fallback` rule to direct all incoming traffic (`/:path*`) to a specified legacy site. This ensures that Vercel acts as the entry point but routes all requests to the existing server, allowing for gradual migration.
SOURCE: https://vercel.com/docs/incremental-migration/migration-guide

LANGUAGE: javascript
CODE:
```
module.exports = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: 'https://my-legacy-site.com/:path*',
        },
      ],
    };
  },
};
```

----------------------------------------

TITLE: Create a server-side upload route for Vercel Blob
DESCRIPTION: This Next.js API route (Route Handler) receives the uploaded file, forwards it to Vercel Blob using `put`, and returns the resulting blob metadata as a JSON response. It handles filename extraction from search parameters and sets public access.
SOURCE: https://vercel.com/docs/vercel-blob/server-upload

LANGUAGE: TypeScript
CODE:
```
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
 
export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
 
  const blob = await put(filename, request.body, {
    access: 'public',
    addRandomSuffix: true,
  });
 
  return NextResponse.json(blob);
}
```

----------------------------------------

TITLE: Accessing Environment Variables in Different Languages
DESCRIPTION: This snippet demonstrates how to access a declared environment variable, such as API_URL, in various programming languages. Environment variables are typically accessed via language-specific methods or modules after being configured in the deployment environment.
SOURCE: https://vercel.com/docs/environment-variables/managing-environment-variables

LANGUAGE: Node.js
CODE:
```
process.env.API_URL;
```

LANGUAGE: Go
CODE:
```
os.Getenv("API_URL")
```

LANGUAGE: Python
CODE:
```
os.environ.get('API_URL')
```

LANGUAGE: Ruby
CODE:
```
ENV['API_URL']
```

----------------------------------------

TITLE: Define Edge Middleware Function in TypeScript/JavaScript
DESCRIPTION: This snippet demonstrates the basic structure for an Edge Middleware function. It must be a default export in a `middleware.ts` or `middleware.js` file located at the root of your `app` or `pages` directory.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
export default function customName() {}
```

----------------------------------------

TITLE: Defining Custom Tools for LLMs with AI SDK
DESCRIPTION: Extend LLM capabilities by defining custom tools using the AI SDK's `tool` function. Each tool requires a description, Zod-validated parameters for input, and an `execute` function to perform the task. This example demonstrates creating 'weather' and 'activities' tools.
SOURCE: https://vercel.com/docs/agents

LANGUAGE: TypeScript
CODE:
```
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
 
export async function getWeather() {
  const { text } = await generateText({
    model: openai('gpt-4.1'),
    prompt: 'What is the weather in San Francisco?',
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for')
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10
        })
      }),
      activities: tool({
        description: 'Get the activities in a location',
        parameters: z.object({
          location: z
            .string()
            .describe('The location to get the activities for')
        }),
        execute: async ({ location }) => ({
          location,
          activities: ['hiking', 'swimming', 'sightseeing']
        })
      })
    }
  });
  console.log(text);
}
```

----------------------------------------

TITLE: Configure Background Revalidation for ISR
DESCRIPTION: This snippet demonstrates how to configure background revalidation for Incremental Static Regeneration (ISR) in a Next.js application using the App Router. By setting the `revalidate` export, the page's cache will be purged and revalidated automatically every 10 seconds. This configuration is applicable across Next.js (/app), Next.js (/pages), SvelteKit, and Nuxt contexts.
SOURCE: https://vercel.com/docs/incremental-static-regeneration/quickstart

LANGUAGE: TypeScript
CODE:
```
export const revalidate = 10; // seconds
```

----------------------------------------

TITLE: Implement Periodic Backup for Vercel Blob using Cron Jobs
DESCRIPTION: This TypeScript code provides an example of a periodic backup solution for Vercel Blob. Designed to run as a Next.js API route (suitable for Cron Jobs), it iterates through all blobs, fetches their content, and streams them directly to an AWS S3 bucket. This method optimizes memory usage by avoiding buffering and includes logic for handling large datasets by resuming from a cursor.
SOURCE: https://vercel.com/docs/vercel-blob/examples

LANGUAGE: TypeScript
CODE:
```
import { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import { list } from "@vercel/blob";
import { Upload } from "@aws-sdk/lib-storage";
import type { NextRequest } from "next/server";
import type { ReadableStream } from "node:stream/web";
 
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
 
  const s3 = new S3Client({
    region: "us-east-1",
  });
 
  let cursor: string | undefined;
 
  do {
    const listResult = await list({
      cursor,
      limit: 250,
    });
 
    if (listResult.blobs.length > 0) {
      await Promise.all(
        listResult.blobs.map(async (blob) => {
          const res = await fetch(blob.url);
          if (res.body) {
            const parallelUploads3 = new Upload({
              client: s3,
              params: {
                Bucket: "vercel-blob-backup",
                Key: blob.pathname,
                Body: Readable.fromWeb(res.body as ReadableStream),
              },
              leavePartsOnError: false,
            });
 
            await parallelUploads3.done();
          }
        })
      );
    }
 
    cursor = listResult.cursor;
  } while (cursor);
 
  return new Response("Backup done!");
}
```

----------------------------------------

TITLE: PUBLIC_VERCEL_PROJECT_PRODUCTION_URL Environment Variable
DESCRIPTION: Defines a production domain name for the project, prioritizing the shortest custom domain or a `vercel.app` domain. This variable is consistently set, even for preview deployments, and is useful for generating reliable production-pointing links like OG-image URLs. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Environment Variables
CODE:
```
PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Continuing Middleware Chain with NextResponse.next() and Custom Headers
DESCRIPTION: The `NextResponse.next()` helper instructs the Edge Function to continue processing the middleware chain. This example demonstrates how to add custom headers to both the request (for subsequent middleware) and the response.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
export function middleware(request: NextRequest) {
  // Clone the request headers and set a new header `x-hello-from-middleware1`
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-hello-from-middleware1', 'hello');
 
  // You can also set request headers in NextResponse.next
  const response = NextResponse.next({
    request: {
      // New request headers
      headers: requestHeaders,
    },
  });
 
  // Set a new response header `x-hello-from-middleware2`
  response.headers.set('x-hello-from-middleware2', 'hello');
  return response;
}
```

----------------------------------------

TITLE: Embed Payment Processor iframe Component in React
DESCRIPTION: This React/JSX component demonstrates how to embed a payment processor's iframe into an application. It sets up a secure conduit for payment data, utilizing the `sandbox` attribute with `allow-forms`, `allow-top-navigation`, and `allow-same-origin` to control iframe permissions and enhance security.
SOURCE: https://vercel.com/docs/security/pci-dss

LANGUAGE: React/TypeScript
CODE:
```
const PaymentProcessorIframe = (): JSX.Element => {
  const paymentProcessorIframeURL = `https://${PAYMENT_PROCESSOR_BASE_URL}.com/secure-payment-form`;
 
  return (
    <div className="container mx-auto my-10 rounded bg-white p-5 shadow-md">
      <iframe
        src={paymentProcessorIframeURL}
        frameBorder="0"
        width="100%"
        height="500px"
        sandbox="allow-forms allow-top-navigation allow-same-origin"
        className="h-auto w-full"
      />
    </div>
  );
};
 
export default PaymentProcessorIframe;
```

----------------------------------------

TITLE: Upload File to Vercel Blob using Next.js Server Action
DESCRIPTION: Demonstrates how to create a Next.js Server Action to upload an image file to Vercel Blob. It uses `put` from `@vercel/blob` to store the file publicly with a random suffix and revalidates the path.
SOURCE: https://vercel.com/docs/vercel-blob/server-upload

LANGUAGE: typescript
CODE:
```
import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
 
export async function Form() {
  async function uploadImage(formData: FormData) {
    'use server';
    const imageFile = formData.get('image') as File;
    const blob = await put(imageFile.name, imageFile, {
      access: 'public',
      addRandomSuffix: true,
    });
    revalidatePath('/');
    return blob;
  }
 
  return (
    <form action={uploadImage}>
      <label htmlFor="image">Image</label>
      <input
        type="file"
        id="image"
        name="image"
        accept="image/jpeg, image/png, image/webp"
        required
      />
      <button>Upload</button>
    </form>
  );
}
```

----------------------------------------

TITLE: Configure SPA Fallback: Legacy Routes vs. Modern Rewrites
DESCRIPTION: This snippet demonstrates how to configure a Single Page Application (SPA) fallback, serving `index.html` for all paths that do not match a file in the filesystem. It compares the legacy `routes` approach, which requires explicit filesystem handling, with the modern `rewrites` approach, where filesystem checks are the default behavior.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

----------------------------------------

TITLE: Building and Deploying Vercel Projects with GitLab Pipelines
DESCRIPTION: Demonstrates how to integrate Vercel CLI commands into GitLab Pipelines. Use `vercel build` to build the project within GitLab, and `vercel deploy --prebuilt` to upload the pre-built `.vercel/output` folder to Vercel, enabling custom CI/CD workflows without exposing source code.
SOURCE: https://vercel.com/docs/git/vercel-for-gitlab

LANGUAGE: Shell
CODE:
```
vercel build
vercel deploy --prebuilt
```

----------------------------------------

TITLE: Implement Edge Middleware for Dynamic Rewrites with Edge Config
DESCRIPTION: This Edge Middleware example demonstrates how to dynamically rewrite requests at the edge using Vercel's Edge Config. It fetches rewrite rules from Edge Config and applies them based on the request's pathname, providing flexibility without redeployment and immediate rollback capabilities. It's configured to match all paths except API routes, static assets, and favicon.
SOURCE: https://vercel.com/docs/incremental-migration/migration-guide

LANGUAGE: typescript
CODE:
```
import { get } from '@vercel/edge-config';
import { NextRequest, NextResponse } from 'next/server';
 
export const config = {
  matcher: '/((?!api|_next/static|favicon.ico).*),'
};
 
export default async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const rewrites = await get('rewrites'); // Get rewrites stored in Edge Config
 
  for (const rewrite of rewrites) {
    if (rewrite.source === url.pathname) {
      url.pathname = rewrite.destination;
      return NextResponse.rewrite(url);
    }
  }
 
  return NextResponse.next();
}
```

----------------------------------------

TITLE: Connect Vercel Project to Groq AI Model (Next.js App Router)
DESCRIPTION: This JavaScript code snippet demonstrates how to set up an API route in a Next.js App Router (`app/api/chat/route.ts`) to stream text responses using the `@ai-sdk/groq` package and the `llama-3.1-8b-instant` model. It handles incoming chat messages and streams the AI model's response back.
SOURCE: https://vercel.com/docs/ai/groq

LANGUAGE: TypeScript
CODE:
```
// app/api/chat/route.ts
import { groq } from '@ai-sdk/groq';import { streamText } from 'ai';
// Allow streaming responses up to 30 secondsexport const maxDuration = 30;
export async function POST(req: Request) {  // Extract the `messages` from the body of the request  const { messages } = await req.json();
  // Call the language model  const result = streamText({    model: groq('llama-3.1-8b-instant'),    messages,  });
  // Respond with the stream  return result.toDataStreamResponse();}
```

----------------------------------------

TITLE: VERCEL_ENV Environment Variable
DESCRIPTION: The environment that the app is deployed and running on. The value can be either `production`, `preview`, or `development`. Available at both build and runtime.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_ENV=production
```

----------------------------------------

TITLE: Implement Next.js API Routes for Replicate Predictions
DESCRIPTION: These Next.js API routes (/api/predictions and /api/predictions/[id]) handle the creation and retrieval of AI model predictions via the Replicate API. The POST route initiates a prediction, optionally configuring webhooks for status updates, while the GET route polls for the status of an existing prediction by its ID.
SOURCE: https://vercel.com/docs/ai/replicate

LANGUAGE: TypeScript
CODE:
```
// app/api/predictions/route.ts
import { NextResponse } from 'next/server';import Replicate from 'replicate';
const replicate = new Replicate({  auth: process.env.REPLICATE_API_TOKEN,});
// In production and preview deployments (on Vercel), the VERCEL_URL environment variable is set.// In development (on your local machine), the NGROK_HOST environment variable is set.const WEBHOOK_HOST = process.env.VERCEL_URL  ? `https://${process.env.VERCEL_URL}`  : process.env.NGROK_HOST;
export async function POST(request) {  if (!process.env.REPLICATE_API_TOKEN) {    throw new Error(      'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.',    );
  }
  const { prompt } = await request.json();
  const options = {    version: '8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',    input: { prompt },  };
  if (WEBHOOK_HOST) {    options.webhook = `${WEBHOOK_HOST}/api/webhooks`;    options.webhook_events_filter = ['start', 'completed'];  }
  // A prediction is the result you get when you run a model, including the input, output, and other details  const prediction = await replicate.predictions.create(options);
  if (prediction?.error) {    return NextResponse.json({ detail: prediction.error }, { status: 500 });  }
  return NextResponse.json(prediction, { status: 201 });}
// app/api/predictions/[id]/route.ts
import { NextResponse } from 'next/server';import Replicate from 'replicate';
const replicate = new Replicate({  auth: process.env.REPLICATE_API_TOKEN,});
// Poll for the prediction's statusexport async function GET(request, { params }) {  const { id } = params;  const prediction = await replicate.predictions.get(id);
  if (prediction?.error) {    return NextResponse.json({ detail: prediction.error }, { status: 500 });  }
  return NextResponse.json(prediction);}
```

----------------------------------------

TITLE: Configure Next.js Function for Edge Runtime
DESCRIPTION: This snippet demonstrates how to convert a Vercel Function into an Edge Function within a Next.js application. By setting `export const runtime = 'edge'`, the function is configured to execute on the Edge Network, providing a basic GET handler that returns a simple response.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: JavaScript
CODE:
```
export const runtime = 'edge'; // 'nodejs' is the default
 
export function GET(request: Request) {
  return new Response(`I am an Edge Function!`, {
    status: 200,
  });
}
```

----------------------------------------

TITLE: Deploying Vercel Project from Current Directory
DESCRIPTION: Deploys the Vercel project located in the current working directory using the `vercel` command. This is the simplest way to initiate a deployment.
SOURCE: https://vercel.com/docs/cli/deploying-from-cli

LANGUAGE: Shell
CODE:
```
vercel
```

----------------------------------------

TITLE: Vercel API Route for GCP Vertex AI Text Generation with OIDC
DESCRIPTION: This Vercel API route demonstrates how to connect to GCP Vertex AI using OIDC. It initializes an `ExternalAccountClient` with Vercel's OIDC token, configures the `@ai-sdk/google-vertex` provider, and then uses `generateText` to create a vegetarian lasagna recipe from a prompt.
SOURCE: https://vercel.com/docs/oidc/gcp

LANGUAGE: TypeScript
CODE:
```
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { createVertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';
 
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
 
// Initialize the External Account Client
const authClient = ExternalAccountClient.fromJSON({
  type: 'external_account',
  audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  token_url: 'https://sts.googleapis.com/v1/token',
  service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  subject_token_supplier: {
    // Use the Vercel OIDC token as the subject token
    getSubjectToken: getVercelOidcToken,
  },
});
 
const vertex = createVertex({
  project: GCP_PROJECT_ID,
  location: 'us-central1',
  googleAuthOptions: {
    authClient,
    projectId: GCP_PROJECT_ID,
  },
});
 
// Export the route handler
export const GET = async (req: Request) => {
  const result = generateText({
    model: vertex('gemini-1.5-flash'),
    prompt: 'Write a vegetarian lasagna recipe for 4 people.',
  });
  return Response.json(result);
};
```

----------------------------------------

TITLE: Initialize Statsig with Edge Config in Next.js Edge Middleware
DESCRIPTION: This example demonstrates how to set up a Statsig experiment using Edge Config within a Next.js Edge Middleware file. It leverages `statsig-node-vercel` and `@vercel/edge-config` to dynamically fetch feature flag configurations, ensuring all logged events are flushed before the middleware exits.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/statsig-edge-config

LANGUAGE: TypeScript
CODE:
```
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Statsig from 'statsig-node';
import { createClient } from '@vercel/edge-config';
import { EdgeConfigDataAdapter } from 'statsig-node-vercel';
 
export const config = {
  matcher: '/',
};
 
const edgeConfigClient = createClient(process.env.EDGE_CONFIG!);
const dataAdapter = new EdgeConfigDataAdapter({
  edgeConfigClient: edgeConfigClient,
  edgeConfigItemKey: process.env.EDGE_CONFIG_ITEM_KEY!,
});
 
export async function middleware(request: NextRequest) {
  await Statsig.initialize('statsig-server-api-key-here', { dataAdapter });
 
  const experiment = await Statsig.getExperiment(
    { userID: 'exampleId' },
    'statsig_example_experiment',
  );
 
  // Do any other experiment actions here
 
  // Ensure that all logged events are flushed to Statsig servers before the middleware exits
  event.waitUntil(Statsig.flush());
 
  return NextResponse.next();
}
```

----------------------------------------

TITLE: Exporting Vercel Project Environment Variables for Local Development
DESCRIPTION: Explains how to export Vercel Project environment variables to a local `.env` file using `vercel env pull` for frameworks like Next.js or Gatsby. It also shows how to temporarily override variables for a single command execution.
SOURCE: https://vercel.com/docs/cli/env

LANGUAGE: Shell
CODE:
```
vercel env pull [file]
```

LANGUAGE: Shell
CODE:
```
MY_ENV_VAR="temporary value" next dev
```

----------------------------------------

TITLE: Automated AI Deployment and Ownership Transfer Workflow
DESCRIPTION: Details a six-step process for an AI agent to programmatically deploy applications to Vercel and transfer their ownership to an end-user. The workflow leverages Vercel's API for file uploads, deployment creation, and project transfer requests, culminating in a user-facing claim URL.
SOURCE: https://vercel.com/docs/deployments/claim-deployments

LANGUAGE: APIDOC
CODE:
```
Workflow Steps:
1. File Upload:
   Method: POST
   Endpoint: /files
   Purpose: AI agent uploads deployment files to Vercel.

2. Deployment Creation:
   Option A: Vercel CLI
   Option B: Vercel API
     Method: POST
     Endpoint: /files (followed by) POST /deployments
     Purpose: Creates a new deployment on Vercel.

3. Project Transfer Request:
   Method: POST
   Endpoint: /projects/:idOrName/transfer-request
   Purpose: Initiates a transfer request, returning a 'code' for ownership transfer.

4. Generate Claim URL:
   Format: https://vercel.com/claim-deployment?code=xxx&returnUrl=https://xxx
   Purpose: Agent generates and shares this URL with the end user.

5. User Claims Deployment:
   Action: User accesses the claim page via the URL and selects a team.

6. Project Transfer Completion:
   Method: PUT
   Endpoint: /projects/transfer-request/:code
   Purpose: Vercel API completes the transfer to the user's selected team. (Not required if using the Claim Deployments Flow directly).
```

----------------------------------------

TITLE: Proxy External API Requests with Rewrites
DESCRIPTION: Shows how to configure an external rewrite to forward requests from a local path (e.g., `/api/users`) to an external API endpoint (e.g., `https://api.example.com/users`). This allows Vercel to act as a reverse proxy, hiding the actual API endpoint from the browser.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ]
}
```

----------------------------------------

TITLE: Upload a Public Blob with Vercel Blob SDK
DESCRIPTION: This JavaScript snippet demonstrates how to upload a file, referred to as a 'blob', to Vercel Blob storage. It uses the `put` function from the `@vercel/blob` SDK, specifying the filename, file content, and setting `access: 'public'` to make the uploaded blob publicly accessible.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: JavaScript
CODE:
```
import { put } from '@vercel/blob';
 
const blob = await put('avatar.jpg', imageFile, {
  access: 'public',
});
```

----------------------------------------

TITLE: List Objects in an AWS S3 Bucket with Vercel Functions
DESCRIPTION: This example demonstrates how to list objects in an AWS S3 bucket from a Vercel function. It uses the `@aws-sdk/client-s3` package and the `@vercel/functions/oidc` credentials provider to authenticate with AWS using OIDC. The function initializes an S3 client and sends a `ListObjectsV2Command` to retrieve object keys from a specified S3 bucket. Required environment variables include `AWS_REGION`, `AWS_ROLE_ARN`, and `S3_BUCKET_NAME`.
SOURCE: https://vercel.com/docs/oidc/aws

LANGUAGE: Shell
CODE:
```
pnpm i @aws-sdk/client-s3 @vercel/functions
```

LANGUAGE: JavaScript
CODE:
```
import * as S3 from '@aws-sdk/client-s3';
import { awsCredentialsProvider } from '@vercel/functions/oidc';
 
const AWS_REGION = process.env.AWS_REGION!;
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN!;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
 
// Initialize the S3 Client
const s3client = new S3.S3Client({
  region: AWS_REGION,
  // Use the Vercel AWS SDK credentials provider
  credentials: awsCredentialsProvider({
    roleArn: AWS_ROLE_ARN,
  }),
});
 
export async function GET() {
  const result = await s3client.send(
    new S3.ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
    }),
  );
  return result?.Contents?.map((object) => object.Key) ?? [];
}
```

----------------------------------------

TITLE: Vercel Functions Node.js Runtime General Limits Overview
DESCRIPTION: Outlines the general operational limits and restrictions for Vercel Functions using the Node.js runtime across different Vercel plans, including memory, duration, bundle size, concurrency, cost, regions, and API coverage.
SOURCE: https://vercel.com/docs/functions/limitations

LANGUAGE: APIDOC
CODE:
```
Feature: Maximum memory
  Hobby: 1024 MB
  Pro and Ent: 3009 MB
Feature: Maximum duration
  Hobby: 10s (default) - configurable up to 60s
  Pro: 15s (default) - configurable up to 300s
  Ent: 15s (default) - configurable up to 900s
  Fluid compute enabled: values increased across plans
Feature: Size (after gzip compression)
  250 MB
Feature: Concurrency
  Auto-scales up to 30,000 (Hobby and Pro)
  Auto-scales up to 100,000+ (Enterprise)
Feature: Cost
  Pay for wall-clock time
Feature: Regions
  Executes region-first, can customize location
  Enterprise teams can set multiple regions
Feature: API Coverage
  Full Node.js coverage
```

----------------------------------------

TITLE: Vercel Project Configuration: `functions` Property Definition
DESCRIPTION: Configures custom settings for Serverless Functions using glob patterns to match function paths. Each matched function can have its runtime, memory, max duration, and file inclusions/exclusions customized.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
functions: Object
  Description: Defines custom settings for Serverless Functions.
  Key definition: String (glob pattern)
    Description: Matches the paths of Serverless Functions to customize.
    Examples:
      - api/*.js (matches one level e.g. api/hello.js but not api/hello/world.js)
      - api/**/*.ts (matches all levels api/hello.ts and api/hello/world.ts)
      - src/pages/**/* (matches all functions from src/pages)
      - api/test.js
  Value definition: Object
    runtime (optional): String
      Description: The npm package name of a Runtime, including its version.
    memory (optional): Integer
      Description: Memory in MB for your Serverless Function (between 128 and 3009).
    maxDuration (optional): Integer
      Description: How long your Serverless Function should be allowed to run on every request in seconds (between 1 and the maximum limit of your plan).
    includeFiles (optional): String (glob pattern)
      Description: Matches files that should be included in your Serverless Function. (Not supported in Next.js, instead use outputFileTracingIncludes in next.config.js)
    excludeFiles (optional): String (glob pattern)
      Description: Matches files that should be excluded from your Serverless Function. (Not supported in Next.js, instead use outputFileTracingIncludes in next.config.js)
```

----------------------------------------

TITLE: Create Vercel Function with Web Signature (TypeScript)
DESCRIPTION: This snippet demonstrates the simplest way to define a Vercel Function using the Web signature. It exports a `GET` function that takes a `Request` object and returns a basic 'Hello from Vercel!' response.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

----------------------------------------

TITLE: Create Sensitive Environment Variables
DESCRIPTION: This section provides examples for creating sensitive environment variables in Vercel, which are crucial for securing sensitive data like API keys. Sensitive variables are stored in an unreadable format and can only be created in production and preview environments. Examples are provided for both cURL and the Vercel SDK.
SOURCE: https://vercel.com/docs/environment-variables/sensitive-environment-variables

LANGUAGE: curl
CODE:
```
curl --request POST \
  --url https://api.vercel.com/v10/projects/<project-id-or-name>/env \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '[
    {
      "key": "<env-key-1>",
      "value": "<env-value-1>",
      "type": "sensitive",
      "target": ["<target-environment>"],
      "gitBranch": "<git-branch>",
      "comment": "<comment>",
      "customEnvironmentIds": ["<custom-env-id>"]
    }
  ]'
```

LANGUAGE: javascript
CODE:
```
import { Vercel } from '@vercel/sdk';
 
const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});
 
async function run() {
  const result = await vercel.projects.createProjectEnv({
    idOrName: '<project-id-or-name>',
    requestBody: {
      key: '<env-key-1>',
      value: '<env-value-1>',
      type: 'sensitive',
      target: ['<target-environment>'],
      gitBranch: '<git-branch>',
      comment: '<comment>',
      customEnvironmentIds: ['<custom-env-id>']
    }
  });
 
  // Handle the result
  console.log(result);
}
 
run();
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: This snippet demonstrates how to install the Vercel CLI globally on your system using pnpm, a fast package manager. The command is also applicable with npm, yarn, or bun by replacing 'pnpm' with the respective package manager.
SOURCE: https://vercel.com/docs/cli

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel
```

----------------------------------------

TITLE: Schedule Post-Response Work with Next.js after()
DESCRIPTION: Demonstrates using `after()` from `next/server` in Next.js 13.4+ to schedule asynchronous tasks that execute after the HTTP response is sent or prerendering completes. This prevents blocking the response for side effects like logging or analytics.
SOURCE: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package

LANGUAGE: TypeScript
CODE:
```
import { after } from 'next/server';
 
export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';
 
  // Returns a response immediately
  const response = new Response(`You're visiting from ${country}`);
 
  // Schedule a side-effect after the response is sent
  after(async () => {
    // For example, log or increment analytics in the background
    await fetch(
      `https://my-analytics-service.example.com/log?country=${country}`,
    );
  });
 
  return response;
}
```

----------------------------------------

TITLE: Implement On-Demand Revalidation API Route
DESCRIPTION: This snippet provides an example of an API route designed to trigger on-demand revalidation for a specific path (`/blog-posts`). It requires a secret token passed as a query parameter (`?secret`) to prevent unauthorized revalidation. If the secret matches an environment variable, `revalidatePath` is called to purge the cache for the specified route. This is primarily for Next.js applications but the concept applies to other frameworks with similar API route capabilities.
SOURCE: https://vercel.com/docs/incremental-static-regeneration/quickstart

LANGUAGE: TypeScript
CODE:
```
import { revalidatePath } from 'next/cache';
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams?.secret !== process.env.MY_SECRET_TOKEN) {
    return new Response(`Invalid credentials`, {
      status: 500,
    });
  }
  revalidatePath('/blog-posts');
  return new Response(
    {
      revalidated: true,
      now: Date.now(),
    },
    {
      status: 200,
    },
  );
}
```

----------------------------------------

TITLE: Fetch and Render Data with ISR Background Revalidation Example
DESCRIPTION: This example demonstrates a complete page component that fetches a list of blog posts from an external API and renders them. It utilizes Incremental Static Regeneration (ISR) with background revalidation set to 10 seconds, ensuring the data is refreshed periodically or on page visits. This code is applicable to Next.js (/app), Next.js (/pages), SvelteKit, and Nuxt frameworks.
SOURCE: https://vercel.com/docs/incremental-static-regeneration/quickstart

LANGUAGE: TypeScript
CODE:
```
export const revalidate = 10; // seconds
 
interface Post {
  title: string;
  id: number;
}
 
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = (await res.json()) as Post[];
  return (
    <ul>
      {posts.map((post: Post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

----------------------------------------

TITLE: Implement LaunchDarkly Feature Flag Middleware
DESCRIPTION: Creates a `middleware.ts` file to configure Vercel Edge Middleware. This middleware uses LaunchDarkly to evaluate a feature flag (`experimental-homepage`) and conditionally redirects users from `/homepage` to `/new-homepage`.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/launchdarkly-edge-config

LANGUAGE: TypeScript
CODE:
```
import { init } from '@launchdarkly/vercel-server-sdk';
import { createClient } from '@vercel/edge-config';
 
const edgeConfigClient = createClient(process.env.EDGE_CONFIG!); 
const launchDarklyClient = init('YOUR CLIENT-SIDE ID', edgeConfigClient);
 
export const config = {
  // Only run the middleware on the dashboard route
  matcher: '/homepage',
};
 
export default async function middleware(request: Request): Promise<Response> {
  await launchDarklyClient.initFromServerIfNeeded();
  const launchDarklyContext = { kind: 'org', key: 'my-org-key' };
  const showExperimentalHomepage = await launchDarklyClient.variation(
    'experimental-homepage',
    launchDarklyContext,
    true,
  );
 
  if (showExperimentalHomepage) {
    const url = new URL(request.url);
    url.pathname = '/new-homepage';
    return Response.redirect(url);
  }
  return new Response(null, { status: 200 });
}
```

----------------------------------------

TITLE: Initialize a New Next.js Project
DESCRIPTION: Use the pnpm package manager to create a new Next.js application. This command sets up the basic project structure.
SOURCE: https://vercel.com/docs/og-image-generation

LANGUAGE: Shell
CODE:
```
pnpm create next-app
```

----------------------------------------

TITLE: CI/CD Workflow for Deploying to Custom Domain
DESCRIPTION: A bash script for CI/CD workflows that deploys a Vercel project, captures the deployment URL from stdout, and then aliases it to a custom domain using `vercel alias`. Includes error handling based on the exit code.
SOURCE: https://vercel.com/docs/cli/deploy

LANGUAGE: Bash
CODE:
```
# save stdout and stderr to files
vercel deploy >deployment-url.txt 2>error.txt
 
# check the exit code
code=$?
if [ $code -eq 0 ]; then
    # Now you can use the deployment url from stdout for the next step of your workflow
    deploymentUrl=`cat deployment-url.txt`
    vercel alias $deploymentUrl my-custom-domain.com
else
    # Handle the error
    errorMessage=`cat error.txt`
    echo "There was an error: $errorMessage"
fi
```

----------------------------------------

TITLE: Install Vercel CLI globally
DESCRIPTION: Install the Vercel command-line interface globally using pnpm. This tool is essential for managing Vercel projects and deploying applications from your local environment.
SOURCE: https://vercel.com/docs/analytics/quickstart

LANGUAGE: Shell
CODE:
```
pnpm i -g vercel
```

----------------------------------------

TITLE: Stream Text with Deep Infra AI SDK in Next.js API Route
DESCRIPTION: This Next.js API route demonstrates how to connect to Deep Infra using the AI SDK to stream text responses. It extracts messages from the request body, calls the Deep Infra model, and returns the streamed text as a data stream response. The maxDuration is set to allow long-running streaming operations.
SOURCE: https://vercel.com/docs/ai/deepinfra

LANGUAGE: TypeScript
CODE:
```
// app/api/chat/route.ts
import { deepinfra } from '@ai-sdk/deepinfra';import { streamText } from 'ai';
// Allow streaming responses up to 30 secondsexport const maxDuration = 30;
export async function POST(req: Request) {  // Extract the `messages` from the body of the request  const { messages } = await req.json();
  // Call the language model  const result = streamText({
    model: deepinfra('deepseek-ai/DeepSeek-R1-Distill-Llama-70B'),
    messages,
  });
  // Respond with the stream  return result.toDataStreamResponse();}
```

----------------------------------------

TITLE: Generate Text with Vercel v0 Model using AI SDK
DESCRIPTION: This example demonstrates how to use the AI SDK to generate text responses from the `v0-1.0-md` model. It imports the `generateText` function and the Vercel provider, then calls `generateText` with the model and a prompt.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: TypeScript
CODE:
```
import { generateText } from 'ai';
import { vercel } from '@ai-sdk/vercel';
 
const { text } = await generateText({
  model: vercel('v0-1.0-md'),
  prompt: 'Create a Next.js AI chatbot with authentication',
});
```

----------------------------------------

TITLE: Using `waitUntil()` for Asynchronous Tasks in Next.js Middleware
DESCRIPTION: The `waitUntil()` method, part of the `ExtendableEvent` interface, allows you to prolong the execution of a serverless function even after a response has been sent. This is particularly useful for background asynchronous tasks, such as fetching data or logging, ensuring they complete without delaying the client's response. The example demonstrates sending an immediate response while an asynchronous product fetch and logging operation continues in the background.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import type { NextFetchEvent } from 'next/server';
 
export const config = {
  matcher: '/',
};
 
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 
async function getProduct() {
  const res = await fetch('https://api.vercel.app/products/1');
  await wait(10000);
  return res.json();
}
 
export default function middleware(request: Request, context: NextFetchEvent) {
  context.waitUntil(getProduct().then((json) => console.log({ json })));
 
  return new Response(JSON.stringify({ hello: 'world' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
```

----------------------------------------

TITLE: Install Vercel AI SDK
DESCRIPTION: Instructions to install the Vercel AI SDK using a package manager. This SDK facilitates the integration of OpenAI into your project and supports building AI applications with various frameworks like React (Next.js), Vue (Nuxt), Svelte (SvelteKit), and Node.js.
SOURCE: https://vercel.com/docs/ai/openai

LANGUAGE: pnpm
CODE:
```
pnpm i ai
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: Installs the latest version of the Vercel Command Line Interface globally using pnpm, a prerequisite for managing Vercel projects.
SOURCE: https://vercel.com/docs/ai/togetherai

LANGUAGE: Shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Get Vercel Deployment Environment Variable
DESCRIPTION: This environment variable indicates the Vercel environment where the application is deployed and running. Possible values are `production`, `preview`, or `development`.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: plaintext
CODE:
```
PUBLIC_VERCEL_ENV=production
```

----------------------------------------

TITLE: Optimize Fonts with next/font in Next.js App Router
DESCRIPTION: This snippet demonstrates how to use `next/font/google` to optimize font loading in a Next.js App Router application. It shows how to import and configure a Google Font (Inter) for automatic self-hosting, ensuring zero layout shift and no requests to Google servers at runtime.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: TypeScript
CODE:
```
import { Inter } from 'next/font/google';
 
// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

----------------------------------------

TITLE: Paginate Blob List Results using cursor and hasMore
DESCRIPTION: Illustrates how to implement pagination when listing blob objects using the `list` method. This example demonstrates a `while` loop that continuously fetches blob lists, updating the `cursor` with the value from the previous response until `hasMore` becomes `false`, ensuring all results are retrieved.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: JavaScript
CODE:
```
let hasMore = true;
let cursor;
 
while (hasMore) {
  const listResult = await list({
    cursor,
  });
  hasMore = listResult.hasMore;
  cursor = listResult.cursor;
}
```

----------------------------------------

TITLE: Cache Vercel Edge Function Response with Cache-Control (Next.js /app)
DESCRIPTION: Demonstrates how to include `Cache-Control` headers in a Next.js Edge Function to cache its response on Vercel's Edge Network, setting `s-maxage` for revalidation and showing `CDN-Cache-Control` for broader CDN control.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JavaScript
CODE:
```
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
    }
  });
}
```

----------------------------------------

TITLE: Configure AWS S3 Client with Vercel OIDC Credentials
DESCRIPTION: Demonstrates how to configure an AWS S3 client using `awsCredentialsProvider()` from `@vercel/functions/oidc` to exchange the OIDC token for short-lived AWS credentials. It requires `AWS_REGION` and `AWS_ROLE_ARN` environment variables.
SOURCE: https://vercel.com/docs/oidc/reference

LANGUAGE: JavaScript
CODE:
```
import { awsCredentialsProvider } from '@vercel/functions/oidc';
import * as s3 from '@aws-sdk/client-s3';
 
const s3client = new s3.S3Client({
  region: proces.env.AWS_REGION!,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
  }),
});
```

----------------------------------------

TITLE: Generate Open Graph Image with Tailwind CSS in Next.js App Router
DESCRIPTION: This snippet demonstrates how to create a dynamic Open Graph image using `next/og` within a Next.js App Router API route (`route.tsx`). It showcases styling the image content with Tailwind CSS utility classes for a call-to-action layout. The `ImageResponse` component renders React-like JSX into an image.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET() {
  return new ImageResponse(
    (
      // Modified based on https://tailwindui.com/components/marketing/sections/cta-sections
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div tw="bg-gray-50 flex">
          <div tw="flex flex-col md:flex-row w-full py-12 px-4 md:items-center justify-between p-8">
            <h2 tw="flex flex-col text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-left">
              <span>Ready to dive in?</span>
              <span tw="text-indigo-600">Start your free trial today.</span>
            </h2>
            <div tw="mt-8 flex md:mt-0">
              <div tw="flex rounded-md shadow">
                <a
                  href="#"
                  tw="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white"
                >
                  Get started
                </a>
              </div>
              <div tw="ml-3 flex rounded-md shadow">
                <a
                  href="#"
                  tw="flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-indigo-600"
                >
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

----------------------------------------

TITLE: Generate Structured JSON Data with AI SDK
DESCRIPTION: This example illustrates how to generate type-safe structured JSON data using the AI SDK's `generateObject` function. It demonstrates constraining model output to a Zod schema for a recipe, ensuring the generated data conforms to a predefined structure.
SOURCE: https://vercel.com/docs/ai-sdk

LANGUAGE: TypeScript
CODE:
```
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
 
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
      steps: z.array(z.string())
    })
  }),
  prompt: 'Generate a lasagna recipe.',
});
```

----------------------------------------

TITLE: Control CDN Caching with Vercel-CDN-Cache-Control and CDN-Cache-Control
DESCRIPTION: Explains how to use `Vercel-CDN-Cache-Control` and `CDN-Cache-Control` headers in Astro to manage caching behavior on Vercel's Edge Network and other downstream CDNs, respectively. This allows for granular control over cache durations for different caching layers, ensuring optimal content delivery.
SOURCE: https://vercel.com/docs/frameworks/astro

LANGUAGE: Astro
CODE:
```
---
Astro.response.headers.set('Vercel-CDN-Cache-Control', 'max-age=3600',);
Astro.response.headers.set('CDN-Cache-Control', 'max-age=60',);
const time = new Date().toLocaleTimeString();
---
 
<h1>{time}</h1>
```

----------------------------------------

TITLE: Connect Perplexity API in Next.js App Router
DESCRIPTION: This code snippet demonstrates how to set up an API route in a Next.js App Router project to stream text responses from the Perplexity API using the AI SDK. It handles incoming chat messages and streams the model's output back to the client.
SOURCE: https://vercel.com/docs/ai/perplexity

LANGUAGE: TypeScript
CODE:
```
// app/api/chat/route.ts
import { perplexity } from '@ai-sdk/perplexity';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {  // Extract the `messages` from the body of the request  const { messages } = await req.json();

  // Call the language model  const result = streamText({
    model: perplexity('sonar-pro'),
    messages,
  });

  // Respond with the stream  return result.toDataStreamResponse();
}
```

----------------------------------------

TITLE: Detecting and Rendering Draft Content in Next.js App Router
DESCRIPTION: This code snippet demonstrates how to use `draftMode` from `next/headers` to determine if Draft Mode is enabled. Based on the `isEnabled` status, it fetches content from either a draft or production URL. It also shows how to enable Incremental Static Regeneration (ISR) with `revalidate` for the fetched content, which is required for Draft Mode.
SOURCE: https://vercel.com/docs/draft-mode

LANGUAGE: JavaScript
CODE:
```
import { draftMode } from 'next/headers';
 
async function getContent() {
  const { isEnabled } = await draftMode();
 
  const contentUrl = isEnabled
    ? 'https://draft.example.com'
    : 'https://production.example.com';
 
  // This line enables ISR, required for draft mode
  const res = await fetch(contentUrl, { next: { revalidate: 120 } });
 
  return res.json();
}
 
export default async function Page() {
  const { title, desc } = await getContent();
 
  return (
    <main>
      <h1>{title}</h1>
      <p>{desc}</p>
    </main>
  );
}
```

----------------------------------------

TITLE: Configure Local Image Optimization Patterns in Next.js
DESCRIPTION: This `next.config.ts` example shows how to set up `localPatterns` for the Next.js `Image` component. It allows images located at `/assets/images/**` to be optimized, ensuring that static assets within your project are properly processed. This configuration is crucial for enabling image optimization for local files.
SOURCE: https://vercel.com/docs/image-optimization

LANGUAGE: JavaScript
CODE:
```
module.exports = {
  images: {
    localPatterns: [
      {
        pathname: '/assets/images/**', 
        search: '',
      },
    ],
  },
};
```

----------------------------------------

TITLE: Customize `app/entry.server` for nonce and CSP in React Router
DESCRIPTION: This example demonstrates how to define a customized `app/entry.server.tsx` file to handle server-side rendering requests. It generates a unique `nonce` using `crypto.randomUUID()` and uses it to set a `Content-Security-Policy` header for `script-src`. The `handleRequest` function from `@vercel/react-router/entry.server` is used to process the core request while allowing the `nonce` option to be passed.
SOURCE: https://vercel.com/docs/frameworks/react-router

LANGUAGE: TypeScript
CODE:
```
import { handleRequest } from '@vercel/react-router/entry.server';
import type { AppLoadContext, EntryContext } from 'react-router';
 
export default async function (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext?: AppLoadContext,
): Promise<Response> {
  const nonce = crypto.randomUUID();
  const response = await handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    routerContext,
    loadContext,
    { nonce },
  );
  response.headers.set(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}'`,
  );
  return response;
}
```

----------------------------------------

TITLE: SvelteKit Server-Side Data Loading with Streaming
DESCRIPTION: This TypeScript snippet demonstrates a `load` function within a SvelteKit `+page.server.ts` file. It includes a utility `sleep` function to simulate delayed API responses and showcases how to return top-level properties that resolve before page render, alongside nested properties that stream data to the client, improving perceived loading speed.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: TypeScript
CODE:
```
function sleep(value: any, ms: number) {
  // Use this sleep function to simulate
  // a delayed API response.
  return new Promise((fulfill) => {
    setTimeout(() => {
      fulfill(value);
    }, ms);
  });
}
export function load(event): PageServerLoad<any> {
  // Get some location data about the visitor
  const ip = event.getClientAddress();
  const city = decodeURIComponent(
    event.request.headers.get('x-vercel-ip-city') ?? 'unknown',
  );
  return {
    topLevelExample: sleep({ data: "This won't be streamed" }, 2000),
    // Stream the location data to the client
    locationData: {
      details: sleep({ ip, city }, 1000),
    },
  };
}
```

----------------------------------------

TITLE: Create New Next.js Application
DESCRIPTION: This command initializes a new Next.js project interactively using `npx`. It sets up the basic project structure and dependencies, preparing the environment for development.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/devcycle-edge-config

LANGUAGE: shell
CODE:
```
npx create-next-app@latest
```

----------------------------------------

TITLE: Configure Custom OpenTelemetry Trace Exporter with @vercel/otel
DESCRIPTION: This snippet shows how to register a custom OpenTelemetry trace exporter using the `@vercel/otel` package. It configures an `OTLPHttpJsonTraceExporter` to send traces to a specified URL with custom headers, allowing integration with unsupported APM vendors. This configuration is applied via the `registerOTel()` API.
SOURCE: https://vercel.com/docs/otel

LANGUAGE: JavaScript
CODE:
```
import { registerOTel, OTLPHttpJsonTraceExporter } from '@vercel/otel';
 
export function register() {
  registerOTel({
    serviceName: 'your-project-name',
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: 'https://your-trace-exporter-url',
      headers: {
        'authentication-header-name': 'authentication-header-value',
        'another-header-name': 'another-header-value',
      }
    })
  });
}
```

----------------------------------------

TITLE: Implement Negative Lookahead for Path Exclusion: Legacy Routes vs. Modern Rewrites
DESCRIPTION: This snippet shows how to proxy all requests to a `/maintenance` page, excluding the `/maintenance` path itself to prevent an infinite loop. It compares the `routes` approach using PCRE Regex negative lookahead (`/(?!maintenance)`), with the `rewrites` approach, which requires wrapping the regex (`/((?!maintenance).*)`).
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [{ "src": "/(?!maintenance)", "dest": "/maintenance" }]
}
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/((?!maintenance).*)", "destination": "/maintenance" }
  ]
}
```

----------------------------------------

TITLE: Configure Vercel Function Route Segments in Next.js App Router
DESCRIPTION: This snippet demonstrates how to configure Vercel Functions using route segment options in the Next.js App Router. It shows how to set the `runtime` (e.g., 'nodejs') and `maxDuration` (e.g., 15 seconds) properties directly within the function file, replacing the older `config` object approach.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: TypeScript
CODE:
```
export const runtime = 'nodejs';
export const maxDuration = 15;
```

----------------------------------------

TITLE: Configure Vercel Function Bundling with vercel.json
DESCRIPTION: This `vercel.json` example demonstrates how to use the `functions` property to define specific configurations for individual Vercel routes. It shows how `app/api/hello/route.ts` and `app/api/another/route.ts` can be configured with different memory and `maxDuration` settings, leading to separate bundling for optimization.
SOURCE: https://vercel.com/docs/functions/configuring-functions/advanced-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/api/hello/route.ts": {
      "memory": 3009,
      "maxDuration": 60
    },
    "app/api/another/route.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

----------------------------------------

TITLE: Check Vercel Domain DNS Records with dig
DESCRIPTION: These `dig` commands are used to verify that your domain's DNS records (nameservers, A records, CNAME records) are correctly configured to point to Vercel's expected values (`76.76.21.21` for A records or `cname.vercel-dns.com` for CNAME records). This is crucial for resolving 'Invalid Configuration' alerts.
SOURCE: https://vercel.com/docs/domains/troubleshooting

LANGUAGE: Shell
CODE:
```
dig [example.com]
dig ns [domain]
dig a [apex domain e.g. example.com]
dig cname [subdomain e.g. www.example.com]
```

----------------------------------------

TITLE: Install Vercel CLI globally with pnpm
DESCRIPTION: This command installs the latest version of the Vercel command-line interface globally using pnpm. The Vercel CLI is required to pull environment variables from ButterCMS into your Vercel project.
SOURCE: https://vercel.com/docs/integrations/cms/butter-cms

LANGUAGE: Shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Create Client-Side File Upload Page (Next.js /app)
DESCRIPTION: This React component, designed for Next.js's `/app` directory, illustrates how to build a client-side page for direct file uploads to Vercel Blob. It uses React hooks like `useRef` for file input and `useState` to manage the upload result, with the `upload` function handling the secure token exchange with a serverless function.
SOURCE: https://vercel.com/docs/vercel-blob/client-upload

LANGUAGE: typescript
CODE:
```
'use client';
 
import { type PutBlobResult } from '@vercel/blob';
import { upload } from '@vercel/blob/client';
import { useState, useRef } from 'react';
 
export default function AvatarUploadPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  return (
    <>
      <h1>Upload Your Avatar</h1>
 
      <form
        onSubmit={async (event) => {
          event.preventDefault();
 
          if (!inputFileRef.current?.files) {
            throw new Error('No file selected');
          }
 
          const file = inputFileRef.current.files[0];
 
          const newBlob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/avatar/upload',
          });
 
          setBlob(newBlob);
        }}
      >
        <input name="file" ref={inputFileRef} type="file" required />
        <button type="submit">Upload</button>
      </form>
      {blob && (
        <div>
          Blob url: <a href={blob.url}>{blob.url}</a>
        </div>
      )}
    </>
  );
}
```

----------------------------------------

TITLE: Providing Build Environment Variables for Vercel Deployment
DESCRIPTION: Deploys a Vercel project while providing environment variables to the build step using the `--build-env` option (shorthand `-b`).
SOURCE: https://vercel.com/docs/cli/deploy

LANGUAGE: Shell
CODE:
```
vercel --build-env KEY1=value1 --build-env KEY2=value2
```

----------------------------------------

TITLE: Adding Vercel Environment Variables with Specific Scopes
DESCRIPTION: Provides various ways to add environment variables to a Vercel Project, including adding to all environments, a specific environment, a specific Git branch, or using content from a local file or piped input as the variable's value.
SOURCE: https://vercel.com/docs/cli/env

LANGUAGE: Shell
CODE:
```
vercel env add [name]
```

LANGUAGE: Shell
CODE:
```
vercel env add [name] [environment]
```

LANGUAGE: Shell
CODE:
```
vercel env add [name] [environment] [gitbranch]
```

LANGUAGE: Shell
CODE:
```
vercel env add [name] [environment] < [file]
```

LANGUAGE: Shell
CODE:
```
echo [value] | vercel env add [name] [environment]
```

LANGUAGE: Shell
CODE:
```
vercel env add [name] [environment] [gitbranch] < [file]
```

----------------------------------------

TITLE: Configure Custom Response Headers in Vercel
DESCRIPTION: This example demonstrates how to define custom HTTP response headers for various routes, including static files, Serverless Functions, and wildcard paths, using the `headers` property in `vercel.json`. It shows setting `Cache-Control`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and conditional headers based on query parameters.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/:path*",
      "has": [
        {
          "type": "query",
          "key": "authorized"
        }
      ],
      "headers": [
        {
          "key": "x-authorized",
          "value": "true"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Vercel Functions: Extend Request Lifetime with waitUntil()
DESCRIPTION: This method allows you to extend the lifetime of a request handler for the duration of a given Promise. It's useful for tasks that can be performed after the response is sent, such as logging or updating a cache.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: APIDOC
CODE:
```
waitUntil(): Extends the lifetime of a request handler for the duration of a given Promise.
```

----------------------------------------

TITLE: Configuring Custom Response Headers
DESCRIPTION: Explains methods for assigning custom headers to responses, either through `next.config.js` for Next.js, `vercel.json` for other projects, or directly via Serverless Functions. Notes reserved headers that cannot be modified.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
Custom Headers Configuration:
  - Next.js projects: `headers` property in `next.config.js`.
  - Other projects: `headers` property in `vercel.json`.
  - Serverless Functions: Assign headers to the `Response` object.
  Reserved headers (cannot be modified): `x-matched-path`, `server`, `content-length`.
```

----------------------------------------

TITLE: Login to Vercel CLI interactively
DESCRIPTION: Executes the `vercel login` command without arguments, prompting the user to select a login method interactively.
SOURCE: https://vercel.com/docs/cli/login

LANGUAGE: bash
CODE:
```
vercel login
```

----------------------------------------

TITLE: Accessing Vercel Project Production URL in Next.js
DESCRIPTION: This environment variable provides a production domain name for the project, selecting the shortest custom domain or `vercel.app` domain. It is always set, even in preview deployments, making it reliable for generating links that point to production, such as OG-image URLs.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Plaintext
CODE:
```
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Implement Edge Middleware for Geolocation-Based Rewriting
DESCRIPTION: Defines a Next.js Edge Middleware (`middleware.ts`) that checks the visitor's country using `@vercel/functions`. If the visitor is from a specified blocked country, the request is rewritten to the `/login` page; otherwise, it proceeds to the `/secret-page`.
SOURCE: https://vercel.com/docs/edge-middleware/quickstart

LANGUAGE: TypeScript
CODE:
```
import { NextRequest, NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions';
 
// The country to block from accessing the secret page
const BLOCKED_COUNTRY = 'SE';
 
// Trigger this middleware to run on the `/secret-page` route
export const config = {
  matcher: '/secret-page',
};
 
export default function middleware(request: NextRequest) {
  // Extract country. Default to US if not found.
  const { country = 'US' } = geolocation(request);
 
  console.log(`Visitor from ${country}`);
 
  // Specify the correct route based on the requests location
  if (country === BLOCKED_COUNTRY) {
    request.nextUrl.pathname = '/login';
  } else {
    request.nextUrl.pathname = `/secret-page`;
  }
 
  // Rewrite to URL
  return NextResponse.rewrite(request.nextUrl);
}
```

----------------------------------------

TITLE: Pull Vercel Environment Variables for Local Development
DESCRIPTION: This CLI command downloads environment variables, including the `VERCEL_OIDC_TOKEN`, that are targeted for the `development` environment. It writes these variables to the `.env.local` file within your project folder, facilitating local development access without requiring the storage of long-lived credentials.
SOURCE: https://vercel.com/docs/oidc

LANGUAGE: CLI
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Vercel Blob: `upload()` Method API Reference
DESCRIPTION: The `upload` method facilitates client-side file uploads to Vercel Blob storage. It first fetches a client token from your server using `handleUploadUrl` and then proceeds to upload the blob. It supports various body types and offers extensive options for controlling the upload process.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: APIDOC
CODE:
```
upload(pathname, body, options);

Parameters:
  pathname: (Required) string
    Description: A string specifying the base value of the return URL.
  body: (Required) ReadableStream | String | ArrayBuffer | Blob
    Description: A blob object based on supported body types (https://developer.mozilla.org/docs/Web/API/fetch#body).
  options: (Required) JSON object
    Parameters:
      access: (Required) "public"
      contentType: (Optional) string
        Description: A string indicating the media type (https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Type). By default, it's extracted from the pathname's extension.
      handleUploadUrl: (Required*) string
        Description: A string specifying the route to call for generating client tokens for client uploads.
      clientPayload: (Optional) string
        Description: A string to be sent to your `handleUpload` server code. Example use-case: attaching the post id an image relates to. So you can use it to update your database.
      multipart: (Optional) boolean
        Description: Pass `multipart: true` when uploading large files. It will split the file into multiple parts, upload them in parallel and retry failed parts.
      abortSignal: (Optional) AbortSignal
        Description: An AbortSignal (https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to cancel the operation.
      onUploadProgress: (Optional) function
        Description: Callback to track upload progress: `onUploadProgress({loaded: number, total: number, percentage: number})`.

Returns: JSON object
  pathname: string
  contentType: string
  contentDisposition: string
  url: string
  downloadUrl: string

Example URL:
  "https://ce0rcu23vrrdzqap.public.blob.vercel-storage.com/profilesv1/user-12345-NoOVGDVcqSPc7VYCUAGnTzLTG2qEM2.txt"
```

----------------------------------------

TITLE: Verify HMAC Token and Generate Open Graph Image in Next.js App Router
DESCRIPTION: This Next.js App Router API route (`/api/encrypted`) demonstrates how to secure Open Graph (OG) images using HMAC token verification. It imports a secret key, defines a `toHex` utility, and in the `GET` handler, retrieves `id` and `token` from the request URL. It then generates a `verifyToken` using HMAC-SHA256 with the `id` and compares it to the provided `token`. If valid, it returns an `ImageResponse` displaying the `id`; otherwise, it returns a 401 Unauthorized response. This prevents unauthorized generation of OG images.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: typescript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
const key = crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode('my_secret'),
  { name: 'HMAC', hash: { name: 'SHA-256' } },
  false,
  ['sign'],
);
 
function toHex(arrayBuffer: ArrayBuffer) {
  return Array.prototype.map
    .call(new Uint8Array(arrayBuffer), (n) => n.toString(16).padStart(2, '0'))
    .join('');
}
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
 
  const id = searchParams.get('id');
  const token = searchParams.get('token');
 
  const verifyToken = toHex(
    await crypto.subtle.sign(
      'HMAC',
      await key,
      new TextEncoder().encode(JSON.stringify({ id })),
    ),
  );
 
  if (token !== verifyToken) {
    return new Response('Invalid token.', { status: 401 });
  }
 
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h1>Card generated, id={id}.</h1>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

----------------------------------------

TITLE: Configure Azure Pipeline for Vercel Deployment
DESCRIPTION: This YAML configuration defines an Azure Pipeline that triggers on changes to the 'main' branch. It utilizes the 'vercel-deployment-task' to deploy to Vercel, requiring 'vercelProjectId', 'vercelOrgId', and a secret 'vercelToken' as inputs. The 'production' flag ensures a production deployment.
SOURCE: https://vercel.com/docs/git/vercel-for-azure-pipelines

LANGUAGE: YAML
CODE:
```
trigger:
- main
 
pool:
  vmImage: ubuntu-latest
 
steps:
- task: vercel-deployment-task@1
  inputs:
    vercelProjectId: 'prj_mtYj0MP83muZkYDs2DIDfasdas' //Example Vercel Project ID
    vercelOrgId: '3Gcd2ASTsPxwxTsYBwJTB11p' //Example Vercel Personal Account ID
    vercelToken: $(VERCEL_TOKEN)
    production: true
```

----------------------------------------

TITLE: Configure Vercel Deployment with GitHub Actions
DESCRIPTION: This guide outlines the steps to set up a GitHub Action workflow for building and deploying a Vercel application, particularly useful for GitHub Enterprise Server (GHES) or custom CI/CD. It involves installing the Vercel CLI, pulling environment variables, building the project, and then deploying the pre-built output to Vercel.
SOURCE: https://vercel.com/docs/git/vercel-for-github

LANGUAGE: Shell
CODE:
```
npm install --global vercel@latest
vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
vercel build
vercel deploy --prebuilt
```

----------------------------------------

TITLE: Accessing the 'host' Header in Vercel Functions
DESCRIPTION: This header represents the domain name as it was accessed by the client. If the deployment has been assigned to a preview URL or production domain and the client visits the domain URL, it contains the custom domain instead of the underlying deployment URL. The code demonstrates how to retrieve and use the `host` header from the `Request` object in a Vercel Function.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

----------------------------------------

TITLE: Serve Country-Specific Content with Vary Header in Next.js
DESCRIPTION: This Next.js example demonstrates using the `Vary` header with `X-Vercel-IP-Country` to serve country-specific content from the cache. It retrieves the user's country from the request headers and returns different messages, ensuring that Vercel's Edge Network caches distinct responses for each country.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: TypeScript
CODE:
```
import { type NextRequest } from 'next/server';
 
export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';
 
  // Serve different content based on country
  let content;
  if (country === 'US') {
    content = { message: 'Hello from the United States!' };
  } else if (country === 'GB') {
    content = { message: 'Hello from the United Kingdom!' };
  } else {
    content = { message: `Hello from ${country}!` };
  }
 
  return Response.json(content, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=3600',
      Vary: 'X-Vercel-IP-Country'
    }
  });
}
```

----------------------------------------

TITLE: Set Vary Header in Next.js Vercel Function
DESCRIPTION: Demonstrates how to set the `Vary` and `Cache-Control` headers in a Next.js API route (Vercel Function) to ensure responses vary by country and are cached for a specific duration. This approach is suitable for dynamic content that depends on request attributes.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: TypeScript
CODE:
```
import { type NextRequest } from 'next/server';
 
export async function GET(request: NextRequest) {
  return Response.json(
    { data: 'This response varies by country' },
    {
      status: 200,
      headers: {
        Vary: 'X-Vercel-IP-Country',
        'Cache-Control': 's-maxage=3600',
      },
    },
  );
}
```

----------------------------------------

TITLE: Caching External Rewrites using Vercel Configuration
DESCRIPTION: When direct API modification is not possible, this `vercel.json` configuration sets `CDN-Cache-Control` headers for specific API paths. This enables caching of external API responses at the edge for a defined duration, improving performance.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "CDN-Cache-Control",
          "value": "max-age=60"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Configure Vercel Cache Control Headers in Next.js
DESCRIPTION: This Next.js example demonstrates how to set `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` headers in an API route. It configures distinct Time-To-Live (TTL) values for client browsers (10s), downstream CDNs (60s), and Vercel's Edge Cache (3600s) to manage content caching behavior.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JavaScript
CODE:
```
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600'
    }
  });
}
```

----------------------------------------

TITLE: Configuring Nuxt Route Rules for Advanced Routing
DESCRIPTION: This example showcases the use of the `routeRules` option within the Nuxt configuration. It demonstrates how to implement redirects, modify HTTP response headers for specific paths, and disable server-side rendering (`ssr: false`) for client-side only routes, providing granular control over route behavior.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
export default defineNuxtConfig({
  routeRules: {
    '/examples/*': { redirect: '/redirect-route' },
    '/modify-headers-route': { headers: { 'x-magic-of': 'nuxt and vercel' } },
    // Enables client-side rendering
    '/spa': { ssr: false }
  }
});
```

----------------------------------------

TITLE: Example: Setting Multiple Cache-Control Headers in a Vercel Function
DESCRIPTION: Demonstrates how to set `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` headers in a Next.js API route to define different TTLs for clients, downstream CDNs, and Vercel's Edge Cache.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: JavaScript
CODE:
```
export async function GET() {
  return new Response('Cache Control example', {
    status: 200,
    headers: {
      'Cache-Control': 'max-age=10',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=3600'
    }
  });
}
```

----------------------------------------

TITLE: Configure Next.js `Image` Component for Remote Images
DESCRIPTION: Example demonstrating the usage of the `next/image` component with a remote image URL. For remote images, `src`, `alt`, `width`, and `height` props are required to ensure proper optimization and display.
SOURCE: https://vercel.com/docs/image-optimization/quickstart

LANGUAGE: JSX
CODE:
```
<Image
  src="https://images.unsplash.com/photo-1627843240167-b1f9d28f732e"
  alt="Picture of a triangle"
  width={500}
  height={500}
/>
```

----------------------------------------

TITLE: Create a Basic Vercel Function with Node.js/TypeScript
DESCRIPTION: Demonstrates a simple Vercel Function using Node.js, returning 'Hello from Vercel!'. This is the default runtime. For non-framework projects, configure `"type": "module"` in `package.json` or use `.mjs` file extensions.
SOURCE: https://vercel.com/docs/functions/configuring-functions/runtime

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

----------------------------------------

TITLE: List Blobs and Generate Force-Download URLs
DESCRIPTION: This JavaScript example illustrates how to retrieve a list of all blobs from Vercel Blob storage using the `list` function. It then iterates through the returned blobs, creating an anchor tag for each, where the `href` is set to `blob.downloadUrl` to ensure that clicking the link always triggers a file download, regardless of the blob's MIME type.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: JavaScript
CODE:
```
import { list } from '@vercel/blob';
 
export default async function Page() {
  const response = await list();
 
  return (
    <>
      {response.blobs.map((blob) => (
        <a key={blob.pathname} href={blob.downloadUrl}>
          {blob.pathname}
        </a>
      ))}
    </>
  );
}
```

----------------------------------------

TITLE: Install Vercel CLI globally using pnpm
DESCRIPTION: To enable pulling environment variables from Sanity into your Vercel project, you must first install the Vercel CLI. This command uses pnpm to install the latest version of the Vercel CLI globally on your system.
SOURCE: https://vercel.com/docs/integrations/cms/sanity

LANGUAGE: Shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Vercel Request Body Parsing Rules by Content-Type
DESCRIPTION: Details how Vercel automatically parses the `request.body` property based on the `Content-Type` header of the incoming request, providing different data types for common content types.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: APIDOC
CODE:
```
`Content-Type` header | Value of `request.body`
--- | ---
No header | `undefined`
`application/json` | An object representing the parsed JSON sent by the request.
`application/x-www-form-urlencoded` | An object representing the parsed data sent by with the request.
`text/plain` | A string containing the text sent by the request.
`application/octet-stream` | A [Buffer](https://nodejs.org/api/buffer.html) containing the data sent by the request.
```

----------------------------------------

TITLE: Enable Incremental Static Regeneration (ISR) with Next.js fetch
DESCRIPTION: This code snippet demonstrates how to enable Incremental Static Regeneration (ISR) in Next.js applications using the `app` router. By adding a `revalidate` property to the `next` option in a `fetch` request, content can be updated without redeploying the site. The `revalidate` value specifies the time in seconds after which a cached page will be re-generated, improving performance and ensuring content freshness.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: JavaScript
CODE:
```
await fetch('https://api.vercel.app/blog', {
  next: { revalidate: 10 }, // Seconds
});
```

----------------------------------------

TITLE: Update Azure Pipeline for Vercel Deployments
DESCRIPTION: This YAML configuration updates the `vercel-pipelines.yml` file to enable full-featured Azure Pipeline deployments. It configures triggers for the `main` branch, defines variables for main branch detection, and includes steps for Vercel deployment and Azure DevOps pull request commenting. The `vercel-deployment-task` handles conditional deployments based on the branch or pull request reason, while `vercel-azdo-pr-comment-task` reports deployment URLs back to pull requests using an `AZURE_TOKEN`.
SOURCE: https://vercel.com/docs/git/vercel-for-azure-pipelines

LANGUAGE: YAML
CODE:
```
trigger:
- main
 
pool:
  vmImage: ubuntu-latest
 
variables:
  isMain: $[eq(variables['Build.SourceBranch'], 'refs/heads/main')]
 
steps:
- task: vercel-deployment-task@1
  name: 'Deploy'
  inputs:
    condition: or(eq(variables.isMain, true), eq(variables['Build.Reason'], 'PullRequest'))
    vercelProjectId: 'azure-devops-extension'
    vercelOrgId: '3Gcd2ASTsPxwxTsYBwJTB11p' //Example Vercel Personal Account ID
    vercelToken: $(VERCEL_TOKEN)
    production: $(isMain)
- task: vercel-azdo-pr-comment-task@1
  inputs:
    azureToken: $(AZURE_TOKEN)
    deploymentTaskMessage: $(Deploy.deploymentTaskMessage)
```

----------------------------------------

TITLE: Create a Next.js Project with TypeScript
DESCRIPTION: This command initializes a new Next.js project with TypeScript support, providing a foundational setup for web application development.
SOURCE: https://vercel.com/docs/functions/quickstart

LANGUAGE: Shell
CODE:
```
npx create-next-app@latest --typescript
```

----------------------------------------

TITLE: Next.js App Router ISR Example with `revalidate`
DESCRIPTION: This Next.js App Router example demonstrates how to implement Incremental Static Regeneration (ISR) by setting the `revalidate` export constant. It fetches blog post data from an API, ensuring the page is re-generated every 10 seconds to display updated content without a full redeployment.
SOURCE: https://vercel.com/docs/incremental-static-regeneration

LANGUAGE: TypeScript
CODE:
```
export const revalidate = 10; // seconds
 
interface Post {
  title: string;
  id: number;
}
 
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog');
  const posts = (await res.json()) as Post[];
  return (
    <ul>
      {posts.map((post: Post) => {
        return <li key={post.id}>{post.title}</li>;
      })}
    </ul>
  );
}
```

----------------------------------------

TITLE: Deploy Vercel project using CLI
DESCRIPTION: Deploy your application to Vercel's global Edge Network by running the `vercel deploy` command from your terminal. This action makes your app live and ready to begin tracking performance metrics.
SOURCE: https://vercel.com/docs/speed-insights/quickstart

LANGUAGE: Shell
CODE:
```
vercel deploy
```

----------------------------------------

TITLE: Link Vercel Project to current directory
DESCRIPTION: Links the current local directory to a Vercel Project. This command initiates an interactive process to select or create a project.
SOURCE: https://vercel.com/docs/cli/link

LANGUAGE: bash
CODE:
```
vercel link
```

----------------------------------------

TITLE: Next.js: Image Optimization with next/image Component
DESCRIPTION: The `next/image` component in Next.js facilitates automatic image optimization when deploying to Vercel, reducing image sizes and converting them to modern formats. This feature significantly improves page load performance and Core Web Vitals without requiring additional services or complex setup, ensuring great performance by default.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: React
CODE:
```
import Image from 'next/image'
 
interface ExampleProps {
  name: string;
}
 
const ExampleComponent = (props: ExampleProps) : => {
  return (
    <>
      <Image
        src="example.png"
        alt="Example picture"
        width={500}
        height={500}
      />
      <span>{props.name}</span>
    </>
  )
}
```

----------------------------------------

TITLE: Configure WAF for Rate Limiting Authentication Endpoints (JSON)
DESCRIPTION: This custom WAF rule implements rate limiting on authentication-related endpoints (register, signup, login, signin) to prevent abuse and brute-force attacks. It uses a fixed-window algorithm, allowing 10 requests per 60 seconds per IP address, and denies requests exceeding this limit.
SOURCE: https://vercel.com/docs/vercel-firewall/vercel-waf/examples

LANGUAGE: JSON
CODE:
```
{
  "name": "Auth Abuse Prevention",
  "active": true,
  "description": "Limits requests to registration and login endpoints to prevent abuse and brute force attacks",
  "action": {
    "mitigate": {
      "redirect": null,
      "action": "rate_limit",
      "rateLimit": {
        "algo": "fixed_window",
        "window": 60,
        "limit": 10,
        "keys": [
          "IP Address"
        ],
        "action": "deny"
      },
      "actionDuration": null
    }
  },
  "id": "",
  "conditionGroup": [
    {
      "conditions": [
        {
          "op": "re",
          "type": "path",
          "value": "^/api/auth/(?:register|signup|login|signin)$"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Create Vercel API Route for AI Agent with Tools
DESCRIPTION: This TypeScript code defines a Vercel API route (`POST`) for an AI agent. It uses `@ai-sdk/openai` to generate text, incorporates `zod` for tool parameter validation, and includes example tools for fetching weather and activities. The `maxDuration` is set to 30 seconds, leveraging Vercel's fluid compute for efficient execution.
SOURCE: https://vercel.com/docs/agents

LANGUAGE: TypeScript
CODE:
```
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { tool } from 'ai';
 
export const maxDuration = 30;
 
export const POST = async (request: Request) => {
  const { prompt }: { prompt?: string } = await request.json();
 
  if (!prompt) {
    return new Response('Prompt is required', { status: 400 });
  }
 
  const result = await generateText({
    model: openai('gpt-4.1'),
    prompt,
    maxSteps: 2,
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for')
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10
        })
      }),
      activities: tool({
        description: 'Get the activities in a location',
        parameters: z.object({
          location: z
            .string()
            .describe('The location to get the activities for')
        }),
        execute: async ({ location }) => ({
          location,
          activities: ['hiking', 'swimming', 'sightseeing']
        })
      })
    }
  });
 
  return Response.json({
    steps: result.steps,
    finalAnswer: result.text
  });
};
```

----------------------------------------

TITLE: Create OG Image API Endpoint with Next.js App Router
DESCRIPTION: Define an API route (route.tsx) under app/api/og to generate Open Graph images. This example uses `next/og` to return an `ImageResponse` with a simple 'Hello' message, styled with inline CSS.
SOURCE: https://vercel.com/docs/og-image-generation

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        👋 Hello
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

----------------------------------------

TITLE: Fetch Data from Contentful GraphQL API in Next.js
DESCRIPTION: This asynchronous function demonstrates how to fetch data from Contentful's GraphQL API within a Next.js application. It uses `fetch` with a POST request, setting `Content-Type` and `Authorization` headers. Environment variables (`CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN`) are used for secure access to the Contentful space.
SOURCE: https://vercel.com/docs/integrations/cms/contentful

LANGUAGE: JavaScript
CODE:
```
async function fetchGraphQL(query) {
  return fetch(
    `https://graphql.contentful.com/content/v1/repos/${process.env.CONTENTFUL_SPACE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CONTENTFUL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    },
  ).then((response) => response.json());
}
```

----------------------------------------

TITLE: Validate Vercel Webhook Requests with x-vercel-signature in Next.js
DESCRIPTION: This example demonstrates how to validate incoming Vercel webhook requests using the `x-vercel-signature` header and a client secret. It leverages Node.js's `crypto` module to compute an HMAC SHA1 hexdigest of the raw request body and compares it with the signature provided in the header. The snippet is designed for Next.js (`/app` directory) and includes basic error handling for missing secrets and signature mismatches.
SOURCE: https://vercel.com/docs/webhooks/webhooks-api

LANGUAGE: TypeScript
CODE:
```
import crypto from 'crypto';
 
export async function GET(request: Request) {
  const { INTEGRATION_SECRET } = process.env;
 
  if (typeof INTEGRATION_SECRET != 'string') {
    throw new Error('No integration secret found');
  }
 
  const rawBody = await request.text();
  const rawBodyBuffer = Buffer.from(rawBody, 'utf-8');
  const bodySignature = sha1(rawBodyBuffer, INTEGRATION_SECRET);
 
  if (bodySignature !== request.headers.get('x-vercel-signature')) {
    return Response.json({
      code: 'invalid_signature',
      error: "signature didn't match"
    });
  }
 
  const json = JSON.parse(rawBodyBuffer.toString('utf-8'));
 
  switch (json.type) {
    case 'project.created':
    // ...
  }
 
  return new Response('Webhook request validated', {
    status: 200
  });
}
 
function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}
```

----------------------------------------

TITLE: Example Content Security Policy Header
DESCRIPTION: This CSP header defines a policy that permits all content to be loaded only from the site's own origin by default. It specifically allows scripts from the site's own origin and `cdn.example.com`, images from the site's own origin and `img.example.com`, and styles only from the site's own origin. This demonstrates a common pattern for restricting content sources and mitigating XSS risks.
SOURCE: https://vercel.com/docs/headers/security-headers

LANGUAGE: HTTP Header
CODE:
```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; img-src 'self' img.example.com; style-src 'self';
```

----------------------------------------

TITLE: Vercel CLI Command: vercel login
DESCRIPTION: Learn how to login into your Vercel account using the vercel login CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel login
```

----------------------------------------

TITLE: Next.js App Router: Tag-based Data Revalidation (Fetching)
DESCRIPTION: This example illustrates how to associate custom tags with fetched data in a Next.js App Router page component. The `tags` option allows for granular control, enabling on-demand invalidation of specific cached data by calling `revalidateTag` with the corresponding tag, such as 'blog'.
SOURCE: https://vercel.com/docs/data-cache

LANGUAGE: JavaScript
CODE:
```
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      tags: ['blog'], // Invalidate with revalidateTag('blog') on-demand
    },
  });
  const data = await res.json();
 
  return '...';
}
```

----------------------------------------

TITLE: Set Up Next.js API Route for xAI Chat Streaming
DESCRIPTION: This TypeScript code snippet demonstrates how to create a Next.js API route (`/app/api/chat/route.ts`) to stream text responses from the xAI model. It extracts messages from the request body, calls the `xai` model (specifically 'grok-2-1212'), and returns a data stream response, allowing for real-time chat interactions.
SOURCE: https://vercel.com/docs/ai/xai

LANGUAGE: TypeScript
CODE:
```
// app/api/chat/route.ts
import { xai } from '@ai-sdk/xai';import { streamText } from 'ai';
// Allow streaming responses up to 30 secondsexport const maxDuration = 30;
export async function POST(req: Request) {  // Extract the `messages` from the body of the request  const { messages } = await req.json();
  // Call the language model  const result = streamText({    model: xai('grok-2-1212'),    messages,  });
  // Respond with the stream  return result.toDataStreamResponse();}
```

----------------------------------------

TITLE: Conditional Rewrite Based on Missing Cookie
DESCRIPTION: This example rewrites requests to the path `/dashboard` from your site's root that does not have a cookie with key `auth_token` to the path `/login` relative to your site's root.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/dashboard",
      "missing": [
        {
          "type": "cookie",
          "key": "auth_token"
        }
      ],
      "destination": "/login"
    }
  ]
}
```

----------------------------------------

TITLE: Vercel CLI Command: vercel dev
DESCRIPTION: Learn how to replicate the Vercel deployment environment locally and test your Vercel Project before deploying using the vercel dev CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel dev
```

----------------------------------------

TITLE: Install Vercel CLI Globally with pnpm
DESCRIPTION: This command installs or updates the Vercel command-line interface globally using pnpm, ensuring the latest version is available for project management and integration with Vercel services.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/hypertune-edge-config

LANGUAGE: shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Create Client Upload API Route (Next.js /app)
DESCRIPTION: This Next.js API route, intended for the `/app` directory, manages the server-side responsibilities for client uploads. It generates secure tokens for the browser to initiate uploads and provides a callback (`onUploadCompleted`) to notify your server upon successful upload, allowing for database updates or other post-upload processing.
SOURCE: https://vercel.com/docs/vercel-blob/client-upload

LANGUAGE: typescript
CODE:
```
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
 
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname,
        /* clientPayload */
      ) => {
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
 
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            // optional, sent to your server on upload completion
            // you could pass a user id from auth, or a value from clientPayload
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow
 

```

----------------------------------------

TITLE: Cache-Control Directive: s-maxage
DESCRIPTION: Explains the `s-maxage` directive, which sets the number of seconds a response is considered 'fresh' by the Edge Network. After this period, Vercel's Edge Network serves stale responses while asynchronously revalidating with a fresh response.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
s-maxage:
  Description: Sets the maximum age for a resource in a shared cache (like Vercel's Edge Network).
  Consumed by: Vercel's proxy
  Included in client response: No
  Min value: 1 second
  Max value: 31536000 seconds (1 year)
```

----------------------------------------

TITLE: Adjust Content Security Policy for Vercel Toolbar
DESCRIPTION: If a Content Security Policy (CSP) is configured, specific directives must be adjusted to allow the Vercel Toolbar and Comments to function correctly. These adjustments ensure that necessary scripts, connections, images, frames, styles, and fonts are permitted.
SOURCE: https://vercel.com/docs/vercel-toolbar/managing-toolbar

LANGUAGE: HTTP Headers
CODE:
```
script-src https://vercel.live
```

LANGUAGE: HTTP Headers
CODE:
```
connect-src https://vercel.live wss://ws-us3.pusher.com
```

LANGUAGE: HTTP Headers
CODE:
```
img-src https://vercel.live https://vercel.com data: blob:
```

LANGUAGE: HTTP Headers
CODE:
```
frame-src https://vercel.live
```

LANGUAGE: HTTP Headers
CODE:
```
style-src https://vercel.live 'unsafe-inline'
```

LANGUAGE: HTTP Headers
CODE:
```
font-src https://vercel.live https://assets.vercel.com
```

----------------------------------------

TITLE: Generate HMAC Token for Secure Open Graph Image URL in Next.js App Router
DESCRIPTION: This Next.js App Router dynamic page (`/app/encrypted/[id]/page.tsx`) is responsible for generating an HMAC token for a given `id` parameter. It uses Node.js's `createHmac` to generate a SHA256 hash of the `id` using a shared secret. The page then constructs and displays a link to the secured `/api/encrypted` endpoint, including both the `id` and the generated `token`. This ensures that only URLs with valid, pre-generated tokens can access the secured OG image API.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: typescript
CODE:
```
// This page generates the token to prevent generating OG images with random parameters (`id`).
import { createHmac } from 'node:crypto';
 
function getToken(id: string): string {
  const hmac = createHmac('sha256', 'my_secret');
  hmac.update(JSON.stringify({ id: id }));
  const token = hmac.digest('hex');
  return token;
}
 
interface PageParams {
  params: {
    id: string;
  };
}
 
export default function Page({ params }: PageParams) {
  console.log(params);
  const { id } = params;
  const token = getToken(id);
 
  return (
    <div>
      <h1>Encrypted Open Graph Image.</h1>
      <p>Only /a, /b, /c with correct tokens are accessible:</p>
      <a
        href={`/api/encrypted?id=${id}&token=${token}`}
        target="_blank"
        rel="noreferrer"
      >
        <code>
          /api/encrypted?id={id}&token={token}
        </code>
      </a>
    </div>
  );
}
```

----------------------------------------

TITLE: Consume Hypertune Flags in a React Component
DESCRIPTION: This TypeScript React component demonstrates how to consume a declared Hypertune feature flag (exampleFlag) within an asynchronous function component. It checks the flag's state and conditionally renders text based on whether the flag is enabled or disabled.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/hypertune-edge-config

LANGUAGE: typescript
CODE:
```
import { exampleFlag } from '@/flags';
 
export default async function Home() {
  const isExampleFlagEnabled = await exampleFlag();
  return <div>Example Flag is {isExampleFlagEnabled ? 'enabled' : 'disabled'}</div>;
}
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: Installs the latest version of the Vercel command-line interface globally using pnpm. This CLI is essential for managing Vercel projects and interacting with Vercel services, including pulling environment variables from integrations like Agility CMS.
SOURCE: https://vercel.com/docs/integrations/cms/agility-cms

LANGUAGE: shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: AWS IAM Trust Policy for Flexible OIDC Federation
DESCRIPTION: This JSON policy defines a more flexible trust relationship for an AWS IAM role, allowing any project within a Vercel team to assume the role for "preview" and "production" environments via OIDC federation. It uses "StringLike" for the "sub" claim to match multiple project and environment combinations.
SOURCE: https://vercel.com/docs/oidc/aws

LANGUAGE: JSON
CODE:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[TEAM_SLUG]"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com/[TEAM_SLUG]:aud": "https://vercel.com/[TEAM SLUG]"
        },
        "StringLike": {
          "oidc.vercel.com/[TEAM_SLUG]:sub": [
            "owner:[TEAM SLUG]:project:*:environment:preview",
            "owner:[TEAM SLUG]:project:*:environment:production"
          ]
        }
      }
    }
  ]
}
```

----------------------------------------

TITLE: Install Vercel CLI for Makeswift Integration
DESCRIPTION: To enable the pulling of environment variables from Makeswift into your Vercel project, you must first install the Vercel CLI. Run the following command in your terminal to install the latest version globally using pnpm.
SOURCE: https://vercel.com/docs/integrations/cms/makeswift

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: TypeScript: Delete Blob in Next.js API Route
DESCRIPTION: Provides a Next.js API route example demonstrating how to delete a blob from Vercel Blob storage. It uses the `del` function from `@vercel/blob` and retrieves the URL to delete from request search parameters.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: TypeScript
CODE:
```
import { del } from '@vercel/blob';
 
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlToDelete = searchParams.get('url') as string;
  await del(urlToDelete);
 
  return new Response();
}
```

----------------------------------------

TITLE: Accessing the 'x-forwarded-for' Header (Client IP) in Vercel Functions
DESCRIPTION: This header provides the public IP address of the client that made the request. If you are trying to use Vercel behind a proxy, Vercel currently overwrites this header and does not forward external IPs to prevent IP spoofing. The code shows how to retrieve and use the `x-forwarded-for` header from the `Request` object in a Vercel Function.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

----------------------------------------

TITLE: Example cURL Request for Streaming Vercel v0 Chat Completions
DESCRIPTION: This cURL command shows how to request a streaming response from the Vercel v0 Chat Completions API. It sets the `stream` parameter to `true` in the request body to receive data chunks as Server-Sent Events.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: Shell
CODE:
```
curl https://api.v0.dev/v1/chat/completions \
  -H "Authorization: Bearer $V0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "v0-1.0-md",
    "stream": true,
    "messages": [
      { "role": "user", "content": "Add login to my Next.js app" }
    ]
  }'
```

----------------------------------------

TITLE: Manually Create OpenTelemetry Spans for Requests
DESCRIPTION: This code demonstrates how to manually create and manage OpenTelemetry spans for individual requests in a JavaScript/TypeScript environment. It uses `@opentelemetry/api` to get a tracer, start an active span, handle potential errors by recording exceptions, and set span status before ending the span. This approach is necessary for non-Next.js frameworks or Next.js versions older than 13.4.
SOURCE: https://vercel.com/docs/otel

LANGUAGE: JavaScript
CODE:
```
import { trace, context } from '@opentelemetry/api';
 
export default async function getUser(_request, response) {
  const tracer = trace.getTracer('your-project-name');
  tracer.startActiveSpan(name, async (span) => {
    try {
      const result = someFnThatMightThrowError(span);
      span.end();
      return result;
    } catch (e) {
      span.recordException(e);
      span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
      throw e;
    }
  });
}
```

----------------------------------------

TITLE: AWS IAM Trust Policy for OIDC Federation (Global Issuer)
DESCRIPTION: An AWS IAM trust policy example for OIDC federation when the issuer mode is set to global. This policy allows `sts:AssumeRoleWithWebIdentity` and includes conditions to support both old and new team/project slugs and names, ensuring continued access after renaming.
SOURCE: https://vercel.com/docs/oidc/reference

LANGUAGE: JSON
CODE:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com:aud": [
            "https://vercel.com/[OLD_TEAM_SLUG]",
            "https://vercel.com/[NEW_TEAM_SLUG]"
          ],
          "oidc.vercel.com:sub": [
            "owner:[OLD_TEAM_SLUG]:project:[OLD_PROJECT_NAME]:environment:production",
            "owner:[NEW_TEAM_SLUG]:project:[NEW_PROJECT_NAME]:environment:production"
          ]
        }
      }
    }
  ]
}
```

----------------------------------------

TITLE: Create Vercel Function with Node.js Request/Response Objects (TypeScript)
DESCRIPTION: This example illustrates an alternative Node.js handler that uses the standard Node.js `Request` and `Response` objects, specifically `VercelRequest` and `VercelResponse`. It processes a 'name' query parameter and sends a personalized greeting using `res.writeHead`, `res.write`, and `res.end`.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: TypeScript
CODE:
```
import { VercelRequest, VercelResponse } from '@vercel/node';
 
export default function handler(req: VercelRequest, res: VercelResponse) {
  const name = req.query.name ?? 'World';
  res.writeHead(200);
  res.write(`Hello ${name}!`);
  res.end();
}
```

----------------------------------------

TITLE: Configure WAF for Emergency Redirect (JSON)
DESCRIPTION: This custom WAF rule redirects requests to a specific path, such as '/conference-login', to an alternative location like '/old-conf-login'. This can be used for emergency site maintenance, temporary page unavailability, or redirecting deprecated paths. The redirect is not permanent.
SOURCE: https://vercel.com/docs/vercel-firewall/vercel-waf/examples

LANGUAGE: JSON
CODE:
```
{
  "name": "Emergency redirect",
  "active": true,
  "description": "",
  "action": {
    "mitigate": {
      "redirect": {
        "location": "/old-conf-login",
        "permanent": false
      },
      "action": "redirect",
      "rateLimit": null,
      "actionDuration": null
    }
  },
  "id": "",
  "conditionGroup": [
    {
      "conditions": [
        {
          "op": "eq",
          "type": "path",
          "value": "/conference-login"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Implementing Response Streaming with Remix defer and Await
DESCRIPTION: This example illustrates how to use Remix's `defer` and `Await` components for response streaming, simulating a throttled network. It allows for displaying an instant loading UI while asynchronous data is being resolved, improving user experience and handling large data payloads.
SOURCE: https://vercel.com/docs/frameworks/remix

LANGUAGE: TypeScript
CODE:
```
import { Suspense } from 'react';
import { Await, useLoaderData } from '@remix-run/react';
import { defer } from '@vercel/remix';
 
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
export async function loader({ request }) {
  const version = process.versions.node;
 
  return defer({
    // Don't let the promise resolve for 1 second
    version: sleep(1000).then(() => version),
  });
}
 
export default function DeferredRoute() {
  const { version } = useLoaderData();
 
  return (
    <Suspense fallback={'Loading…'}>
      <Await resolve={version}>{(version) => <strong>{version}</strong>}</Await>
    </Suspense>
  );
}
```

----------------------------------------

TITLE: Implementing Dynamic Product Updates with ISR and Vercel Functions
DESCRIPTION: This section details how product details are updated and served using Incremental Static Regeneration (ISR), Vercel Functions for real-time discounts, and Vercel's Edge Network and Data Cache for efficient content delivery. It outlines the flow from stale content revalidation to caching updated information.
SOURCE: https://vercel.com/docs/pricing/how-does-vercel-calculate-usage-of-resources

LANGUAGE: APIDOC
CODE:
```
Scenario: Viewing Updated Product Details
1. Initial View: Stale content from cache due to revalidation period ending.
2. Backend Update: Incremental Static Regeneration (ISR) updates product description and image.
3. Edge Caching: New information cached on Vercel's Edge Network for future requests.
4. Real-time Discounts: Vercel Function fetches latest product information from the backend.
5. Discount Caching: Results, including standard discounts, cached using Vercel Data Cache.
6. Data Freshness: If discount data is fresh in Data Cache, it's served; otherwise, re-fetched and re-cached.

Priced Resources:
- Edge requests: Network request charges for fetching updated product information.
- Function Invocations: Charges for activating a function to update content.
- Function Duration: CPU runtime charges for the function processing the update.
```

----------------------------------------

TITLE: Upload Blob with Next.js App Router Function
DESCRIPTION: This example demonstrates creating a Next.js API route (PUT function) that accepts a file from a `multipart/form-data` request, uploads it to Vercel Blob storage using `@vercel/blob`'s `put` method, and returns the unique URL of the uploaded blob. It uses Fluid compute for optimal performance.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: typescript
CODE:
```
import { put } from '@vercel/blob;
 
export async function PUT(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File;
  const blob = await put(file.name, file, {
    access: 'public',
    addRandomSuffix: true,
  });
 
  return Response.json(blob);
}
```

----------------------------------------

TITLE: Configure Local Development Environment with Vercel CLI
DESCRIPTION: Instructions to set up your local Vercel project, including installing the Vercel CLI, linking your project to your local directory, and pulling environment variables into a .env.local file for local application development.
SOURCE: https://vercel.com/docs/deployments/environments

LANGUAGE: Shell
CODE:
```
npm install -g vercel
```

LANGUAGE: Shell
CODE:
```
vercel link
```

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Validate Vercel Log Drain Payloads with HMAC-SHA1 in Next.js
DESCRIPTION: This JavaScript snippet demonstrates how to validate incoming Vercel Log Drain payloads using an HMAC-SHA1 signature. It compares a computed signature from the request body and an OAuth2 secret with the 'x-vercel-signature' header, ensuring messages originate from Vercel.
SOURCE: https://vercel.com/docs/log-drains/log-drains-reference

LANGUAGE: javascript
CODE:
```
import crypto from 'crypto';
 
export async function GET(request: Request) {
  const { INTEGRATION_SECRET } = process.env;
 
  if (typeof INTEGRATION_SECRET != 'string') {
    throw new Error('No integration secret found');
  }
 
  const rawBody = await request.text();
  const rawBodyBuffer = Buffer.from(rawBody, 'utf-8');
  const bodySignature = sha1(rawBodyBuffer, INTEGRATION_SECRET);
 
  if (bodySignature !== request.headers.get('x-vercel-signature')) {
    return Response.json({
      code: 'invalid_signature',
      error: "signature didn't match"
    });
  }
 
  console.log(rawBody);
 
  response.status(200).end();
}
 
async function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}
```

----------------------------------------

TITLE: Generate OG Image with Dynamic Title in Next.js
DESCRIPTION: This snippet demonstrates how to create an Open Graph image API route in Next.js (`/app/api/og/route.tsx`) that dynamically displays a title passed via a URL query parameter. It uses `@vercel/og` to render a React component into an image, handling default titles and truncation.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
 
    // ?title=<title>
    const hasTitle = searchParams.has('title');
    const title = hasTitle
      ? searchParams.get('title')?.slice(0, 100)
      : 'My default title';
 
    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: 'black',
            backgroundSize: '150px 150px',
            height: '100%',
            width: '100%',
            display: 'flex',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            flexWrap: 'nowrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              justifyItems: 'center',
            }}
          >
            <img
              alt="Vercel"
              height={200}
              src="data:image/svg+xml,%3Csvg width='116' height='100' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M57.5 0L115 100H0L57.5 0z' /%3E%3C/svg%3E"
              style={{ margin: '0 30px' }}
              width={232}
            />
          </div>
          <div
            style={{
              fontSize: 60,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              color: 'white',
              marginTop: 30,
              padding: '0 120px',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {title}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
```

----------------------------------------

TITLE: Configuring Build Outputs in `turbo.json` for Vercel Deployment
DESCRIPTION: This JSON configuration snippet for `turbo.json` defines the expected output directories for various frameworks within a Turborepo pipeline. Properly configuring these `outputs` ensures that Vercel can locate the necessary build artifacts after a cache hit, preventing deployment errors.
SOURCE: https://vercel.com/docs/monorepos/turborepo

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://turborepo.com/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        // Next.js
        ".next/**", "!.next/cache/**",
        // SvelteKit
        ".svelte-kit/**", ".vercel/**",
        // Build Output API
        ".vercel/output/**",
        // Other frameworks
        ".nuxt/**", "dist/**", "other-output-directory/**"
      ]
    }
  }
}
```

----------------------------------------

TITLE: Configure fal AI Proxy Route in Next.js App Router
DESCRIPTION: Sets up a serverless proxy route for fal.ai in a Next.js App Router application, allowing secure and efficient communication with fal's services.
SOURCE: https://vercel.com/docs/ai/fal

LANGUAGE: TypeScript
CODE:
```
// app/api/fal/proxy/route.ts
import { route } from '@fal-ai/serverless-proxy/nextjs';
export const { GET, POST } = route;
```

----------------------------------------

TITLE: Vercel Blob: `handleUpload()` Server-Side Helper API Reference
DESCRIPTION: The `handleUpload` server-side route helper manages client uploads by generating client tokens and listening for upload completion events. This allows for server-side actions like updating a database with the uploaded file's URL.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: APIDOC
CODE:
```
handleUpload(options);

Responsibilities:
1. Generate tokens for client uploads.
2. Listen for completed client uploads, so you can update your database with the URL of the uploaded file for example.

Parameters:
  options: (Required) JSON object
    Parameters:
      token: (Optional) string
        Description: A string specifying the read-write token to use when making requests. It defaults to `process.env.BLOB_READ_WRITE_TOKEN` when deployed on Vercel as explained in Read-write token.
      request: (Required) IncomingMessage | Request
        Description: An `IncomingMessage` or `Request` object to be used to determine the action to take.
      onBeforeGenerateToken: (Required) function
        Description: A function to be called right before generating client tokens for client uploads.
      onUploadCompleted: (Required) function
        Description: A function to be called by Vercel Blob when the client upload finishes. This is useful to update your database with the blob url that was uploaded.
      body: (Required) any
        Description: The request body.

Returns: Promise<
  { type: 'blob.generate-client-token'; clientToken: string } |
  { type: 'blob.upload-completed'; response: 'ok' }
>
```

----------------------------------------

TITLE: CDN-Cache-Control Header Definition
DESCRIPTION: Second in priority after `Vercel-CDN-Cache-Control`, this header always overrides `Cache-Control`. By default, it configures Vercel's Edge Cache and is used by other CDNs. If `Vercel-CDN-Cache-Control` is also set, it only influences other CDN caches.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
CDN-Cache-Control: string
  Description: Configures Vercel's Edge Cache and other CDNs. Second in priority, overrides `Cache-Control`.
```

----------------------------------------

TITLE: Add Vercel DNS Records
DESCRIPTION: These commands facilitate the addition of various types of DNS records (A, AAAA, ALIAS, CNAME, TXT, MX, SRV, CAA) to your domains. Each command specifies the domain, record type, and necessary values, such as IP addresses, target hosts, or priority settings.
SOURCE: https://vercel.com/docs/cli/dns

LANGUAGE: vercel cli
CODE:
```
vercel dns add [domain] [subdomain] [A || AAAA || ALIAS || CNAME || TXT] [value]
```

LANGUAGE: vercel cli
CODE:
```
vercel dns add [domain] '@' MX [record-value] [priority]
```

LANGUAGE: vercel cli
CODE:
```
vercel dns add [domain] [name] SRV [priority] [weight] [port] [target]
```

LANGUAGE: vercel cli
CODE:
```
vercel dns add [domain] [name] CAA '[flags] [tag] "[value]"'
```

----------------------------------------

TITLE: AWS IAM Trust Policy for Strict OIDC Federation
DESCRIPTION: This JSON policy defines a strict trust relationship for an AWS IAM role, allowing a specific Vercel team, project, and production environment to assume the role via OIDC federation. It requires exact matches for the "aud" (audience) and "sub" (subject) claims.
SOURCE: https://vercel.com/docs/oidc/aws

LANGUAGE: JSON
CODE:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[TEAM_SLUG]"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com/[TEAM_SLUG]:sub": "owner:[TEAM SLUG]:project:[PROJECT NAME]:environment:production",
          "oidc.vercel.com/[TEAM_SLUG]:aud": "https://vercel.com/[TEAM SLUG]"
        }
      }
    }
  ]
}
```

----------------------------------------

TITLE: Vercel Environment Variable: VITE_VERCEL_PROJECT_PRODUCTION_URL
DESCRIPTION: Provides a production domain name for the project, selecting the shortest custom domain or a `vercel.app` domain if no custom domain exists. This variable is always set, even in preview deployments, making it useful for reliably generating production-pointing links like OG-image URLs. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Implement custom server entrypoint with Hono and React Router
DESCRIPTION: This code illustrates how to create a custom server entrypoint using the Hono web framework in conjunction with React Router. It defines an `AppLoadContext` interface to pass custom data, initializes a Hono application, and uses `createRequestHandler` to process incoming requests, allowing for the injection of a custom load context (e.g., `VALUE_FROM_HONO`) based on the current request.
SOURCE: https://vercel.com/docs/frameworks/react-router

LANGUAGE: TypeScript
CODE:
```
import { Hono } from 'hono';
import { createRequestHandler } from 'react-router';
 
// @ts-expect-error - virtual module provided by React Router at build time
import * as build from 'virtual:react-router/server-build';
 
declare module 'react-router' {
  interface AppLoadContext {
    VALUE_FROM_HONO: string;
  }
}
 
const app = new Hono();
 
// Add any additional Hono middleware here
 
const handler = createRequestHandler(build);
app.mount('/', (req) =>
  handler(req, {
    // Add your "load context" here based on the current request
    VALUE_FROM_HONO: 'Hello from Hono',
  }),
);
 
export default app.fetch;
```

----------------------------------------

TITLE: Deploy Project with Vercel CLI
DESCRIPTION: This command deploys a Vercel project using the Vercel CLI. It requires the Vercel CLI to be installed and configured. The `--cwd` flag specifies the current working directory of the project to be deployed. This command initiates the deployment process on Vercel, creating a new deployment for the specified project.
SOURCE: https://vercel.com/docs/getting-started-with-vercel/template

LANGUAGE: Shell
CODE:
```
vercel --cwd [path-to-project]
```

----------------------------------------

TITLE: Next.js App Router: Time-based Data Revalidation
DESCRIPTION: This example demonstrates how to implement time-based revalidation for data fetched within a Next.js App Router page component. By setting the `revalidate` option in the `fetch` call, the data will be cached for the specified duration (e.g., 3600 seconds for 1 hour) before being re-fetched from the origin.
SOURCE: https://vercel.com/docs/data-cache

LANGUAGE: JavaScript
CODE:
```
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: {
      revalidate: 3600, // 1 hour
    },
  });
  const data = await res.json();
 
  return '...';
}
```

----------------------------------------

TITLE: Configure Custom Runtimes for Vercel Functions via vercel.json
DESCRIPTION: Shows how to specify a custom runtime for a Vercel Function using the `functions` property in `vercel.json`. This allows using runtimes not natively supported, like `vercel-php`.
SOURCE: https://vercel.com/docs/functions/configuring-functions/runtime

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.php": {
      "runtime": "vercel-php@0.5.2"
    }
  }
}
```

----------------------------------------

TITLE: Example of a Server-Side Rendered Remix Route
DESCRIPTION: This code demonstrates a basic Remix route that is rendered dynamically on the server. Remix routes within `app/routes` are server-side rendered by default, which is beneficial for pages requiring unique data per request, such as authentication checks or location-based content.
SOURCE: https://vercel.com/docs/frameworks/remix

LANGUAGE: JavaScript
CODE:
```
export default function IndexRoute() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>This route is rendered on the server</h1>
    </div>
  );
}
```

----------------------------------------

TITLE: Configure Vercel Cron Job in vercel.json
DESCRIPTION: Configures the Vercel project to include a cron job. The `crons` array specifies the `path` to the function to be executed and the `schedule` using a cron expression, set here for 5:00 am UTC daily.
SOURCE: https://vercel.com/docs/cron-jobs/quickstart

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/hello",
      "schedule": "0 5 * * *"
    }
  ]
}
```

----------------------------------------

TITLE: Use Optimized Images in SvelteKit Components
DESCRIPTION: This Svelte component snippet demonstrates how to integrate the `optimize` utility function to generate an optimized `srcset` for an `img` tag. By importing the `optimize` function, developers can easily ensure that images displayed in their SvelteKit application leverage Vercel's image optimization for improved performance.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: Svelte
CODE:
```
<script lang="ts">
  import { optimize } from '$lib/image';
  import type { Photo } from '$lib/types';
 
  export let photo: Photo;
</script>
 
<img
  class="absolute left-0 top-0 w-full h-full"
  srcset={optimize(photo.url)}
  alt={photo.description}
/>
```

----------------------------------------

TITLE: Configure Remote Image Optimization Patterns in Next.js
DESCRIPTION: This `next.config.ts` example demonstrates how to configure `remotePatterns` for the Next.js `Image` component. It specifies that images from `https://example.com` with paths under `/account123/**` are allowed for optimization. It's recommended to include an account ID in the pathname for security when the hostname is not owned by you.
SOURCE: https://vercel.com/docs/image-optimization

LANGUAGE: JavaScript
CODE:
```
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/account123/**', 
        search: '',
      },
    ],
  },
};
```

----------------------------------------

TITLE: Calling an LLM with AI SDK's generateText
DESCRIPTION: Use the `generateText` function from the AI SDK to interact with a Large Language Model (LLM). This example shows how to send a prompt to an OpenAI model and retrieve the generated text.
SOURCE: https://vercel.com/docs/agents

LANGUAGE: TypeScript
CODE:
```
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
 
export async function getWeather() {
  const { text } = await generateText({
    model: openai('gpt-4.1'),
    prompt: 'What is the weather like today?',
  });
 
  console.log(text);
}
```

----------------------------------------

TITLE: VERCEL_OIDC_TOKEN Environment Variable
DESCRIPTION: Provides a Vercel-issued OIDC token when Secure Backend Access with OpenID Connect (OIDC) Federation is enabled. Available at build time, and at runtime as the `x-vercel-oidc-token` header on your functions' `Request` object. Can be downloaded locally using the CLI command `vercel env pull`.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_OIDC_TOKEN=secret
```

----------------------------------------

TITLE: Handle Vercel Blob Upload Completion and Error Handling (JavaScript/TypeScript)
DESCRIPTION: This code snippet demonstrates how to handle the completion of a Vercel Blob upload, including optional post-upload logic (e.g., updating a database) and robust error handling. It returns a JSON response indicating success or an error with a 400 status, which prompts the webhook to retry. This logic is typically part of an `onUploadCompleted` callback.
SOURCE: https://vercel.com/docs/vercel-blob/client-upload

LANGUAGE: JavaScript
CODE:
```
            console.log('blob upload completed', blob, tokenPayload);
     
            try {
              // Run any logic after the file upload completed
              // const { userId } = JSON.parse(tokenPayload);
              // await db.update({ avatar: blob.url, userId });
            } catch (error) {
              throw new Error('Could not update user');
            }
          },
        });
     
        return NextResponse.json(jsonResponse);
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: 400 }, // The webhook will retry 5 times waiting for a 200
        );
      }
    }
```

----------------------------------------

TITLE: Rewriting URLs with NextResponse.rewrite() in Edge Middleware
DESCRIPTION: The `NextResponse.rewrite()` helper allows you to change the incoming request's URL to a different internal path. This method is exclusively available within Edge Middleware and is useful for URL masking or internal routing.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Trigger this middleware to run on the `/about` route
export const config = {
  matcher: '/about',
};
 
export default function middleware(request: NextRequest) {
  // Rewrite to URL
  return NextResponse.rewrite('/about-2');
}
```

----------------------------------------

TITLE: Pull Vercel Environment Variables
DESCRIPTION: This command pulls environment variables from your Vercel project into your local development environment, making them accessible to your application for local development and testing.
SOURCE: https://vercel.com/docs/ai/xai

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Configuring Cache-Control Headers in Remix Routes
DESCRIPTION: This example demonstrates how to export a `headers` function in a Remix route to add `Cache-Control` directives. It specifies `s-maxage` for immediate caching and `stale-while-revalidate` for background revalidation, optimizing content delivery and reducing server load.
SOURCE: https://vercel.com/docs/frameworks/remix

LANGUAGE: TypeScript
CODE:
```
import type { HeadersFunction } from '@vercel/remix';
 
export const headers: HeadersFunction = () => ({
  'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
});
 
export async function loader() {
  // Fetch data necessary to render content
}
```

----------------------------------------

TITLE: Access Vercel Deployment URL
DESCRIPTION: Retrieve the domain name of the generated Vercel deployment URL (e.g., `*.vercel.app`). The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: dotenv
CODE:
```
NUXT_ENV_VERCEL_URL=my-site.vercel.app
```

----------------------------------------

TITLE: Start Vercel Local Development Server
DESCRIPTION: This command initiates a local development server using the Vercel CLI. It allows developers to test their Vercel projects, including API routes and integrations, in a local environment before deployment. The server typically runs on `http://localhost:3000`.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/split-edge-config

LANGUAGE: shell
CODE:
```
vercel dev
```

----------------------------------------

TITLE: Configure Serverless Function Regions
DESCRIPTION: This property allows overriding the default Serverless Function Region set in Project Settings. It accepts an array of region identifier strings, enabling deployment to multiple regions for Pro and Enterprise plans, or a single region for Hobby plans.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Type: Array of region identifier String.
Valid values: List of regions, defaults to iad1.
```

----------------------------------------

TITLE: Create a client-side upload page for Vercel Blob
DESCRIPTION: This Next.js client-side page handles file selection and initiates the upload process to a server route. It uses `useState` and `useRef` to manage file input and display the uploaded blob URL.
SOURCE: https://vercel.com/docs/vercel-blob/server-upload

LANGUAGE: TypeScript
CODE:
```
'use client';
 
import type { PutBlobResult } from '@vercel/blob';
import { useState, useRef } from 'react';
 
export default function AvatarUploadPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  return (
    <>
      <h1>Upload Your Avatar</h1>
 
      <form
        onSubmit={async (event) => {
          event.preventDefault();
 
          if (!inputFileRef.current?.files) {
            throw new Error('No file selected');
          }
 
          const file = inputFileRef.current.files[0];
 
          const response = await fetch(
            `/api/avatar/upload?filename=${file.name}`,
            {
              method: 'POST',
              body: file,
            },
          );
 
          const newBlob = (await response.json()) as PutBlobResult;
 
          setBlob(newBlob);
        }}
      >
        <input
          name="file"
          ref={inputFileRef}
          type="file"
          accept="image/jpeg, image/png, image/webp"
          required
        />
        <button type="submit">Upload</button>
      </form>
      {blob && (
        <div>
          Blob url: <a href={blob.url}>{blob.url}</a>
        </div>
      )}
    </>
  );
}
```

----------------------------------------

TITLE: Track a basic client-side event with Vercel Analytics
DESCRIPTION: Demonstrates how to import the `track` function from `@vercel/analytics` and call it with a simple string representing the event name to track a client-side user action.
SOURCE: https://vercel.com/docs/analytics/custom-events

LANGUAGE: JavaScript
CODE:
```
import { track } from '@vercel/analytics';
 
// Call this function when a user clicks a button or performs an action you want to track
track('Signup');
```

----------------------------------------

TITLE: Configure GitHub Actions to Trigger on Vercel Deployment Events
DESCRIPTION: This YAML configuration snippet shows how to set up a GitHub Actions workflow to trigger specifically on various Vercel deployment `repository_dispatch` events. It lists the different event types that can initiate a workflow run, allowing for fine-grained control over CI/CD tasks based on deployment status.
SOURCE: https://vercel.com/docs/git/vercel-for-github

LANGUAGE: YAML
CODE:
```
on:
  repository_dispatch:
    - 'vercel.deployment.success'
    - 'vercel.deployment.error'
    - 'vercel.deployment.canceled'
    - 'vercel.deployment.ignored'
    - 'vercel.deployment.skipped'
    - 'vercel.deployment.pending'
    - 'vercel.deployment.failed'
    - 'vercel.deployment.promoted'
```

----------------------------------------

TITLE: Vercel Response Header: cache-control
DESCRIPTION: Specifies caching directives for network and browser caches. If the `s-maxage` directive is used, Vercel returns a specific `cache-control` header to the client.
SOURCE: https://vercel.com/docs/headers/response-headers

LANGUAGE: APIDOC
CODE:
```
Header: cache-control
Description: Used to specify directives for caching mechanisms in both the Network layer cache and the browser cache.
Vercel-returned value (if s-maxage is used): public, max-age=0, must-revalidate
```

----------------------------------------

TITLE: Poll Replicate Prediction Status in Vercel Edge Function
DESCRIPTION: This asynchronous GET function, designed for Vercel Edge Functions, retrieves the status of a Replicate prediction using its ID. It handles potential errors from the Replicate API, returning a 500 status if an error occurs, otherwise returning the prediction details.
SOURCE: https://vercel.com/docs/ai/replicate

LANGUAGE: JavaScript
CODE:
```
export async function GET(request, { params }) {
  const { id } = params;
  const prediction = await replicate.predictions.get(id);
  if (prediction?.error) {
    return NextResponse.json({ detail: prediction.error }, { status: 500 });
  }
  return NextResponse.json(prediction);
}
```

----------------------------------------

TITLE: VERCEL_BRANCH_URL Environment Variable
DESCRIPTION: The domain name of the generated Git branch URL. Example: `*-git-*.vercel.app`. The value does not include the protocol scheme `https://`. Available at both build and runtime.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

----------------------------------------

TITLE: Vercel Redirect: Wildcard path matching for blog to news
DESCRIPTION: Example `vercel.json` configuration using wildcard path matching (`:path*`) to redirect requests from any path under `/blog/` to the corresponding path under `/news/` with a default 308 redirect status.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/blog/:path*",
      "destination": "/news/:path*"
    }
  ]
}
```

----------------------------------------

TITLE: Vercel Redirect: Regex path matching for posts to news
DESCRIPTION: Example `vercel.json` configuration using regex path matching (`:path(\d{1,})`) to redirect requests to any path under `/posts/` that contains only numerical digits to the corresponding path under `/news/` with a default 308 redirect status.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/post/:path(\\d{1,})",
      "destination": "/news/:path*"
    }
  ]
}
```

----------------------------------------

TITLE: Using Regular Expressions with Numbered Capture Groups in Vercel Rewrites
DESCRIPTION: This `vercel.json` example illustrates how to use regular expressions with numbered capture groups (`$1`, `$2`, `$3`) for more complex rewrite patterns. It transforms a URL like `/articles/2023/05/hello-world` into `/archive?year=2023&month=05&slug=hello-world`, enabling flexible URL restructuring.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "rewrites": [
    {
      "source": "^/articles/(\\d{4})/(\\d{2})/(.+)$",
      "destination": "/archive?year=$1&month=$2&slug=$3"
    }
  ]
}
```

----------------------------------------

TITLE: Example Node.js Serverless Function using Request Helpers
DESCRIPTION: Demonstrates how to use Vercel's `request.query`, `request.cookies`, and `request.body` helpers within a Node.js Serverless Function to retrieve user information from different sources and send a greeting.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: Node.js
CODE:
```
import { VercelRequest, VercelResponse } from "@vercel/node";
 
module.exports = (request: VercelRequest, response: VercelResponse) => {
  let who = 'anonymous';
 
  if (request.body && request.body.who) {
    who = request.body.who;
  } else if (request.query.who) {
    who = request.query.who;
  } else if (request.cookies.who) {
    who = request.cookies.who;
  }
 
  response.status(200).send(`Hello ${who}!`);
};
```

----------------------------------------

TITLE: Deploy Vercel application using CLI
DESCRIPTION: Deploy your application to Vercel using the `vercel deploy` command. This action publishes your app, enabling it to start tracking visitors and page views once deployed.
SOURCE: https://vercel.com/docs/analytics/quickstart

LANGUAGE: Shell
CODE:
```
vercel deploy
```

----------------------------------------

TITLE: Generate Text with Together AI using AI SDK
DESCRIPTION: Demonstrates how to use the AI SDK with Together AI to generate text. This example imports `togetherai` and `generateText` functions, then uses a specific Llama 3.1 model to generate a vegetarian lasagna recipe.
SOURCE: https://vercel.com/docs/ai/togetherai

LANGUAGE: TypeScript
CODE:
```
import { togetherai } from '@ai-sdk/togetherai';import { generateText } from 'ai';
const { text } = await generateText({
  model: togetherai('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

----------------------------------------

TITLE: Create a Vercel Function to Fetch Data (Next.js /app)
DESCRIPTION: This Vercel Function, designed for Next.js's /app directory, fetches product data from the Vercel API and returns it as a JSON response. It demonstrates a basic API route for data retrieval.
SOURCE: https://vercel.com/docs/functions/quickstart

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const response = await fetch('https://api.vercel.app/products');
  const products = await response.json();
  return Response.json(products);
}
```

----------------------------------------

TITLE: Accessing Geolocation Information in Next.js Middleware
DESCRIPTION: This example demonstrates how to use the `request.geo` helper object to access geolocation details of an incoming request within Vercel Edge Middleware. It shows a practical application of blocking access to a 'secret page' based on the visitor's country, defaulting to 'US' if geolocation data is unavailable.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
// The country to block from accessing the secret page
const BLOCKED_COUNTRY = 'SE';
 
// Trigger this middleware to run on the `/secret-page` route
export const config = {
  matcher: '/secret-page',
};
 
export default function middleware(request: NextRequest) {
  // Extract country. Default to US if not found.
  const country = (request.geo && request.geo.country) || 'US';
 
  console.log(`Visitor from ${country}`);
 
  // Specify the correct route based on the requests location
  if (country === BLOCKED_COUNTRY) {
    request.nextUrl.pathname = '/login';
  } else {
    request.nextUrl.pathname = `/secret-page`;
  }
 
  // Rewrite to URL
  return NextResponse.rewrite(request.nextUrl);
}
```

----------------------------------------

TITLE: Create Next.js API Route for OG Image with Custom Font
DESCRIPTION: This example shows how to set up a Next.js API route (`route.tsx`) to generate an Open Graph image with a custom font. It includes a utility function `loadGoogleFont` to fetch font data from Google Fonts and applies it to the `ImageResponse` for custom text rendering, ensuring consistent typography.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
async function loadGoogleFont (font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
 
  if (resource) {
    const response = await fetch(resource[1])
    if (response.status == 200) {
      return await response.arrayBuffer()
    }
  }
 
  throw new Error('failed to load font data')
}
 
export async function GET() {
  const text = 'Hello world!'
 
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: 'white',
          height: '100%',
          width: '100%',
          fontSize: 100,
          fontFamily: 'Geist',
          paddingTop: '100px',
          paddingLeft: '50px',
        }}
      >
        {text}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Geist',
          data: await loadGoogleFont('Geist', text),
          style: 'normal',
        },
      ],
    },
  );
}
```

----------------------------------------

TITLE: Running Vercel Cron Jobs Locally
DESCRIPTION: Cron jobs are API routes. To run them locally, make a direct request to their endpoint. For example, a cron job at /api/cron can be accessed via http://localhost:3000/api/cron. Note that vercel dev or next dev are not supported for local cron job execution.
SOURCE: https://vercel.com/docs/cron-jobs/manage-cron-jobs

LANGUAGE: APIDOC
CODE:
```
http://localhost:3000/api/cron
```

----------------------------------------

TITLE: Creating a Staged Production Deployment Without Domain Assignment
DESCRIPTION: Initiates a production deployment that is not automatically assigned to the project's domain. This allows for testing a production build before directing live traffic to it.
SOURCE: https://vercel.com/docs/cli/deploying-from-cli

LANGUAGE: Shell
CODE:
```
vercel --prod --skip-domain
```

----------------------------------------

TITLE: Integrate StaffToolbar into Next.js App Router RootLayout
DESCRIPTION: This example shows how to integrate the `StaffToolbar` component into the `RootLayout` of a Next.js application using the App Router. The toolbar is wrapped in a `Suspense` boundary to handle potential client-side rendering issues and ensure proper loading within the application's main layout.
SOURCE: https://vercel.com/docs/vercel-toolbar/in-production-and-localhost/add-to-production

LANGUAGE: javascript
CODE:
```
import { Suspense } from 'react';
import { StaffToolbar } from '@components/staff-toolbar';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Suspense>
          <StaffToolbar />
        </Suspense>
      </body>
    </html>
  );
}
```

----------------------------------------

TITLE: Configure git.deploymentEnabled for a specific branch
DESCRIPTION: Example `vercel.json` configuration to disable automatic deployments for the 'dev' branch. This prevents deployments from occurring when commits are pushed to the 'dev' branch.
SOURCE: https://vercel.com/docs/project-configuration/git-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "dev": false
    }
  }
}
```

----------------------------------------

TITLE: Download Development Environment Variables
DESCRIPTION: Use this command to pull development environment variables from Vercel to your local machine, making them available for local development.
SOURCE: https://vercel.com/docs/environment-variables

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Query Azure CosmosDB with OIDC from a Vercel Function
DESCRIPTION: This example demonstrates how to create a Vercel function that connects to an Azure CosmosDB instance using OIDC federation. It requires installing `@azure/identity`, `@azure/cosmos`, and `@vercel/functions` packages. The code uses environment variables for Azure Tenant ID, Client ID, CosmosDB endpoint, database ID, and container ID to establish a connection and perform a SELECT query.
SOURCE: https://vercel.com/docs/oidc/azure

LANGUAGE: Shell
CODE:
```
pnpm i @azure/identity @azure/cosmos @vercel/functions
```

LANGUAGE: TypeScript
CODE:
```
import {
  ClientAssertionCredential,
  AuthenticationRequiredError,
} from '@azure/identity';
import * as cosmos from '@azure/cosmos';
import { getVercelOidcToken } from '@vercel/functions/oidc';
 
/**
 * The Azure Active Directory tenant (directory) ID.
 * Added to environment variables
 */
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID!;
 
/**
 * The client (application) ID of an App Registration in the tenant.
 * Added to environment variables
 */
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT!;
const COSMOS_DB_ID = process.env.COSMOS_DB_ID!;
const COSMOS_DB_CONTAINER_ID = process.env.COSMOS_DB_CONTAINER_ID!;
 
const tokenCredentials = new ClientAssertionCredential(
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  getVercelOidcToken,
);
 
const cosmosClient = new cosmos.CosmosClient({
  endpoint: COSMOS_DB_ENDPOINT,
  aadCredentials: tokenCredentials,
});
 
const container = cosmosClient
  .database(COSMOS_DB_ID)
  .container(COSMOS_DB_CONTAINER_ID);
 
export async function GET() {
  const { resources } = await container.items
    .query('SELECT * FROM my_table')
    .fetchAll();
 
  return Response.json(resources);
}
```

----------------------------------------

TITLE: Override Node.js Version in package.json for Vercel Deployments
DESCRIPTION: This JSON snippet demonstrates how to specify a desired Node.js major version for a Vercel project within the `engines.node` field of the `package.json` file. This setting overrides the version selected in Project Settings, ensuring the project deploys with the specified Node.js version, such as '22.x'.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions

LANGUAGE: JSON
CODE:
```
{
  "engines": {
    "node": "22.x"
  }
}
```

----------------------------------------

TITLE: Rewrite Requests Using Wildcard Path Matching
DESCRIPTION: This example uses wildcard path matching to rewrite requests to any path (including subdirectories) under `/proxy/` from your site's root to a corresponding path under the root of an external site `https://example.com/`.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/proxy/:match*",
      "destination": "https://example.com/:match*"
    }
  ]
}
```

----------------------------------------

TITLE: Configure Vercel Image Optimization in SvelteKit
DESCRIPTION: This snippet demonstrates how to configure Vercel's native image optimization API within your SvelteKit project's `svelte.config.ts` file. It uses `@sveltejs/adapter-vercel` to specify image sizes, formats, cache TTL, and allowed domains, ensuring images are optimized on demand.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: JavaScript
CODE:
```
import adapter from '@sveltejs/adapter-vercel';
 
export default {
  kit: {
    adapter({
      images: {
        sizes: [640, 828, 1200, 1920, 3840],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 300,
        domains: ['example-app.vercel.app']
      }
    })
  }
};
```

----------------------------------------

TITLE: Pull Environment Variables from Vercel Custom Environment
DESCRIPTION: Retrieves environment variables from a specified custom environment on Vercel, like 'staging', making them available locally.
SOURCE: https://vercel.com/docs/deployments/environments

LANGUAGE: shell
CODE:
```
vercel pull --environment=staging
```

----------------------------------------

TITLE: Next.js `next/image` Component API Reference
DESCRIPTION: Detailed API reference for the `next/image` component, outlining its required properties (`src`, `alt`, `width`, `height`) and the optional `unoptimized` prop. It clarifies that `width` and `height` are automatically determined for local images.
SOURCE: https://vercel.com/docs/image-optimization/quickstart

LANGUAGE: APIDOC
CODE:
```
next/image Component:
  Required Props:
    src: string
      Description: The URL of the image to be loaded.
    alt: string
      Description: A short description of the image.
    width: number
      Description: The width of the image. Automatically determined for local images.
    height: number
      Description: The height of the image. Automatically determined for local images.
  Optional Props:
    unoptimized: boolean
      Description: Disables image optimization for the specific image.
```

----------------------------------------

TITLE: Create Edge Middleware to Read Edge Config (Next.js)
DESCRIPTION: Implement an Edge Middleware function in Next.js to intercept requests, read data from the Vercel Edge Config store using the SDK, and respond with the retrieved value.
SOURCE: https://vercel.com/docs/edge-config/get-started

LANGUAGE: JavaScript
CODE:
```
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
 
export const config = { matcher: '/welcome' };
 
export async function middleware() {
  const greeting = await get('greeting');
  return NextResponse.json(greeting);
}
```

----------------------------------------

TITLE: Get Vercel Project Production URL (VITE)
DESCRIPTION: Provides a production domain name for the project, prioritizing the shortest custom domain or a `vercel.app` domain. This variable is always set, even in preview deployments, and is useful for reliably generating links that point to production, such as OG-image URLs. The value excludes the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: env
CODE:
```
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Implement Tool Calling with AI SDK
DESCRIPTION: This example demonstrates how to integrate tool calling with the AI SDK, allowing the LLM to interact with external systems. It shows a `getWeather` tool defined with a Zod schema for parameters and an `execute` function to simulate fetching weather data.
SOURCE: https://vercel.com/docs/ai-sdk

LANGUAGE: TypeScript
CODE:
```
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
 
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather like today in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get the weather in a location',
      parameters: z.object({
        location: z.string().describe('The location to get the weather for')
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10
      })
    })
  }
});
```

----------------------------------------

TITLE: Pull Development Environment Variables with Vercel CLI
DESCRIPTION: This command automatically creates and populates a `.env` file in your project's current directory with environment variables from your Vercel project's Development environment. It requires Vercel CLI version 21.0.1 or higher. If you are using `vercel dev`, there is no need to run this command as `vercel dev` automatically downloads the Development Environment Variables into memory.
SOURCE: https://vercel.com/docs/environment-variables

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Access Vercel Deployment Environment
DESCRIPTION: Determine the environment (production, preview, or development) where the Vercel app is deployed and running. This variable is prefixed based on the framework (Nuxt.js, React).
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: dotenv
CODE:
```
NUXT_ENV_VERCEL_ENV=production
```

LANGUAGE: dotenv
CODE:
```
REACT_APP_VERCEL_ENV=production
```

----------------------------------------

TITLE: Get Vercel Deployment Environment (VITE)
DESCRIPTION: Identifies the environment where the application is deployed and running. Possible values include `production`, `preview`, or `development`.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: env
CODE:
```
VITE_VERCEL_ENV=production
```

----------------------------------------

TITLE: Build a Vercel Project
DESCRIPTION: This command builds a Vercel Project locally or in a CI environment, placing build artifacts into the `.vercel/output` directory. It's often used before `vercel deploy --prebuilt` to create deployments without sharing source code.
SOURCE: https://vercel.com/docs/cli/build

LANGUAGE: Shell
CODE:
```
vercel build
```

----------------------------------------

TITLE: Implementing Nuxt Server Middleware for Authentication
DESCRIPTION: This server middleware example demonstrates how to check for a session cookie, fetch user data from a database, and then enrich the request's `context` with user and token information. This allows subsequent routes to access authenticated user data.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
import { getUserFromDBbyCookie } from 'some-orm-package';
 
export default defineEventHandler(async (event) => {
  // The getCookie method is available to all
  // Nuxt routes by default. No need to import.
  const token = getCookie(event, 'session_token');
 
  // getUserFromDBbyCookie is a placeholder
  // made up for this example. You can fetch
  // data from wherever you want here
  const { user } = await getUserFromDBbyCookie(event.request);
 
  if (user) {
    event.context.user = user;
    event.context.session_token = token;
  }
});
```

----------------------------------------

TITLE: Retrieving Client IP Address in Vercel Edge Middleware
DESCRIPTION: This example demonstrates how to use the `ipAddress` helper function from `@vercel/functions` to extract the client's IP address from the incoming request. The IP address can then be used, for instance, to add a custom header to the response, providing client IP information.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { ipAddress } from '@vercel/functions';
import { next } from '@vercel/edge';
 
export default function middleware(request: Request) {
  const ip = ipAddress(request);
  return next({
    headers: { 'x-your-ip-address': ip || 'unknown' },
  });
}
```

----------------------------------------

TITLE: Access Vercel Project Production URL
DESCRIPTION: Retrieves a production domain name for the project, prioritizing custom domains or falling back to a vercel.app domain. This variable is always set, even in preview deployments, and is useful for reliably generating links to production resources like OG-image URLs. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

LANGUAGE: Shell
CODE:
```
VUE_APP_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Configure Vercel CLI with Environment Variables for CI
DESCRIPTION: This snippet demonstrates how to use Vercel CLI by setting environment variables (`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) instead of relying on project linking. This approach is particularly useful for automated deployments within Continuous Integration (CI) environments, allowing for headless operation without interactive prompts.
SOURCE: https://vercel.com/docs/monorepos/monorepo-faq

LANGUAGE: Shell
CODE:
```
VERCEL_ORG_ID=team_123 VERCEL_PROJECT_ID=prj_456 vercel
```

----------------------------------------

TITLE: Define Static Redirects in Next.js Configuration
DESCRIPTION: This example shows how to configure static redirects in a Next.js application using the `next.config.js` file. It includes examples for simple permanent redirects, redirects with dynamic slugs, and geolocation-based redirects using request headers.
SOURCE: https://vercel.com/docs/redirects

LANGUAGE: javascript
CODE:
```
module.exports = {
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
      {
        source: '/old-blog/:slug',
        destination: '/news/:slug',
        permanent: true,
      },
      {
        source: '/:path((?!uk/).*)',
        has: [
          {
            type: 'header',
            key: 'x-vercel-ip-country',
            value: 'GB',
          }
        ],
        permanent: false,
        destination: '/uk/:path*'
      }
    ];
  }
};
```

----------------------------------------

TITLE: Vercel v0 API Chat Completions Streaming Response Chunk Structure
DESCRIPTION: This JSON object represents a single data chunk received when streaming responses from the Vercel v0 Chat Completions API. Each chunk contains a delta with partial content and metadata, formatted as Server-Sent Events.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: APIDOC
CODE:
```
{
  "id": "v0-123",
  "model": "v0-1.0-md",
  "object": "chat.completion.chunk",
  "choices": [
    {
      "delta": {
        "role": "assistant",
        "content": "Here's how"
      },
      "index": 0,
      "finish_reason": null
    }
  ]
}
```

----------------------------------------

TITLE: Get Vercel Deployment Environment
DESCRIPTION: Identifies the environment where the application is deployed and running. Possible values include `production`, `preview`, or `development`.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
VUE_APP_VERCEL_ENV=production
```

----------------------------------------

TITLE: Example HTML for Open Graph Metadata
DESCRIPTION: Demonstrates how to embed Open Graph metadata within the <head> section of an HTML document. It includes og:title, og:description, og:image, and og:url tags, showing how to dynamically generate the og:image URL using Vercel environment variables for deployment-specific images.
SOURCE: https://vercel.com/docs/deployments/og-preview

LANGUAGE: HTML
CODE:
```
<div>
  <head>
    <meta name="og:title" content="Vercel Edge Network" />
    <meta name="og:description" content="Vercel Edge Network" />
    <meta name="og:image" content={ // Because OG images must have a absolute
    URL, we use the // `VERCEL_URL` environment variable to get the deployment’s
    URL. // More info: // https://vercel.com/docs/environment-variables
    `${ process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''
    }/api/vercel` } />
    <meta
      name="og:url"
      content="https://vercel.com/docs/edge-network"
    />
  </head>
  <h1>A page with Open Graph Image.</h1>
</div>
```

----------------------------------------

TITLE: Route Image Resize Requests to Serverless Function
DESCRIPTION: An example of a same-application rewrite that routes requests for image resizing (e.g., `/resize/800/600`) to a serverless function at `/api/sharp`, effectively passing width and height as query parameters to the function.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/resize/:width/:height",
      "destination": "/api/sharp"
    }
  ]
}
```

----------------------------------------

TITLE: Configure Vercel Function Memory and Duration in vercel.json
DESCRIPTION: This configuration snippet demonstrates how to set custom memory sizes and maximum duration for Vercel Functions within the `vercel.json` file. It shows examples for a specific file (`api/test.js`) and a glob pattern (`api/*.js`), allowing fine-grained control over function resources. Memory is specified in MB (between 128 and 3009) and maxDuration in seconds.
SOURCE: https://vercel.com/docs/functions/configuring-functions/memory

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "memory": 3009
    },
    "api/*.js": {
      "memory": 3009,
      "maxDuration": 30
    }
  }
}
```

----------------------------------------

TITLE: Vercel Blob: Next.js App Router Client Upload Handler Example
DESCRIPTION: This example demonstrates a Next.js App Router route handler (`POST`) that uses `@vercel/blob/client`'s `handleUpload` function. It integrates `onBeforeGenerateToken` for authentication/authorization and `onUploadCompleted` for post-upload logic, such as updating a database, ensuring secure and controlled file uploads.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: TypeScript
CODE:
```
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
 
// Use-case: uploading images for blog posts
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
 
        // ⚠️ When using the clientPayload feature, make sure to valide it
        // otherwise this could introduce security issues for your app
        // like allowing users to modify other users' posts
 
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'text/*',
          ], // optional, default to all content types
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow
 
        console.log('blob upload completed', blob, tokenPayload);
 
        try {
          // Run any logic after the file upload completed,
          // If you've already validated the user and authorization prior, you can
          // safely update your database
        } catch (error) {
          throw new Error('Could not update post');
        }
      },
    });
 
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    );
  }
}
```

----------------------------------------

TITLE: Create a Basic Vercel Serverless Function with TypeScript
DESCRIPTION: This example illustrates a fundamental Vercel Function written in TypeScript, designed to be placed in an `api` directory at the project root. It demonstrates how to handle incoming `VercelRequest` and respond with a `VercelResponse`, echoing the request body, query parameters, and cookies, showcasing a typical serverless API endpoint.
SOURCE: https://vercel.com/docs/frameworks/vite

LANGUAGE: TypeScript
CODE:
```
import type { VercelRequest, VercelResponse } from '@vercel/node';
 
export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.status(200).json({
    body: request.body,
    query: request.query,
    cookies: request.cookies,
  });
}
```

----------------------------------------

TITLE: Vercel Custom Routes Configuration Example
DESCRIPTION: Illustrates how to define various custom routes in `vercel.json` for redirects, static file mapping, API routes, and wildcard patterns.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/redirect",
      "status": 308,
      "headers": { "Location": "https://example.com/" }
    },
    {
      "src": "/custom-page",
      "headers": { "cache-control": "s-maxage=1000" },
      "dest": "/index.html"
    },
    { "src": "/api", "dest": "/my-api.js" },
    { "src": "/users", "methods": ["POST"], "dest": "/users-api.js" },
    { "src": "/users/(?<id>[^/]*)", "dest": "/users-api.js?id=$id" },
    { "src": "/legacy", "status": 404 },
    { "src": "/.*", "dest": "https://my-old-site.com" }
  ]
}
```

----------------------------------------

TITLE: Ignoring Unchanged Builds with `npx turbo-ignore`
DESCRIPTION: This command is used as an ignored build step to prevent Vercel from building projects that have not changed in a monorepo. It uses `turbo-ignore` with a fallback to the previous commit (`HEAD^1`) to determine if a build is necessary.
SOURCE: https://vercel.com/docs/monorepos/turborepo

LANGUAGE: Shell
CODE:
```
npx turbo-ignore --fallback=HEAD^1
```

----------------------------------------

TITLE: Optimize Vercel Middleware to Reduce Fast Origin Transfer
DESCRIPTION: Explains how Middleware can incur Fast Origin Transfer twice and advises restricting Middleware execution using matchers (e.g., Next.js `matcher`) to prevent unnecessary usage.
SOURCE: https://vercel.com/docs/edge-network/manage-usage

LANGUAGE: English
CODE:
```
Restrict Middleware execution: Only run Middleware when necessary, e.g., using a Next.js matcher to restrict requests.
```

----------------------------------------

TITLE: Adding Custom Spans with OpenTelemetry API in JavaScript
DESCRIPTION: This snippet demonstrates how to add custom spans to your application traces using the `@opentelemetry/api` package. It shows how to get a tracer, start a span, add custom attributes, and ensure the span is properly ended, allowing for detailed instrumentation of specific operations.
SOURCE: https://vercel.com/docs/session-tracing

LANGUAGE: JavaScript
CODE:
```
import { trace } from '@opentelemetry/api';
 
const tracer = trace.getTracer('custom-tracer');
 
async function performOperation() {
  const span = tracer.startSpan('operation-name');
  try {
    // Your operation logic here
    span.setAttributes({
      'custom.attribute': 'value',
    });
  } finally {
    span.end();
  }
}
```

----------------------------------------

TITLE: JavaScript Web API: setInterval
DESCRIPTION: Documents the `setInterval` Web API function in JavaScript. Repeatedly calls a function, with a fixed time delay between each call. This entry provides a quick reference to its purpose and usage.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
setInterval:
  Description: Repeatedly calls a function, with a fixed time delay between each call
```

----------------------------------------

TITLE: Authenticate Turborepo CLI with Vercel
DESCRIPTION: This snippet shows how to authenticate the Turborepo CLI with your Vercel account. It includes a general login command and a specific command for SSO-enabled Vercel teams, requiring the team slug as an argument.
SOURCE: https://vercel.com/docs/monorepos/remote-caching

LANGUAGE: bash
CODE:
```
npx turbo login
```

LANGUAGE: bash
CODE:
```
npx turbo login --sso-team=team-slug
```

----------------------------------------

TITLE: Vercel Cron Expression Format and Limitations
DESCRIPTION: This section details the specific cron expression format supported by Vercel, outlining the valid range for each field (Minute, Hour, Day of Month, Month, Day of Week) and providing example expressions. It also highlights key limitations, such as the lack of support for alternative expressions and the constraint on configuring day of month and day of week simultaneously.
SOURCE: https://vercel.com/docs/cron-jobs

LANGUAGE: APIDOC
CODE:
```
Cron Expression Fields:
  - Minute:
    Range: 0 - 59
    Example: 5 * * * *
    Description: Triggers at 5 minutes past the hour
  - Hour:
    Range: 0 - 23
    Example: * 5 * * *
    Description: Triggers every minute, between 05:00 AM and 05:59 AM
  - Day of Month:
    Range: 1 - 31
    Example: * * 5 * *
    Description: Triggers every minute, on day 5 of the month
  - Month:
    Range: 1 - 12
    Example: * * * 5 *
    Description: Triggers every minute, only in May
  - Day of Week:
    Range: 0 - 6 (Sun-Sat)
    Example: * * * * 5
    Description: Triggers every minute, only on Friday

Limitations:
  - No alternative expressions (e.g., MON, JAN).
  - Cannot configure both day of the month and day of the week simultaneously; one must be '*'.
  - Timezone is always UTC.
```

----------------------------------------

TITLE: JavaScript Global Function: setTimeout
DESCRIPTION: Calls a function or evaluates an expression after a specified number of milliseconds, executing it only once after the delay.
SOURCE: https://vercel.com/docs/edge-middleware/edge-runtime

LANGUAGE: APIDOC
CODE:
```
setTimeout: Calls a function or evaluates an expression after a specified number of milliseconds
```

----------------------------------------

TITLE: Vercel Configuration Property: env
DESCRIPTION: This property is not recommended; custom environment variables should be defined in Project Settings. It passes environment variables to invoked Serverless Functions. The example demonstrates passing a static key and a dynamically resolved secret.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Property: env
Type: Object of String keys and values
Valid values: environment keys and values
```

LANGUAGE: json
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "env": {
    "MY_KEY": "this is the value",
    "SECRET": "@my-secret-name"
  }
}
```

----------------------------------------

TITLE: Track client-side event on a React button click
DESCRIPTION: Shows how to integrate the `track` function into a React component's `onClick` handler. This example tracks a 'Signup' event when a button is clicked, demonstrating a common use case for client-side event tracking.
SOURCE: https://vercel.com/docs/analytics/custom-events

LANGUAGE: JavaScript
CODE:
```
import { track } from '@vercel/analytics';
 
function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

----------------------------------------

TITLE: Implementing A/B Testing for Personalized Content with Edge Middleware
DESCRIPTION: This section describes how A/B testing is implemented using Vercel Edge Middleware to deliver personalized content variants (e.g., product carousels) based on user behavior or demographics, optimizing user engagement and site experience.
SOURCE: https://vercel.com/docs/pricing/how-does-vercel-calculate-usage-of-resources

LANGUAGE: APIDOC
CODE:
```
Scenario: Engaging with A/B Testing for Personalized Content
1. User Browsing: User scrolls to the bottom of the page.
2. Content Display: A product carousel is shown.
3. A/B Test Logic: Edge Middleware determines the content variant based on user behavior or demographics.
4. Personalized Content: The user is shown a specific variant of the site.

Priced Resources:
- Edge Middleware Invocations: Charges per invocation for A/B testing logic.
- Edge Requests: Network request charges for delivering test variants.
```

----------------------------------------

TITLE: Initialize OpenTelemetry with standard SDK for Next.js (/app)
DESCRIPTION: This code snippet shows how to initialize and configure the standard OpenTelemetry Node.js SDK within an `instrumentation.ts` file for Next.js applications using the `/app` directory. It sets up a resource with a service name and uses a `SimpleSpanProcessor` to export traces via HTTP.
SOURCE: https://vercel.com/docs/otel

LANGUAGE: TypeScript
CODE:
```
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
 
export function register() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'your-project-name',
      // NOTE: You can replace `your-project-name` with the actual name of your project
    }),
    spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
  });
 
  sdk.start();
}
```

----------------------------------------

TITLE: Managing Dynamic Cart State with Vercel KV and Functions
DESCRIPTION: This section explains how a dynamic shopping cart's state is managed using Vercel KV for persistence across sessions and Vercel Functions for cart logic. It covers the process of adding items and retrieving cart state to ensure a seamless user experience.
SOURCE: https://vercel.com/docs/pricing/how-does-vercel-calculate-usage-of-resources

LANGUAGE: APIDOC
CODE:
```
Scenario: Dynamic Interactions (Cart)
1. Add Product to Cart: User adds an item to their cart.
2. State Storage: Vercel KV is used to store the cart state.
3. Session Persistence: If the user leaves and returns to the site, the cart state is retrieved from the KV store.
4. Seamless Experience: Ensures a continuous cart state across sessions.

Priced Resources:
- Edge Requests: Network request charges for cart updates.
- Function Invocations: Function activation charges for managing cart logic.
- Function Duration: CPU runtime charges for the function processing the cart logic.
- Fast Origin Transfer: Data movement charges for fetching cart state from the cache.
- KV Requests: Charges for reading and writing cart state to the KV store.
- KV Storage: Charges for storing cart state in the KV store.
- KV Data Transfer: Data movement charges for fetching cart state from the KV store.
```

----------------------------------------

TITLE: Core Web Vitals Metrics Overview
DESCRIPTION: A summary of key Core Web Vitals metrics, their descriptions, and target values as defined by Google and the Web Performance Working Group. These metrics are crucial for assessing a web application's loading speed, responsiveness, and visual stability.
SOURCE: https://vercel.com/docs/speed-insights/metrics

LANGUAGE: APIDOC
CODE:
```
Core Web Vitals:
- Largest Contentful Paint (LCP):
    Description: Measures the time from page start to when the largest content element is fully visible.
    Target Value: 2.5 seconds or less
- Cumulative Layout Shift (CLS):
    Description: Quantifies the fraction of layout shift experienced by the user over the lifespan of the page.
    Target Value: 0.1 or less
- Interaction to Next Paint (INP):
    Description: Measures the time from user interaction to when the browser renders the next frame.
    Target Value: 200 millisecond or less
- First Contentful Paint (FCP):
    Description: Measures the time from page start to the rendering of the first piece of DOM content.
    Target Value: 1.8 seconds or less
- First Input Delay (FID):
    Description: Measures the time from a user's first interaction to the time the browser is able to respond.
    Target Value: 100 milliseconds or less
- Total Blocking Time (TBT):
    Description: Measures the total amount of time between FCP and TTI where the main thread was blocked long enough to prevent input responsiveness.
    Target Value: Under 800 milliseconds
- Time to First Byte (TTFB):
    Description: Measures the time from the request of a resource to when the first byte of a response begins to arrive.
    Target Value: Under 800 milliseconds
```

----------------------------------------

TITLE: Extend Request Lifetime with waitUntil Method
DESCRIPTION: Documents the `waitUntil()` method from `@vercel/functions`, which extends the lifetime of a request handler for the duration of a given Promise. It's used for non-blocking background tasks like logging or analytics after the response is sent, and is available in Node.js and Edge Runtime.
SOURCE: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package

LANGUAGE: APIDOC
CODE:
```
waitUntil(promise: Promise): void
  promise: The promise to wait for.
```

LANGUAGE: TypeScript
CODE:
```
import { waitUntil } from '@vercel/functions';
 
async function getBlog() {
  const res = await fetch('https://my-analytics-service.example.com/blog/1');
  return res.json();
}
 
export function GET(request: Request) {
  waitUntil(getBlog().then((json) => console.log({ json })));
  return new Response(`Hello from ${request.url}, I'm a Vercel Function!`);
}
```

----------------------------------------

TITLE: Example HTML for Twitter Card Metadata
DESCRIPTION: Illustrates how to include Twitter-specific metadata in an HTML document's <head>. This example sets twitter:title, twitter:description, twitter:image, and twitter:card to define how a link preview appears on Twitter, using a summary_large_image card type.
SOURCE: https://vercel.com/docs/deployments/og-preview

LANGUAGE: HTML
CODE:
```
<div>
  <head>
    <meta name="twitter:title" content="Vercel Edge Network for Twitter" />
    <meta
      name="twitter:description"
      content="Vercel Edge Network for Twitter"
    />
    <meta
      name="twitter:image"
      content="https://og-examples.vercel.sh/api/static"
    />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <h1>A page with Open Graph Image.</h1>
</div>
```

----------------------------------------

TITLE: Implement Server-Side Rendering with Gatsby's getServerData API
DESCRIPTION: This TypeScript example demonstrates how to use Gatsby's native `getServerData` API to perform Server-Side Rendering (SSR) for a page on Vercel. The `getServerData` function fetches dynamic data from an external API, handles potential errors, and passes the data as `serverData` props to the React component, enabling unique content per request.
SOURCE: https://vercel.com/docs/frameworks/gatsby

LANGUAGE: TypeScript
CODE:
```
import type { GetServerDataProps, GetServerDataReturn } from 'gatsby';
 
type ServerDataProps = {
  hello: string;
};
 
const Page = (props: PageProps) => {
  const { name } = props.serverData;
  return <div>Hello, {name}</div>;
};
 
export async function getServerData(
  props: GetServerDataProps,
): GetServerDataReturn<ServerDataProps> {
  try {
    const res = await fetch(`https://example-data-source.com/api/some-data`);
    return {
      props: await res.json(),
    };
  } catch (error) {
    return {
      status: 500,
      headers: {},
      props: {},
    };
  }
}
 
export default Page;
```

----------------------------------------

TITLE: CI/CD Workflow for Checking Vercel Deployment Errors
DESCRIPTION: A bash script for CI/CD workflows that deploys a Vercel project, captures stdout and stderr, and checks the exit code for errors. If successful, it prints the deployment URL; otherwise, it prints the error message from stderr.
SOURCE: https://vercel.com/docs/cli/deploy

LANGUAGE: Bash
CODE:
```
# save stdout and stderr to files
vercel deploy >deployment-url.txt 2>error.txt
 
# check the exit code
code=$?
if [ $code -eq 0 ]; then
    # Now you can use the deployment url from stdout for the next step of your workflow
    deploymentUrl=`cat deployment-url.txt`
    echo $deploymentUrl
else
    # Handle the error
    errorMessage=`cat error.txt`
    echo "There was an error: $errorMessage"
fi
```

----------------------------------------

TITLE: Defining a Basic Nuxt API Route
DESCRIPTION: This snippet provides a minimal example of defining an API route in Nuxt using `defineEventHandler`. It shows how to create a simple serverless function that returns a 'Hello World!' string. Nuxt automatically bundles routes from `/server/api`, `/server/routes`, and `/server/middleware` into a single Vercel Function.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
export default defineEventHandler(() => 'Hello World!');
```

----------------------------------------

TITLE: Configure Edge Middleware Path Matching with `config` Object
DESCRIPTION: These snippets illustrate how to use the `matcher` property within the `config` object to control which routes trigger the Edge Middleware. This method is preferred for performance as it avoids invoking the middleware on every request.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
export const config = {
  matcher: '/about/:path*'
};
```

LANGUAGE: TypeScript
CODE:
```
export const config = {
  matcher: ['/about/:path*', '/dashboard/:path*']
};
```

LANGUAGE: TypeScript
CODE:
```
export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)']
};
```

LANGUAGE: TypeScript
CODE:
```
export const config = {
  matcher: ['/blog/:slug(\d{1,})']
};
```

----------------------------------------

TITLE: Vercel Route Object Definition
DESCRIPTION: Defines the properties available for a single route object within the Vercel configuration, including matching criteria, destination, headers, and status codes.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
"src": A PCRE-compatible regular expression that matches each incoming pathname (excluding querystring).
"methods": A set of HTTP method types. If no method is provided, requests with any HTTP method will be a candidate for the route.
"dest": A destination pathname or full URL, including querystring, with the ability to embed capture groups as $1, $2…
"headers": A set of headers to apply for responses.
"status": A status code to respond with. Can be used in tandem with `Location:` header to implement redirects.
"continue": A boolean to change matching behavior. If `true`, routing will continue even when the `src` is matched.
"has": An optional array of `has` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the presence of specified properties
"missing": An optional array of `missing` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the absence of specified properties
```

----------------------------------------

TITLE: Create Vercel Project Programmatically
DESCRIPTION: This section provides examples for programmatically creating a new Vercel project. You can use either a direct cURL command to interact with the Vercel REST API or leverage the official Vercel SDK for JavaScript. Both methods allow for detailed configuration of project properties such as environment variables, framework, Git repository details, and build commands.
SOURCE: https://vercel.com/docs/projects/managing-projects

LANGUAGE: curl
CODE:
```
curl --request POST \
  --url https://api.vercel.com/v11/projects \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "environmentVariables": [
      {
        "key": "<env-key>",
        "target": "production",
        "gitBranch": "<git-branch>",
        "type": "system",
        "value": "<env-value>"
      }
    ],
    "framework": "<framework>",
    "gitRepository": {
      "repo": "<repo-url>",
      "type": "github"
    },
    "installCommand": "<install-command>",
    "name": "<project-name>",
    "rootDirectory": "<root-directory>"
  }'
```

LANGUAGE: javascript
CODE:
```
import { Vercel } from '@vercel/sdk';
 
const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});
 
async function run() {
  const result = await vercel.projects.createProject({
    requestBody: {
      name: '<project-name>',
      environmentVariables: [
        {
          key: '<env-key>',
          target: 'production',
          gitBranch: '<git-branch>',
          type: 'system',
          value: '<env-value>',
        },
      ],
      framework: '<framework>',
      gitRepository: {
        repo: '<repo-url>',
        type: 'github',
      },
      installCommand: '<install-command>',
      name: '<project-name>',
      rootDirectory: '<root-directory>',
    },
  });
 
  // Handle the result
  console.log(result);
}
 
run();
```

----------------------------------------

TITLE: Next.js App Router: Basic Loading File Implementation
DESCRIPTION: In the Next.js App Router, the `loading` file convention allows displaying an instant loading state for an entire route or route-segment. This file affects all its child elements, including layouts and pages, and continues to display its contents until the data fetching process in the route segment completes, improving perceived load times.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: React
CODE:
```
export default function Loading() {
  return <p>Loading...</p>;
}
```

----------------------------------------

TITLE: Define GCP Account Values as Vercel Environment Variables
DESCRIPTION: This table lists the required Google Cloud Platform (GCP) account values, their location in the Google Cloud Console, and the corresponding environment variable names to be declared in your Vercel project for OIDC integration.
SOURCE: https://vercel.com/docs/oidc/gcp

LANGUAGE: Configuration
CODE:
```
| Value | Location | Environment Variable | Example |
| --- | --- | --- | --- |
| Project ID | IAM & Admin -> Settings | `GCP_PROJECT_ID` | `my-project-123456` |
| Project Number | IAM & Admin -> Settings | `GCP_PROJECT_NUMBER` | `1234567890` |
| Service Account Email | IAM & Admin -> Service Accounts | `GCP_SERVICE_ACCOUNT_EMAIL` | `vercel@my-project-123456.iam.gserviceaccount.com` |
| Workload Identity Pool ID | IAM & Admin -> Workload Identity Federation -> Pools | `GCP_WORKLOAD_IDENTITY_POOL_ID` | `vercel` |
| Workload Identity Pool Provider ID | IAM & Admin -> Workload Identity Federation -> Pools -> Providers | `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `vercel` |
```

----------------------------------------

TITLE: Deploy an Existing Project with Vercel CLI
DESCRIPTION: Use this command-line interface snippet to deploy your existing web project to Vercel. This command is suitable for any web project that outputs static HTML content. Vercel automatically detects and sets optimal build and deployment configurations for supported frameworks.
SOURCE: https://vercel.com/docs/getting-started-with-vercel/import

LANGUAGE: Shell
CODE:
```
vercel --cwd [path-to-project]
```

----------------------------------------

TITLE: Cancel Vercel Function Requests with AbortController
DESCRIPTION: This example shows how to implement request cancellation in a Vercel Function using the `AbortController` API. It listens for the `abort` event on the request signal to clean up resources or stop ongoing operations, such as fetching data from a backend service, when the client cancels the request. This feature is specific to the Node.js runtime.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {{
  const abortController = new AbortController();
 
  request.signal.addEventListener("abort", () => {
    console.log("request aborted");
    abortController.abort();
  });
 
  const response = await fetch("https://my-backend-service.example.com", {
    headers: {
      Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
    },
    signal: abortController.signal,
  });
 
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
};
```

----------------------------------------

TITLE: Import Next.js `Image` Component
DESCRIPTION: Import the `Image` component from `next/image` in a Next.js application. This component is central to Vercel's built-in image optimization capabilities.
SOURCE: https://vercel.com/docs/image-optimization/quickstart

LANGUAGE: JavaScript
CODE:
```
import Image from 'next/image';
```

----------------------------------------

TITLE: Delete All Blobs from Vercel Blob Store
DESCRIPTION: This function demonstrates how to programmatically delete all blobs within a Vercel Blob store. It uses a loop with `list` and `del` methods to paginate through and remove blobs in batches of up to 1000, ensuring all blobs are deleted regardless of quantity.
SOURCE: https://vercel.com/docs/vercel-blob/examples

LANGUAGE: javascript
CODE:
```
import { list, del } from '@vercel/blob';
 
async function deleteAllBlobs() {
  let cursor;
 
  do {
    const listResult = await list({
      cursor,
      limit: 1000,
    });
 
    if (listResult.blobs.length > 0) {
      await del(listResult.blobs.map((blob) => blob.url));
    }
 
    cursor = listResult.cursor;
  } while (cursor);
 
  console.log('All blobs were deleted');
}
 
deleteAllBlobs().catch((error) => {
  console.error('An error occurred:', error);
});
```

----------------------------------------

TITLE: Configure Deferred Static Generation (DSG) in Gatsby
DESCRIPTION: This code snippet demonstrates how to enable Deferred Static Generation (DSG) for a Gatsby page. By setting `defer: true` in the `createPage` action, the page's generation is deferred until its first request, optimizing build times. This configuration is typically placed in the `gatsby-node` file.
SOURCE: https://vercel.com/docs/frameworks/gatsby

LANGUAGE: typescript
CODE:
```
import type { GatsbyNode } from 'gatsby';
 
export const createPages: GatsbyNode['createPages'] = async ({ actions }) => {
  const { createPage } = actions;
  createPage({
    defer: true,
    path: '/using-dsg',
    component: require.resolve('./src/templates/using-dsg.js'),
    context: {},
  });
};
```

----------------------------------------

TITLE: Creating a New Vercel Project with Automatic Framework Detection
DESCRIPTION: This example illustrates how to create a new Vercel Project using the `vercel` command, which includes automatic framework detection. The CLI guides the user through setting up the project name, code directory, and then suggests default build, output, and development commands based on the detected framework (e.g., Next.js).
SOURCE: https://vercel.com/docs/cli/project-linking

LANGUAGE: Shell
CODE:
```
vercel
? Set up and deploy "~/web/my-new-project"? [Y/n] y
? Which scope do you want to deploy to? My Awesome Team
? Link to existing project? [y/N] n
? What’s your project’s name? my-new-project
? In which directory is your code located? my-new-project/
Auto-detected project settings (Next.js):
- Build Command: `next build` or `build` from `package.json`
- Output Directory: Next.js default
- Development Command: next dev --port $PORT
? Want to override the settings? [y/N]
```

----------------------------------------

TITLE: Accessing Vercel Deployment Environment in Next.js
DESCRIPTION: This environment variable indicates the deployment environment (production, preview, or development) where the Next.js application is running. It helps in conditional logic based on the deployment stage.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Plaintext
CODE:
```
NEXT_PUBLIC_VERCEL_ENV=production
```

----------------------------------------

TITLE: Set OpenAI API Key Environment Variable
DESCRIPTION: Demonstrates how to set the OPENAI_API_KEY as an environment variable in your Vercel project for secure storage. It is crucial to keep API keys confidential, avoid exposing them in client-side code, and not commit these values to git.
SOURCE: https://vercel.com/docs/ai/openai

LANGUAGE: Shell
CODE:
```
OPENAI_API_KEY='sk-...3Yu5'
```

----------------------------------------

TITLE: Configure Incremental Static Regeneration (ISR) in Nuxt
DESCRIPTION: This configuration demonstrates how to enable Incremental Static Regeneration (ISR) for different routes in a Nuxt.js application using `routeRules` in `nuxt.config.ts`. It shows examples for revalidating routes, permanent caching, prerendering, and disabling ISR.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: TypeScript
CODE:
```
export default defineNuxtConfig({
  routeRules: {
    // all routes (by default) will be revalidated every 60 seconds, in the background
    '/**': { isr: 60 },
    // this page will be generated on demand and then cached permanently
    '/static': { isr: true },
    // this page is statically generated at build time and cached permanently
    '/prerendered': { prerender: true },
    // this page will be always fresh
    '/dynamic': { isr: false }
  }
});
```

----------------------------------------

TITLE: Ignore Analytics Events or Routes in Next.js
DESCRIPTION: This example demonstrates how to use the `beforeSend` function with `@vercel/analytics/next` to prevent specific events or routes (e.g., '/private') from being tracked by returning `null` from the function.
SOURCE: https://vercel.com/docs/analytics/redacting-sensitive-data

LANGUAGE: TypeScript
CODE:
```
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics
          beforeSend={(event: BeforeSendEvent) => {
            if (event.url.includes('/private')) {
              return null;
            }
            return event;
          }}
        />
      </body>
    </html>
  );
}
```

----------------------------------------

TITLE: Configure Vercel Edge Network Cache with s-maxage
DESCRIPTION: This example instructs the Edge Network to cache the response for 60 seconds. A response can be cached a minimum of 1 second and maximum of 31536000 seconds (1 year).
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: HTTP
CODE:
```
Cache-Control: s-maxage=60
```

----------------------------------------

TITLE: Exchange Authorization Code for Vercel Access Token
DESCRIPTION: Explains the process of exchanging a short-lived 'code' parameter, obtained via a redirect URL, for a long-lived access token using the Vercel API. It details the specific endpoint and required request body parameters for this authentication step.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Endpoint:
  POST https://api.vercel.com/v2/oauth/access_token

Request Body Parameters (application/x-www-form-urlencoded):
  - client_id: ID (Required)
    Description: ID of your application.
  - client_secret: String (Required)
    Description: Secret of your application.
  - code: String (Required)
    Description: The code you received.
  - redirect_uri: String (Required)
    Description: The Redirect URL you configured on the Integration Console.
```

----------------------------------------

TITLE: Generate Dynamic Open Graph Images with Vercel OG in Next.js API Route
DESCRIPTION: This example illustrates how to create a dynamic Open Graph image using `next/og` within a Next.js API Route. It defines a GET handler that returns an `ImageResponse` with custom HTML/CSS for generating social card images, which are automatically cached on the Vercel Edge Network.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET(request: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello world!
      </div>
    ),
    {
      width: 1200,
      height: 600,
    },
  );
}
```

----------------------------------------

TITLE: Create a New Next.js Project with TypeScript
DESCRIPTION: Initializes a new Next.js project using `create-next-app` with TypeScript, which is recommended for leveraging helpers from `next/server`.
SOURCE: https://vercel.com/docs/edge-middleware/quickstart

LANGUAGE: npx
CODE:
```
npx create-next-app@latest --typescript
```

----------------------------------------

TITLE: Network APIs Reference
DESCRIPTION: This section lists various Web APIs related to network operations, including fetching resources, handling HTTP requests and responses, and managing data formats like FormData and Blobs.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
API Reference:
- fetch: Fetches a resource
- Request: Represents an HTTP request
- Response: Represents an HTTP response
- Headers: Represents HTTP headers
- FormData: Represents form data
- File: Represents a file
- Blob: Represents a blob
- URLSearchParams: Represents URL search parameters
- Blob: Represents a blob
- Event: Represents an event
- EventTarget: Represents an object that can handle events
- PromiseRejectEvent: Represents an event that is sent to the global scope of a script when a JavaScript Promise is rejected
```

----------------------------------------

TITLE: Pulling Development Environment Variables
DESCRIPTION: Fetches the latest 'development' Environment Variables and Project Settings from the Vercel cloud to your local cache.
SOURCE: https://vercel.com/docs/cli/pull

LANGUAGE: Shell
CODE:
```
vercel pull
```

----------------------------------------

TITLE: Configure Vercel Remote Nx Runner in nx.json
DESCRIPTION: Update the `tasksRunnerOptions` field in your `nx.json` file to use the `@vercel/remote-nx` runner. This configuration enables remote caching for specified cacheable operations (e.g., build, test, lint, e2e) and requires a Vercel access token and optional team ID for authentication.
SOURCE: https://vercel.com/docs/monorepos/nx

LANGUAGE: JSON
CODE:
```
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "@vercel/remote-nx",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "token": "<token>",
        "teamId": "<teamId>"
      }
    }
  }
}
```

----------------------------------------

TITLE: Pull Vercel project environment variables
DESCRIPTION: Pulls environment variables from your Vercel project into your local development environment using the Vercel CLI, making them accessible to your application.
SOURCE: https://vercel.com/docs/ai/lmnt

LANGUAGE: vercel cli
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Filter Vercel Blobs by Prefix for Organized Storage
DESCRIPTION: This example shows how to upload a blob with a descriptive prefix (e.g., `user-uploads/`) and then efficiently retrieve all blobs sharing that prefix using the `list()` method's `prefix` option. This strategy is crucial for organizing large numbers of blobs into logical categories and performing targeted searches, improving data management and retrieval performance.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: JavaScript
CODE:
```
await put('user-uploads/avatar.jpg', file, { access: 'public' });
const userUploads = await list({ prefix: 'user-uploads/' });
```

----------------------------------------

TITLE: Create Next.js API Route for Split.io Feature Flags
DESCRIPTION: This example demonstrates creating a Next.js API route (`/api/split-example`) to fetch a Split.io treatment based on a user key. It initializes the Split SDK with Edge Config storage, retrieves a feature flag treatment, and returns a response based on the treatment value. Users can be specified via the `userKey` URL parameter.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/split-edge-config

LANGUAGE: typescript
CODE:
```
import {
  SplitFactory,
  PluggableStorage,
  ErrorLogger,
} from '@splitsoftware/splitio-browserjs';
import { EdgeConfigWrapper } from '@splitsoftware/vercel-integration-utils';
import { createClient } from '@vercel/edge-config';
 
export async function GET(request: Request) {
  const { EDGE_CONFIG_SPLIT_ITEM_KEY, SPLIT_SDK_CLIENT_API_KEY } = process.env;
 
  if (!SPLIT_SDK_CLIENT_API_KEY || !EDGE_CONFIG_SPLIT_ITEM_KEY)
    return new Response(
      `Failed to find your SDK Key (${SPLIT_SDK_CLIENT_API_KEY})
          or item key ${EDGE_CONFIG_SPLIT_ITEM_KEY}`,
    );
 
  const edgeConfigClient = createClient(process.env.EDGE_CONFIG);
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get('userKey') || 'anonymous';
  const client = SplitFactory({
    core: {
      authorizationKey: SPLIT_SDK_CLIENT_API_KEY,
      key: userKey,
    },
    mode: 'consumer_partial',
    storage: PluggableStorage({
      wrapper: EdgeConfigWrapper({
        // The Edge Config item key where Split stores
        // feature flag definitions
        edgeConfigItemKey: EDGE_CONFIG_SPLIT_ITEM_KEY,
        // The Edge Config client
        edgeConfig: edgeConfigClient,
      }),
    }),
    // Disable or keep only ERROR log level in production,
    // to minimize performance impact
    debug: ErrorLogger(),
  }).client();
 
  await new Promise((resolve) => {
    client.on(client.Event.SDK_READY, () => resolve);
    client.on(client.Event.SDK_READY_TIMED_OUT, () => resolve);
  });
 
  // Replace this with the feature flag you want
  const FEATURE_FLAG = 'New_Marketing_Page';
  const treatment = await client.getTreatment(FEATURE_FLAG);
 
  // Must await in app-router; waitUntil() is not
  // yet supported
  await client.destroy();
 
  // treatment will be 'control' if the SDK timed out
  if (treatment == 'control') return new Response('Control marketing page');
 
  return treatment === 'on'
    ? new Response('New marketing page')
    : new Response('Old marketing page');
}
```

----------------------------------------

TITLE: Accessing the 'x-vercel-ip-country-region' Header in Vercel Functions
DESCRIPTION: This header provides a string of up to three characters containing the region-portion of the ISO 3166-2 code for the first level region associated with the requester's public IP address. For example, in the United Kingdom this will be a country like 'England', not a county like 'Devon'. The code shows how to retrieve and use the `x-vercel-ip-country-region` header from the `Request` object in a Vercel Function.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

----------------------------------------

TITLE: Optimize Vercel Build Time by Excluding Development Dependencies
DESCRIPTION: To significantly reduce the build time and final bundle size for Vercel deployments, it is recommended to prevent the installation of development-only dependencies (e.g., testing frameworks, bundlers like webpack) in the production environment. This is achieved by modifying the project's install command to only include production-required packages.
SOURCE: https://vercel.com/docs/deployments/troubleshoot-a-build

LANGUAGE: npm
CODE:
```
npm install --only=production
```

LANGUAGE: yarn
CODE:
```
yarn install --production
```

----------------------------------------

TITLE: Access Production Domain URL for Vercel Projects
DESCRIPTION: Retrieve the production domain name for a Vercel project. This variable is always set, even in preview deployments, and is useful for generating reliable links like OG-image URLs. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: plaintext
CODE:
```
GATSBY_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

LANGUAGE: plaintext
CODE:
```
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Display Vercel Deployment Logs
DESCRIPTION: Retrieves runtime logs for a specific Vercel deployment using its URL or ID. The command streams newly emitted logs to the terminal for up to 5 minutes by default.
SOURCE: https://vercel.com/docs/cli/logs

LANGUAGE: Shell
CODE:
```
vercel logs [deployment-url | deployment-id]
```

----------------------------------------

TITLE: VERCEL_TARGET_ENV Environment Variable
DESCRIPTION: The system or custom environment that the app is deployed and running on. The value can be either `production`, `preview`, `development`, or the name of a custom environment. Available at both build and runtime.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_TARGET_ENV=production
```

----------------------------------------

TITLE: SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID Environment Variable
DESCRIPTION: This variable provides the ID of the pull request that triggered the deployment. If a deployment is created on a branch before a pull request is made, this value will be an empty string.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID=23
```

----------------------------------------

TITLE: Vercel Function Web Handler Request Parameter API
DESCRIPTION: This section details the `request` parameter used in Vercel Function Web Handlers. It specifies that `request` is an instance of the web standard `Request` object, which is extended by `NextRequest` in Next.js environments.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: APIDOC
CODE:
```
Parameter: request
  Description: An instance of the Request object
  Next.js Type: NextRequest
  Other Frameworks Type: Request
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: Install the Vercel command-line interface globally using pnpm, which is necessary for deploying applications to Vercel and interacting with the platform.
SOURCE: https://vercel.com/docs/image-optimization/quickstart

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel
```

----------------------------------------

TITLE: Vercel Function Route Segment Configuration Properties API
DESCRIPTION: This section outlines the key configuration properties available for Vercel Functions when using Next.js App Router's route segment config. It includes `runtime`, `preferredRegion`, and `maxDuration`, detailing their types, descriptions, and any specific constraints.
SOURCE: https://vercel.com/docs/functions/functions-api-reference

LANGUAGE: APIDOC
CODE:
```
Property: runtime
  Type: string
  Description: This optional property defines the runtime to use, and if not set the runtime will default to nodejs.

Property: preferredRegion
  Type: string
  Description: This optional property and can be used to specify the regions in which your function should execute. This can only be set when the runtime is set to edge.

Property: maxDuration
  Type: int
  Description: This optional property can be used to specify the maximum duration in seconds that your function can run for. This can't be set when the runtime is set to edge.
```

----------------------------------------

TITLE: Perform Initial Vercel CLI Production Deployment
DESCRIPTION: Run this command in your project's root directory to link your local directory to your Vercel Project and create a Production Deployment. This action also adds a '.vercel' directory to store Project and Organization IDs for future reference.
SOURCE: https://vercel.com/docs/deployments

LANGUAGE: shell
CODE:
```
vercel --prod
```

----------------------------------------

TITLE: ImageResponse Constructor Signature
DESCRIPTION: Defines the `ImageResponse` constructor from `@vercel/og`, showing its `element` and `options` parameters with their types and default values. This snippet illustrates how to import and instantiate `ImageResponse` for generating images.
SOURCE: https://vercel.com/docs/og-image-generation/og-image-api

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from '@vercel/og'
 
new ImageResponse(
  element: ReactElement,
  options: {
    width?: number = 1200
    height?: number = 630
    emoji?: 'twemoji' | 'blobmoji' | 'noto' | 'openmoji' = 'twemoji',
    fonts?: {
      name: string,
      data: ArrayBuffer,
      weight: number,
      style: 'normal' | 'italic'
    }[]
    debug?: boolean = false
 
    // Options that will be passed to the HTTP response
    status?: number = 200
    statusText?: string
    headers?: Record<string, string>
  },
)
```

----------------------------------------

TITLE: Run Basic Vercel Dev Command
DESCRIPTION: Execute the `vercel dev` command from the root of a Vercel Project directory to start a local development server.
SOURCE: https://vercel.com/docs/cli/dev

LANGUAGE: Shell
CODE:
```
vercel dev
```

----------------------------------------

TITLE: Checking for Environment Variable Existence in Edge Middleware
DESCRIPTION: Edge Middleware allows access to environment variables via `process.env`. To prevent conflicts with `process.env` object prototype methods, certain names are reserved. This example demonstrates how to safely check for the existence of an environment variable using `hasOwnProperty`.
SOURCE: https://vercel.com/docs/edge-middleware/limitations

LANGUAGE: JavaScript
CODE:
```
// returns `true`, if `process.env.MY_VALUE` is used anywhere & defined in the Vercel dashboard
process.env.hasOwnProperty('MY_VALUE');
```

----------------------------------------

TITLE: Embed OG Image in HTML Head
DESCRIPTION: This HTML snippet demonstrates how to include the generated Open Graph image in a webpage's `<head>` section. It uses a `<meta>` tag with the `property="og:image"` attribute, pointing to the absolute path of your `/api/og` endpoint.
SOURCE: https://vercel.com/docs/og-image-generation

LANGUAGE: HTML
CODE:
```
<head>
  <title>Hello world</title>
  <meta
    property="og:image"
    content="https://og-examples.vercel.sh/api/static"
  />
</head>
```

----------------------------------------

TITLE: Declare Python Project Dependencies in requirements.txt
DESCRIPTION: This `requirements.txt` file demonstrates how to specify Python package dependencies, such as `Flask==3.0.3`, for your Vercel project. Vercel automatically installs these dependencies during the build process.
SOURCE: https://vercel.com/docs/functions/runtimes/python

LANGUAGE: Python Requirements
CODE:
```
Flask==3.0.3
```

----------------------------------------

TITLE: Configure Vercel Rewrites for Vite SPA Deep Linking
DESCRIPTION: This `vercel.json` configuration snippet enables deep linking for Vite Single Page Applications (SPAs) deployed on Vercel. It defines a rewrite rule that directs all incoming requests to `index.html`, allowing client-side routing to handle the application's paths. This is crucial for SPAs where direct access to sub-paths should load the main application entry point.
SOURCE: https://vercel.com/docs/frameworks/vite

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

----------------------------------------

TITLE: Vercel Rewrites with Automatic Parameter Passing
DESCRIPTION: Shows the equivalent configuration using the modern `rewrites` property, where named parameters are automatically passed to the destination without explicit regex capture.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/product/:id", "destination": "/api/product" }]
}
```

----------------------------------------

TITLE: Create a New Next.js Application
DESCRIPTION: This command scaffolds a new Next.js project using `create-next-app`, providing a basic project structure to begin development.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/statsig-edge-config

LANGUAGE: npx
CODE:
```
npx create-next-app@latest
```

----------------------------------------

TITLE: Vercel-CDN-Cache-Control Header Definition
DESCRIPTION: Exclusive to Vercel, this header has top priority and controls caching behavior only within Vercel's Edge Cache. It is removed from the response and not sent to the client or any CDNs.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
Vercel-CDN-Cache-Control: string
  Description: Controls caching behavior only within Vercel's Edge Cache. Has top priority and is removed from the response before being sent to the client or other CDNs.
```

----------------------------------------

TITLE: Define HTTP API Routes in Astro with Vercel Functions
DESCRIPTION: This example illustrates how to create server-rendered API routes in Astro using Vercel Functions. It defines handlers for common HTTP methods (GET, POST, DELETE) and a catch-all ALL method, demonstrating how to return JSON responses. These routes scale automatically on Vercel based on traffic.
SOURCE: https://vercel.com/docs/frameworks/astro

LANGUAGE: TypeScript
CODE:
```
import { APIRoute } from 'astro/dist/@types/astro';
 
export const GET: APIRoute = ({ params, request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a GET!',
    }),
  );
};
 
export const POST: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a POST!',
    }),
  );
};
 
export const DELETE: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'This was a DELETE!',
    }),
  );
};
 
// ALL matches any method that you haven't implemented.
export const ALL: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: `This was a ${request.method}!`,
    }),
  );
};
```

----------------------------------------

TITLE: Create a Basic Vercel Function for Next.js App Router
DESCRIPTION: This snippet provides a minimal example for defining a serverless `GET` function within a Next.js application using the App Router. It demonstrates how to return a simple text response from a Vercel Function.
SOURCE: https://vercel.com/docs/functions

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

----------------------------------------

TITLE: Handling Errors in Vercel Redeploy with Shell Script
DESCRIPTION: Provides a shell script example for checking the exit code of the `vercel redeploy` command in a CI/CD workflow. It demonstrates how to capture both standard output and standard error, and then conditionally process the deployment URL or an error message based on the command's success.
SOURCE: https://vercel.com/docs/cli/redeploy

LANGUAGE: Shell
CODE:
```
# save stdout and stderr to files
vercel redeploy https://example-app-6vd6bhoqt.vercel.app >deployment-url.txt 2>error.txt
 
# check the exit code
code=$?
if [ $code -eq 0 ]; then
    # Now you can use the deployment url from stdout for the next step of your workflow
    deploymentUrl=`cat deployment-url.txt`
    echo $deploymentUrl
else
    # Handle the error
    errorMessage=`cat error.txt`
    echo "There was an error: $errorMessage"
fi
```

----------------------------------------

TITLE: Linking to an Existing Vercel Project via CLI
DESCRIPTION: This snippet demonstrates the interactive process of linking a local directory to an existing Vercel Project using the `vercel` command. It prompts the user to confirm setup, select a scope, and specify the existing project's name, resulting in the creation of a `.vercel` directory.
SOURCE: https://vercel.com/docs/cli/project-linking

LANGUAGE: Shell
CODE:
```
vercel
? Set up and deploy "~/web/my-lovely-project"? [Y/n] y
? Which scope do you want to deploy to? My Awesome Team
? Link to existing project? [y/N] y
? What’s the name of your existing project? my-lovely-project
🔗 Linked to awesome-team/my-lovely-project (created .vercel and added it to .gitignore)
```

----------------------------------------

TITLE: Vercel v0 API Chat Completions Endpoint Reference
DESCRIPTION: Detailed API documentation for the Vercel v0 Chat Completions endpoint, including the POST URL, required headers, and the structure of the request body with its fields and message object details.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: APIDOC
CODE:
```
Endpoint: POST https://api.v0.dev/v1/chat/completions
Description: This endpoint generates a model response based on a list of messages.

Headers:
  Authorization: Yes (Bearer token: Bearer $V0_API_KEY)
  Content-Type: Yes (Must be application/json)

Request body:
  model: string (Yes) - Model name. Use "v0-1.0-md".
  messages: array (Yes) - List of message objects forming the conversation.
  stream: boolean (No) - If true, the response will be returned as a stream of data chunks.
  tools: array (No) - Optional tool definitions (e.g., functions or API calls).
  tool_choice: string or object (No) - Specifies which tool to call, if tools are provided.

Message object fields:
  role: string (Yes) - One of "user", "assistant", or "system".
  content: string or array (Yes) - The message content. Can be a string or array of text/image blocks.
```

----------------------------------------

TITLE: Install AI SDK Package
DESCRIPTION: This snippet provides the command to install the AI SDK package using pnpm, a fast package manager. It's the first step to getting started with the AI SDK in your project.
SOURCE: https://vercel.com/docs/ai-sdk

LANGUAGE: pnpm
CODE:
```
pnpm i ai
```

----------------------------------------

TITLE: Vercel API: Deployments Scope Endpoints
DESCRIPTION: API endpoints for managing Vercel deployments, including listing, retrieving, creating, canceling, and deleting deployments, as well as managing files and aliases.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Deployments API Endpoints:
  Action: Read
    GET /v6/deployments
    GET /v13/deployments/{idOrUrl}
    GET /v2/deployments/{idOrUrl}/events
    GET /v6/deployments/{id}/files
    GET /v2/deployments/{id}/aliases
  Action: Read/Write
    GET /v6/deployments
    GET /v13/deployments/{idOrUrl}
    GET /v2/deployments/{idOrUrl}/events
    GET /v6/deployments/{id}/files
    GET /v2/deployments/{id}/aliases
    POST /v13/deployments
    PATCH /v12/deployments/{id}/cancel
    DELETE /v13/deployments/{id}
    POST /v2/files
```

----------------------------------------

TITLE: Track Client-Side Events with Specific Feature Flags in Vercel Analytics
DESCRIPTION: Demonstrates how to manually attach specific feature flags to a custom client-side event using the `track` function from `@vercel/analytics`. This allows for granular control over which flags are associated with a particular event.
SOURCE: https://vercel.com/docs/feature-flags/integrate-with-web-analytics

LANGUAGE: JavaScript
CODE:
```
import { track } from '@vercel/analytics';
 
track('My Event', {}, { flags: ['summer-sale'] });
```

----------------------------------------

TITLE: Install Vercel CLI globally with pnpm
DESCRIPTION: To ensure you have the latest features and functionalities, install the Vercel Command Line Interface globally using pnpm. This command updates or installs the CLI to its most recent version, which is a prerequisite for following the integration guide.
SOURCE: https://vercel.com/docs/ai/deepinfra

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Pull Vercel Environment Variables Locally
DESCRIPTION: Pulls environment variables from Vercel to make them available to your project locally, essential for accessing secrets like 'FLAGS_SECRET'.
SOURCE: https://vercel.com/docs/feature-flags/flags-explorer/getting-started

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Pull Vercel Environment Variables
DESCRIPTION: Pulls environment variables from your Vercel project into your local development environment using the Vercel CLI, ensuring your local setup matches your deployed project.
SOURCE: https://vercel.com/docs/ai/elevenlabs

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Vercel Environment Variable: VITE_VERCEL_GIT_COMMIT_SHA
DESCRIPTION: Accesses the Git SHA (Secure Hash Algorithm) of the commit that initiated the Vercel deployment. This unique identifier helps in tracking the exact code version deployed.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
VITE_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

----------------------------------------

TITLE: Link Local Project to Vercel
DESCRIPTION: Executes the Vercel CLI command to link your current local development directory to an existing Vercel project, a prerequisite for pulling environment variables and deploying.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/hypertune-edge-config

LANGUAGE: shell
CODE:
```
vercel link
```

----------------------------------------

TITLE: Vercel CLI Command: vercel pull
DESCRIPTION: Learn how to update your local project with remote environment variables using the vercel pull CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel pull
```

----------------------------------------

TITLE: Safely Stringify and Embed Flag Definitions in JSX
DESCRIPTION: This JavaScript/JSX example shows how to use `safeJsonStringify` from the `flags` package to securely embed feature flag definitions within a `<script>` tag in a React or Next.js application. This utility prevents Cross-Site Scripting (XSS) vulnerabilities that can arise from directly using `JSON.stringify` within HTML contexts.
SOURCE: https://vercel.com/docs/feature-flags/flags-explorer/reference

LANGUAGE: JavaScript
CODE:
```
import { safeJsonStringify } from 'flags';
 
<script type="application/json" data-flag-definitions>
  ${safeJsonStringify(definitions)}
</script>;
```

----------------------------------------

TITLE: Connect to multiple Edge Configs with createClient
DESCRIPTION: Illustrates how to use the `createClient` helper to connect to and read data from multiple Edge Configs, each associated with a different environment variable.
SOURCE: https://vercel.com/docs/edge-config/edge-config-sdk

LANGUAGE: JavaScript
CODE:
```
import { createClient } from '@vercel/edge-config';
 
// Fetch a single value from one config
const firstConfig = createClient(process.env.FIRST_EDGE_CONFIG);
const firstExampleValue1 = await firstConfig.get('other_example_key_1');
 
// Fetch all values from another config
const secondConfig = createClient(process.env.SECOND_EDGE_CONFIG);
const allValues = await secondConfig.getAll();
```

----------------------------------------

TITLE: Migrate GitHub Actions Workflow from deployment_status to repository_dispatch
DESCRIPTION: This example demonstrates how to update an existing GitHub Actions workflow from using the `deployment_status` event to the more efficient `repository_dispatch` event. It highlights changes in the `on` trigger, conditional `if` statements, and how to access deployment details (like the URL) from `github.event.client_payload` instead of `github.event.deployment_status.environment_url`.
SOURCE: https://vercel.com/docs/git/vercel-for-github

LANGUAGE: diff
CODE:
```
name: End to End Tests
 
on:
- deployment_status:
+ repository_dispatch:
+   types:
+    - 'vercel.deployment.success'
jobs:
  run-e2es:
-   if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
+   if: github.event_name == 'repository_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci && npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test
        env:
-         BASE_URL: ${{ github.event.deployment_status.environment_url }}
+         BASE_URL: ${{ github.event.client_payload.url }}
```

----------------------------------------

TITLE: Add Custom Headers: Legacy Routes vs. Modern Headers
DESCRIPTION: This snippet illustrates how to add custom `Cache-Control` headers to static assets like `favicon.ico` and files in the `/assets/` directory. It contrasts the legacy `routes` method, which requires `"continue": true` to prevent stopping at the first match, with the modern `headers` property, where continuation is the default behavior.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/favicon.ico",
      "headers": { "Cache-Control": "public, max-age=3600" },
      "continue": true
    },
    {
      "src": "/assets/(.*)",
      "headers": { "Cache-Control": "public, max-age=31556952, immutable" },
      "continue": true
    }
  ]
}
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/favicon.ico",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31556952, immutable"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: HTTP to HTTPS Redirection on Vercel
DESCRIPTION: This snippet shows the HTTP response status code and headers used by Vercel to automatically redirect all HTTP requests to HTTPS. This redirection uses a `308 Moved Permanently` status, ensuring secure connections for all deployments.
SOURCE: https://vercel.com/docs/encryption

LANGUAGE: HTTP
CODE:
```
HTTP/1.1 308 Moved Permanently
Content-Type: text/plain
Location: https://<your-deployment-host>
```

----------------------------------------

TITLE: Configure Vercel.json with Schema Autocomplete
DESCRIPTION: Adds autocompletion, type checking, and schema validation to your `vercel.json` file by referencing the Vercel OpenAPI schema at the top of the file.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

----------------------------------------

TITLE: Conditionally Apply Edge Middleware Logic with `rewrite`
DESCRIPTION: This example shows how to implement conditional logic within the Edge Middleware function using `if` statements to perform actions like URL rewriting based on the request's pathname. It utilizes the `rewrite` helper from the `@vercel/edge` package.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { rewrite } from '@vercel/edge';
 
export default function middleware(request: Request) {
  const url = new URL(request.url);
 
  if (url.pathname.startsWith('/about')) {
    return rewrite(new URL('/about-2', request.url));
  }
 
  if (url.pathname.startsWith('/dashboard')) {
    return rewrite(new URL('/dashboard/user', request.url));
  }
}
```

----------------------------------------

TITLE: Deploy to Production Environment using Vercel CLI
DESCRIPTION: Deploys your Vercel project to the production environment, making the latest changes live on your user-facing site. This command explicitly triggers a production deployment, updating your production domains to point to the new deployment.
SOURCE: https://vercel.com/docs/deployments/environments

LANGUAGE: Shell
CODE:
```
vercel --prod
```

----------------------------------------

TITLE: Configure Next.js Image Remote Patterns for Vercel Blob
DESCRIPTION: Updates `next.config.js` to allow `next/image` to load images from a Vercel Blob store by adding the store's public URL to `remotePatterns`.
SOURCE: https://vercel.com/docs/vercel-blob/server-upload

LANGUAGE: javascript
CODE:
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      new URL('https://my-store-id.public.blob.vercel-storage.com/**'),
    ],
  },
};
 
module.exports = nextConfig;
```

----------------------------------------

TITLE: Next.js App Router: On-demand Tag-based Data Revalidation Action
DESCRIPTION: This example demonstrates how to programmatically trigger on-demand revalidation for cached data using `revalidateTag` in a Next.js server action. This function invalidates all data associated with the specified tag (e.g., 'blog'), forcing a re-fetch on subsequent requests and propagating the revalidation across all regions within 300ms.
SOURCE: https://vercel.com/docs/data-cache

LANGUAGE: JavaScript
CODE:
```
'use server';
 
import { revalidateTag } from 'next/cache';
 
export default async function action() {
  revalidateTag('blog');
}
```

----------------------------------------

TITLE: Vercel Redirect: Permanent 308 to profile.html
DESCRIPTION: Example `vercel.json` configuration to redirect requests from `/me` to `/profile.html` using a 308 Permanent Redirect (`permanent: true`).
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/me", "destination": "/profile.html", "permanent": true }
  ]
}
```

----------------------------------------

TITLE: React 18: Using Suspense for Granular UI Loading States
DESCRIPTION: The `Suspense` component, introduced in React 18, enables displaying a fallback UI until components nested within it have finished loading. This approach offers more granular control than a `loading` file, making it useful when only specific sections of your UI require a loading state.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: React
CODE:
```
import { Suspense } from 'react';
import { PostFeed, Weather } from './components';
 
export default function Posts() {
  return (
    <section>
      <Suspense fallback={<p>Loading feed...</p>}>
        <PostFeed />
      </Suspense>
      <Suspense fallback={<p>Loading weather...</p>}>
        <Weather />
      </Suspense>
    </section>
  );
}
```

----------------------------------------

TITLE: Start Next.js Application Locally
DESCRIPTION: Installs project dependencies and starts the Next.js development server locally. After running this command, your application will typically be accessible in your browser at `http://localhost:3000`.
SOURCE: https://vercel.com/docs/integrations/cms/contentful

LANGUAGE: Shell
CODE:
```
pnpm install && pnpm run dev
```

----------------------------------------

TITLE: Create a Basic Hello World Python API Function on Vercel
DESCRIPTION: This Python code snippet demonstrates how to create a simple 'Hello, world!' API endpoint using `BaseHTTPRequestHandler` for Vercel Serverless Functions. It sets up a basic GET request handler that returns plain text.
SOURCE: https://vercel.com/docs/functions/runtimes/python

LANGUAGE: Python
CODE:
```
from http.server import BaseHTTPRequestHandler
 
class handler(BaseHTTPRequestHandler):
 
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        self.wfile.write('Hello, world!'.encode('utf-8'))
        return
```

----------------------------------------

TITLE: Implement a Vercel Function using Python's BaseHTTPRequestHandler
DESCRIPTION: Shows how to create a Python Vercel Function by extending `BaseHTTPRequestHandler`. The `do_GET` method handles GET requests, sending a 'Hello, world!' response. This code should be placed in `api/index.py`.
SOURCE: https://vercel.com/docs/functions/configuring-functions/runtime

LANGUAGE: Python
CODE:
```
from http.server import BaseHTTPRequestHandler
 
class handler(BaseHTTPRequestHandler):
 
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        self.wfile.write('Hello, world!'.encode('utf-8'))
        return
```

----------------------------------------

TITLE: Install Vercel Edge Config SDK
DESCRIPTION: Installs the Vercel Edge Config SDK using pnpm, required for interacting with Edge Config.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/launchdarkly-edge-config

LANGUAGE: pnpm
CODE:
```
pnpm i @vercel/edge-config
```

----------------------------------------

TITLE: Optimizing Vercel Edge Requests for Performance
DESCRIPTION: Provides strategies for optimizing Edge Requests, such as leveraging frameworks, identifying frequent re-mounting, reducing excessive polling/data fetching, and limiting prefetching.
SOURCE: https://vercel.com/docs/edge-network/manage-usage

LANGUAGE: English
CODE:
```
Leverage frameworks (Next.js, SvelteKit, Nuxt) to automatically reduce unnecessary requests.
Identify frequent re-mounting: Use browser devtools to find 304 status codes on repeated request paths.
Reduce excessive polling or data fetching: Limit API polling or data reloading tools like SWR/React Query.
Reduce prefetching: Consider using `prefetch="false"` on `<Link>` components in Next.js.
```

----------------------------------------

TITLE: Manage Vercel Project Environment Variables API Endpoints
DESCRIPTION: API endpoints for creating, reading, updating, and deleting integration-owned project environment variables for Vercel projects.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Read/Write Project Environment Variables Endpoints:
GET /v9/projects/{idOrName}/env
POST /v9/projects/{idOrName}/env
PATCH /v9/projects/{idOrName}/env/{id}
DELETE /v9/projects/{idOrName}/env/{keyOrId}
```

----------------------------------------

TITLE: Pull Vercel Environment Variables Locally
DESCRIPTION: This command utilizes the Vercel CLI to securely pull environment variables, such as `BLOB_READ_WRITE_TOKEN`, from your Vercel project to your local development environment, enabling local access and interaction with Vercel Blob.
SOURCE: https://vercel.com/docs/vercel-blob/client-upload

LANGUAGE: vercel cli
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: decodeURIComponent Global Function
DESCRIPTION: Decodes a Uniform Resource Identifier (URI) component previously created by encodeURIComponent or by a similar routine, restoring original characters.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
API: decodeURIComponent
Description: Decodes a Uniform Resource Identifier (URI) component previously created by encodeURIComponent or by a similar routine
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: To manage Vercel projects and pull environment variables from your CMS, install the Vercel CLI globally using pnpm. This command ensures you have the latest version.
SOURCE: https://vercel.com/docs/integrations/cms

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Webhook Event JSON Payload Structure
DESCRIPTION: This snippet illustrates the standard JSON format for all webhook events delivered via HTTP POST requests. It defines the common fields present in every event, such as a unique identifier, event type, creation timestamp, the specific event payload, and the region from which the event originated.
SOURCE: https://vercel.com/docs/webhooks

LANGUAGE: JSON
CODE:
```
"id": <eventId>,
  "type": <event-type>,
  "createdAt": <javascript-timestamp>,
  "payload": <payload for the event>,
  "region": <RegionId>,
```

----------------------------------------

TITLE: Pull Vercel Environment Variables
DESCRIPTION: This command pulls environment variables from your Vercel project into your local development environment, making them accessible for your application.
SOURCE: https://vercel.com/docs/ai/groq

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Link Vercel Projects in a Monorepo using CLI
DESCRIPTION: Use the Vercel CLI to link multiple Vercel projects within a monorepo. This command should be executed from the root directory of your monorepo and requires Vercel CLI version 20.1.0 or newer. After linking, subsequent Vercel commands will operate on the selected project.
SOURCE: https://vercel.com/docs/monorepos

LANGUAGE: CLI
CODE:
```
vercel link --repo
```

----------------------------------------

TITLE: Fetch All Edge Config Items with Authorization Header
DESCRIPTION: Shows how to retrieve all key-value pairs from an Edge Config using a GET request, authenticating with a Bearer token in the Authorization header. This is an alternative to using a query parameter for the token.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: cURL
CODE:
```
curl "https://edge-config.vercel.com/your_edge_config_id_here/items" \
     -H 'Authorization: Bearer your_edge_config_read_access_token_here'
```

LANGUAGE: JavaScript
CODE:
```
try {
  const readAllWithAuth = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/items',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_edge_config_read_access_token_here}`,
      },
    },
  );
  const result = await readAllWithAuth.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

----------------------------------------

TITLE: Cache-Control Header Definition
DESCRIPTION: A web standard header, last in priority. If neither `CDN-Cache-Control` nor `Vercel-CDN-Cache-Control` are set, this header is used by Vercel's Edge Cache before being forwarded to the client. The `s-maxage` directive is stripped by Vercel if only this header is used.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
Cache-Control: string
  Description: Standard web header, last in priority. Used by Vercel's Edge Cache if higher priority headers are not set. `s-maxage` is stripped if used alone.
```

----------------------------------------

TITLE: PUBLIC_VERCEL_ENV Environment Variable
DESCRIPTION: Specifies the environment where the Vercel application is deployed and running. Possible values include `production`, `preview`, or `development`.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Environment Variables
CODE:
```
PUBLIC_VERCEL_ENV=production
```

----------------------------------------

TITLE: Handling Malformed Request Body JSON in Node.js
DESCRIPTION: Shows how to use a `try...catch` block to gracefully handle errors when accessing `request.body` if the incoming request contains malformed JSON, allowing for custom error responses.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: Node.js
CODE:
```
try {
  request.body;
} catch (error) {
  return response.status(400).json({ error: 'My custom 400 error' });
}
```

----------------------------------------

TITLE: Define Cron Jobs for Dynamic Routes in vercel.json
DESCRIPTION: This configuration snippet illustrates how to define cron jobs for dynamic routes within the `vercel.json` file. Each entry specifies a `path` corresponding to a dynamic route (e.g., `/api/sync-slack-team/T0CAQ10TZ`) and a `schedule` using cron expressions, allowing Vercel to invoke these specific endpoints at scheduled times.
SOURCE: https://vercel.com/docs/cron-jobs/manage-cron-jobs

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/sync-slack-team/T0CAQ10TZ",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/sync-slack-team/T4BOE34OP",
      "schedule": "0 5 * * *"
    }
  ]
}
```

----------------------------------------

TITLE: Using TypeScript with Web Signature for JSON Response
DESCRIPTION: This TypeScript example shows a Vercel Function using the Web signature to handle a `GET` request and return a JSON response. It extracts a 'name' parameter from the URL's search parameters and constructs a JSON object with a personalized message.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: TypeScript
CODE:
```
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || 'World';
 
  return Response.json({ message: `Hello ${name}!` });
}
```

----------------------------------------

TITLE: Vercel Edge Middleware Configuration and Redirection
DESCRIPTION: Example of Vercel Edge Middleware using a custom matcher to intercept requests to '/about/:path*' and redirect them to '/about-2'. This snippet demonstrates how to configure middleware and perform a simple URL redirection.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
// config with custom matcher
export const config = {
  matcher: '/about/:path*'
};
 
export default function middleware(request: Request) {
  return Response.redirect(new URL('/about-2', request.url));
}
```

----------------------------------------

TITLE: Configure Vercel Image Optimization API
DESCRIPTION: The `images` property defines the behavior of Vercel's native Image Optimization API, enabling on-demand image optimization. It includes settings for allowed `sizes`, `localPatterns`, `remotePatterns`, `minimumCacheTTL`, `qualities`, `formats`, `dangerouslyAllowSVG`, `contentSecurityPolicy`, and `contentDispositionType`.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Type: `Object`

Value definition:
*   `sizes` - Required - Array of allowed image widths. The Image Optimization API will return an error if the `w` parameter is not defined in this list.
*   `localPatterns` - Allow-list of local image paths which can be used with the Image Optimization API.
*   `remotePatterns` - Allow-list of external domains which can be used with the Image Optimization API.
*   `minimumCacheTTL` - Cache duration (in seconds) for the optimized images.
*   `qualities` - Array of allowed image qualities. The Image Optimization API will return an error if the `q` parameter is not defined in this list.
*   `formats` - Supported output image formats. Allowed values are either `"image/avif"` and/or `"image/webp"`.
*   `dangerouslyAllowSVG` - Allow SVG input image URLs. This is disabled by default for security purposes.
*   `contentSecurityPolicy` - Specifies the [Content Security Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) of the optimized images.
*   `contentDispositionType` - Specifies the value of the `"Content-Disposition"` response header. Allowed values are `"inline"` or `"attachment"`.
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "images": {
    "sizes": [256, 640, 1080, 2048, 3840],
    "localPatterns": [{
      "pathname": "^/assets/.*$",
      "search": ""
    }],
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "example.com",
        "port": "",
        "pathname": "^/account123/.*$",
        "search": "?v=1"
      }
    ],
    "minimumCacheTTL": 60,
    "qualities": [25, 50, 75],
    "formats": ["image/webp"],
    "dangerouslyAllowSVG": false,
    "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;",
    "contentDispositionType": "inline"
  }
}
```

----------------------------------------

TITLE: Pull Vercel Project Environment Variables
DESCRIPTION: Command to retrieve and synchronize environment variables from your Vercel project to your local development environment using the Vercel CLI.
SOURCE: https://vercel.com/docs/ai/pinecone

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Pull Environment Variables with Vercel CLI
DESCRIPTION: This command pulls environment variables from your Vercel project into your local development environment. It ensures your local setup has access to necessary configurations, such as API keys or provider credentials.
SOURCE: https://vercel.com/docs/ai/deepinfra

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Configure Remote Caching for External CI/CD
DESCRIPTION: To integrate Vercel Remote Caching with external CI/CD systems, set specific environment variables. These variables provide the necessary authentication token and team slug for sharing task artifacts.
SOURCE: https://vercel.com/docs/monorepos/remote-caching

LANGUAGE: APIDOC
CODE:
```
TURBO_TOKEN: A Vercel Access Token
TURBO_TEAM: The slug of the Vercel team to share the artifacts with
```

----------------------------------------

TITLE: Check CAA Records for a Domain
DESCRIPTION: This command-line snippet uses 'dig' to query DNS for CAA (Certification Authority Authorization) records for a given domain. It helps verify if CAA records exist and what values they hold, which is crucial for SSL certificate issuance, especially with Let's Encrypt.
SOURCE: https://vercel.com/docs/domains/troubleshooting

LANGUAGE: Shell
CODE:
```
dig -t CAA +noall +ans example.com
```

----------------------------------------

TITLE: Vercel Project Configuration Properties in vercel.json
DESCRIPTION: This section details the configuration properties available in `vercel.json` to override project-level build settings for specific deployments. These properties allow fine-grained control over framework detection, build commands, and output directories.
SOURCE: https://vercel.com/docs/builds/configure-a-build

LANGUAGE: APIDOC
CODE:
```
vercel.json configuration properties:
  framework: string
    Purpose: Overrides the detected framework preset for a specific deployment.
    Usage: Add to your vercel.json configuration.
  buildCommand: string
    Purpose: Overrides the default build command for a specific deployment.
    Usage: Add to your vercel.json configuration.
  outputDirectory: string
    Purpose: Overrides the output directory for a specific deployment.
    Usage: Add to your vercel.json configuration.
```

----------------------------------------

TITLE: Pull Vercel Environment Variables Locally
DESCRIPTION: Describes how to download Vercel project environment variables for local development. This command populates your `.env.local` file, ensuring that your local environment mirrors the variables defined in your Vercel project settings.
SOURCE: https://vercel.com/docs/builds

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Nuxt Route Middleware for Redirection
DESCRIPTION: This Nuxt route middleware demonstrates how to intercept navigation and programmatically redirect users to a different route, such as '/secret'. It uses `defineNuxtRouteMiddleware` to define the logic that runs before a route is accessed, logging the original path before redirection.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
export default defineNuxtRouteMiddleware((to) => {
  console.log(
    `Heading to ${to.path} - but I think we should go somewhere else...`,
  );
 
  return navigateTo('/secret');
});
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: Installs or updates the Vercel command-line interface globally to the latest version, enabling interaction with Vercel projects from the terminal.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/split-edge-config

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: Installs the latest version of the Vercel CLI globally using pnpm, a prerequisite for interacting with Vercel projects and environment variables.
SOURCE: https://vercel.com/docs/ai/fal

LANGUAGE: Shell
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Fetch a single value from Edge Config using get
DESCRIPTION: Shows how to retrieve a single value from an Edge Config at a specified key using the `get` helper method within a Next.js API route.
SOURCE: https://vercel.com/docs/edge-config/edge-config-sdk

LANGUAGE: JavaScript
CODE:
```
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
 
export async function GET() {
  const val = await get('key');
 
  return NextResponse.json({
    label: `Value of \"key\" in my Edge Config.`,
    value: val,
  });
}
```

----------------------------------------

TITLE: Define an ASGI Application with Sanic in Python
DESCRIPTION: This snippet demonstrates how to define an asynchronous web application using the Sanic framework for ASGI. It sets up a basic Sanic app that responds with JSON, handling both the root path and dynamic paths, suitable for deployment on Vercel.
SOURCE: https://vercel.com/docs/functions/runtimes/python

LANGUAGE: Python
CODE:
```
from sanic import Sanic
from sanic.response import json
app = Sanic()
 
 
@app.route('/')
@app.route('/<path:path>')
async def index(request, path=""):
    return json({'hello': path})
```

----------------------------------------

TITLE: List Blobs within a Virtual Folder in Vercel Blob
DESCRIPTION: Illustrates how to retrieve a list of blobs that reside within a specific virtual folder in Vercel Blob. The `list` function is used with the `prefix` option to filter blobs by their path, effectively listing contents of a 'folder'.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: JavaScript
CODE:
```
const listOfBlobs = await list({
  cursor,
  limit: 1000,
  prefix: 'folder/',
});
```

----------------------------------------

TITLE: Test Deployed AI Agent API Endpoint with cURL
DESCRIPTION: This cURL command sends a POST request to the deployed AI agent API endpoint on Vercel. It includes a JSON payload with a `prompt` to trigger the agent's functionality and demonstrates how to interact with the deployed agent programmatically.
SOURCE: https://vercel.com/docs/agents

LANGUAGE: Shell
CODE:
```
curl -X POST https://<your-project-url.vercel.app>/api/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is the weather in Tokyo?"}'
```

----------------------------------------

TITLE: Initialize and Push Code to Git Repository
DESCRIPTION: These commands guide you through initializing a new Git repository, adding all current files, creating an initial commit, linking to a remote origin, and pushing the local `master` branch to the remote.
SOURCE: https://vercel.com/docs/integrations/cms/contentful

LANGUAGE: Git
CODE:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin
git push -u origin master
```

----------------------------------------

TITLE: Track events with custom data using Vercel Analytics
DESCRIPTION: Illustrates how to pass an object with key-value pairs as the second argument to the `track()` function. This allows for including custom data, such as location for a 'Signup' event or product details for a 'Purchase' event, providing richer analytics.
SOURCE: https://vercel.com/docs/analytics/custom-events

LANGUAGE: JavaScript
CODE:
```
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

----------------------------------------

TITLE: Vercel CLI Command: vercel promote
DESCRIPTION: Learn how to promote an existing deployment using the vercel promote CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel promote
```

----------------------------------------

TITLE: List Blob Objects using list() in Next.js App Router
DESCRIPTION: Presents a Next.js `/app` router example for creating an API route (`GET`) that lists all blob objects stored in the Vercel Blob store using the `@vercel/blob` `list` method. The example demonstrates fetching the list of blobs and returning them as a JSON response.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: TypeScript
CODE:
```
import { list } from '@vercel/blob';
 
export async function GET(request: Request) {
  const { blobs } = await list();
  return Response.json(blobs);
}
```

----------------------------------------

TITLE: SvelteKit Client-Side Display of Streamed Data
DESCRIPTION: This Svelte component (`+page.svelte`) illustrates how to consume data streamed from a server-side `load` function. It uses Svelte's built-in `#await` block to manage asynchronous data, displaying a loading message while `locationData.details` is pending and then rendering the city and IP address once the streamed data becomes available, enhancing user experience during data fetching.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: Svelte
CODE:
```
<script lang="ts">
  import type { PageData } from './$types'
  export let data: PageData;
</script>
 
<h1><span>Hello!</span></h1>
 
<div class="info">
  {#await data.locationData.details}
    <p>streaming delayed data from the server...</p>
  {:then details}
    <div>
      <p>City is {details.city}</p>
      <p>And IP is: {details.ip} </p>
    </div>
  {/await}
</div>
```

----------------------------------------

TITLE: Initiate Vercel Rollback to Specific Deployment
DESCRIPTION: This command allows users to roll back a production deployment to a specific previous version by providing its deployment ID or URL. Note that on the hobby plan, only the immediate previous production deployment can be targeted.
SOURCE: https://vercel.com/docs/cli/rollback

LANGUAGE: Shell
CODE:
```
vercel rollback [deployment-id or url]
```

----------------------------------------

TITLE: Define Conditional Redirect `has` or `missing` Object Properties
DESCRIPTION: This section describes the structure for `has` and `missing` objects used in conditional redirects. It specifies the `type`, `key`, and `value` properties required to match against headers, cookies, host, or query parameters.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Property: type
  Type: String
  Description: Must be either header, cookie, host, or query.
Property: key
  Type: String
  Description: The key from the selected type to match against.
Property: value
  Type: String or not defined
  Description: The value to check for, if undefined any value will match. A regex like string can be used to capture a specific part of the value. See example.
```

----------------------------------------

TITLE: Force Browser Refresh for Updated Blobs with Query Parameter
DESCRIPTION: When updating blobs, browser caches can prevent users from seeing the latest content. To bypass browser caching and ensure the updated blob is fetched, append a unique query parameter (e.g., a version number or timestamp) to the blob's URL. This forces the browser to treat it as a new resource.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: HTML
CODE:
```
<img
  src="https://1sxstfwepd7zn41q.public.blob.vercel-storage.com/blob-oYnXSVczoLa9yBYMFJOSNdaiiervF5.png?v=123456"
/>
```

----------------------------------------

TITLE: Configure DevCycle with Edge Config in Next.js (/app)
DESCRIPTION: This TypeScript code snippet demonstrates how to initialize DevCycle in a Next.js `/app` directory, configuring it to use Edge Config as its configuration source. It creates an Edge Config client and an `EdgeConfigSource` instance, then passes it to `setupDevCycle` to enable low-latency feature flag resolution.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/devcycle-edge-config

LANGUAGE: TypeScript
CODE:
```
import { createClient } from '@vercel/edge-config'
import { EdgeConfigSource} from '@devcycle/vercel-edge-config'
import { setupDevCycle } from '@devcycle/nextjs-sdk/server'
 
const edgeClient = createClient(process.env.EDGE_CONFIG)
const edgeConfigSource =new EdgeConfigSource(edgeClient)
 
export const { getVariableValue, getClientContext } = setupDevCycle({
  serverSDKKey: process.env.DEVCYCLE_SERVER_SDK_KEY ?? '',
  clientSDKKey: process.env.NEXT_PUBLIC_DEVCYCLE_CLIENT_SDK_KEY ?? '',
  userGetter: () => ({user_id: 'test_user'}),
  options: {
// pass the configSource option with the instance of EdgeConfigSource
    configSource: edgeConfigSource
  }
})
```

----------------------------------------

TITLE: Vercel Deployment URL Pattern for Git Branches
DESCRIPTION: This pattern describes the URL generated by Vercel for deployments associated with Git branches. This URL dynamically updates to reflect the most recent changes pushed to the branch, making it suitable for ongoing review with team members. Components include the project name, branch name, and scope slug.
SOURCE: https://vercel.com/docs/deployments/generated-urls

LANGUAGE: General
CODE:
```
<project-name>-git-<branch-name>-<scope-slug>.vercel.app
```

----------------------------------------

TITLE: Request Object API Properties Reference
DESCRIPTION: Details the properties of the `Request` object, which is a wrapper around the Fetch API `Request` object. It includes properties like `url`, `method`, `headers`, `body`, and various methods for parsing the request body or cloning the request.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: APIDOC
CODE:
```
Request Object:
  Properties:
    url:
      Type: string
      Description: The URL of the request
    method:
      Type: string
      Description: The HTTP method of the request
    headers:
      Type: Headers
      Description: The headers of the request
    body:
      Type: ReadableStream
      Description: The body of the request
    bodyUsed:
      Type: boolean
      Description: Whether the body has been read
    cache:
      Type: string
      Description: The cache mode of the request
    credentials:
      Type: string
      Description: The credentials mode of the request
    destination:
      Type: string
      Description: The destination of the request
    integrity:
      Type: string
      Description: The integrity of the request
    redirect:
      Type: string
      Description: The redirect mode of the request
    referrer:
      Type: string
      Description: The referrer of the request
    referrerPolicy:
      Type: string
      Description: The referrer policy of the request
    mode:
      Type: string
      Description: The mode of the request
    signal:
      Type: AbortSignal
      Description: The signal of the request
    arrayBuffer:
      Type: function
      Description: Returns a promise that resolves with an ArrayBuffer
    blob:
      Type: function
      Description: Returns a promise that resolves with a Blob
    formData:
      Type: function
      Description: Returns a promise that resolves with a FormData
    json:
      Type: function
      Description: Returns a promise that resolves with a JSON object
    text:
      Type: function
      Description: Returns a promise that resolves with a string
    clone:
      Type: function
      Description: Returns a clone of the request
```

----------------------------------------

TITLE: Conditionally Render Vercel Toolbar in Next.js App Router
DESCRIPTION: This React component demonstrates how to conditionally render the Vercel Toolbar in a Next.js application using the App Router. It shows the toolbar only to authenticated employees, preventing all visitors from being prompted to log in. It imports `VercelToolbar` from `@vercel/toolbar/next` and uses a custom `useIsEmployee` hook for authentication.
SOURCE: https://vercel.com/docs/vercel-toolbar/in-production-and-localhost/add-to-production

LANGUAGE: javascript
CODE:
```
'use client';
import { VercelToolbar } from '@vercel/toolbar/next';
import { useIsEmployee } from 'lib/auth'; // Your auth library
 
export function StaffToolbar() {
  const isEmployee = useIsEmployee();
  return isEmployee ? <VercelToolbar /> : null;
}
```

----------------------------------------

TITLE: Override Build Command in Vercel.json
DESCRIPTION: The `buildCommand` property allows overriding the default build command for a Vercel deployment. This value takes precedence over the Project Settings dashboard and the `build` script in `package.json`.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
buildCommand:
  Type: string | null
  Description: Overrides the Build Command in the Project Settings dashboard, and the build script from the package.json file for a given deployment.
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "next build"
}
```

----------------------------------------

TITLE: Configure Max Duration in Node.js/Next.js Function Code
DESCRIPTION: Set the maximum execution duration directly within a Vercel Function for runtimes like Node.js, Next.js (v13.5+), SvelteKit, Astro, Nuxt, and Remix. The `maxDuration` constant specifies the function's timeout in seconds, preventing runaway executions and managing resource consumption.
SOURCE: https://vercel.com/docs/functions/configuring-functions/duration

LANGUAGE: TypeScript
CODE:
```
export const maxDuration = 5; // This function can run for a maximum of 5 seconds
 
export function GET(request: Request) {
  return new Response('Vercel', {
    status: 200,
  });
}
```

----------------------------------------

TITLE: Configure basic IP-based rate limiting with @vercel/firewall
DESCRIPTION: This example demonstrates how to use the `checkRateLimit` function from `@vercel/firewall` with a predefined Rate limit ID to rate limit incoming requests based on their IP address. It returns a 429 status if the rate limit is exceeded.
SOURCE: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk

LANGUAGE: TypeScript
CODE:
```
import { checkRateLimit } from '@vercel/firewall';
 
export async function POST(request: Request) {
  const { rateLimited } = await checkRateLimit('update-object', { request });
  if ({ rateLimited }) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
  // Otherwise, continue with other tasks
}
```

----------------------------------------

TITLE: Using Regular Expressions with Named Capture Groups in Vercel Rewrites
DESCRIPTION: This `vercel.json` configuration demonstrates the use of named capture groups (`?<category>`, `?<id>`) in regular expressions for clearer and more maintainable rewrite rules. It converts a URL like `/products/shirts/123` to `/shop?category=$category&item=$id`, improving readability and organization.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "rewrites": [
    {
      "source": "^/products/(?<category>[a-z]+)/(?<id>\\d+)$",
      "destination": "/shop?category=$category&item=$id"
    }
  ]
}
```

----------------------------------------

TITLE: Configure Vite with vite-plugin-vercel for Vercel Environment Port
DESCRIPTION: This configuration snippet demonstrates how to integrate `vite-plugin-vercel` into a Vite project. It sets the development server's port to an environment variable `PORT`, which is crucial when deploying to platforms like Vercel. The `vite-plugin-vercel` plugin is then included to enable Vercel-specific features such as SSR and Serverless Functions.
SOURCE: https://vercel.com/docs/frameworks/vite

LANGUAGE: JavaScript
CODE:
```
import { defineConfig } from 'vite';
import vercel from 'vite-plugin-vercel';
 
export default defineConfig({
  server: {
    port: process.env.PORT as unknown as number,
  },
  plugins: [vercel()],
});
```

----------------------------------------

TITLE: Vercel Node.js Request and Response Helper Methods
DESCRIPTION: Overview of helper methods provided by Vercel on `Request` and `Response` objects in Node.js Serverless Functions, simplifying access to request data and response manipulation.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js

LANGUAGE: APIDOC
CODE:
```
method | description | object
--- | --- | ---
`request.query` | An object containing the request's [query string](https://en.wikipedia.org/wiki/Query_string), or `{}` if the request does not have a query string. | Request
`request.cookies` | An object containing the cookies sent by the request, or `{}` if the request contains no cookies. | Request
[`request.body`](#node.js-request-and-response-objects) | An object containing the body sent by the request, or `null` if no body is sent. | Request
`response.status(code)` | A function to set the status code sent with the response where `code` must be a valid [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes). Returns `response` for chaining. | Response
`response.send(body)` | A function to set the content of the response where `body` can be a `string`, an `object` or a `Buffer`. | Response
`response.json(obj)` | A function to send a JSON response where `obj` is the JSON object to send. | Response
`response.redirect(url)` | A function to redirect to the URL derived from the specified path with status code "307 Temporary Redirect". | Response
`response.redirect(statusCode, url)` | A function to redirect to the URL derived from the specified path, with specified [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes). | Response
```

----------------------------------------

TITLE: Configuring Wildcard Path Forwarding in Vercel Rewrites
DESCRIPTION: This `vercel.json` example demonstrates how to use a single wildcard (`:path*`) to capture and forward multiple path segments. A request to `/docs/getting-started/install` will be rewritten to `/help/getting-started/install`, effectively remapping paths.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "rewrites": [
    {
      "source": "/docs/:path*",
      "destination": "/help/:path*"
    }
  ]
}
```

----------------------------------------

TITLE: Install Vercel CLI globally with pnpm
DESCRIPTION: This command installs the Vercel command-line interface (CLI) globally using pnpm, a fast, disk-space efficient package manager. The Vercel CLI enables you to manage your Vercel projects directly from your terminal.
SOURCE: https://vercel.com/docs/getting-started-with-vercel

LANGUAGE: JavaScript
CODE:
```
pnpm i -g vercel
```

----------------------------------------

TITLE: Define Basic Server-Side Rendered Route
DESCRIPTION: Routes defined in your application are deployed with server-side rendering by default. This example demonstrates a basic route configuration that renders with SSR.
SOURCE: https://vercel.com/docs/frameworks/react-router

LANGUAGE: TypeScript
CODE:
```
import { type RouteConfig, index } from '@react-router/dev/routes';
 
export default [index('routes/home.tsx')] satisfies RouteConfig;
```

----------------------------------------

TITLE: Vercel Image Component Source Example
DESCRIPTION: Illustrates the usage of the Vercel `<Image>` component, showing how a single `src` prop value defines a source image that can generate multiple optimized images.
SOURCE: https://vercel.com/docs/image-optimization/legacy-pricing

LANGUAGE: JSX
CODE:
```
<Image src="/hero.png" width="700" height="745" />
```

----------------------------------------

TITLE: Vercel API: Integration Configuration Scope Endpoints
DESCRIPTION: API endpoints for interacting with Vercel integration installations, covering read and read/write operations.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Integration Configuration API Endpoints:
  Action: Read
    GET /v1/integrations/configurations
    GET /v1/integrations/configuration/{id}
  Action: Read/Write
    GET /v1/integrations/configurations
    GET /v1/integrations/configuration/{id}
    DELETE /v1/integrations/configuration/{id}
```

----------------------------------------

TITLE: Vercel CLI Command: vercel rollback
DESCRIPTION: Learn how to roll back your production deployments to previous deployments using the vercel rollback CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel rollback
```

----------------------------------------

TITLE: Force Vercel Deployment without Build Cache
DESCRIPTION: Execute this Vercel CLI command to initiate a new build and deployment, bypassing any existing build cache.
SOURCE: https://vercel.com/docs/deployments/troubleshoot-a-build

LANGUAGE: CLI
CODE:
```
vercel --force
```

----------------------------------------

TITLE: Retrieve specific items from Edge Config using getAll with keys
DESCRIPTION: Illustrates how to fetch only a subset of key-value pairs from an Edge Config by passing an array of desired keys to the `getAll` helper method.
SOURCE: https://vercel.com/docs/edge-config/edge-config-sdk

LANGUAGE: JavaScript
CODE:
```
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';
 
export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);
 
  return NextResponse.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

----------------------------------------

TITLE: VERCEL_PROJECT_PRODUCTION_URL Environment Variable
DESCRIPTION: A production domain name of the project. This is always set, even in preview deployments, and is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme `https://`. Available at both build and runtime.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Perform Automatic Multipart Upload with Vercel Blob put()
DESCRIPTION: Illustrates how to enable automatic multipart uploads for large files using the `put` method by simply setting the `multipart` option to `true`. This simplifies the process of splitting, uploading, and completing file parts.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: JavaScript
CODE:
```
const blob = await put('large-movie.mp4', file, {
  access: 'public',
  multipart: true,
});
```

----------------------------------------

TITLE: Fetch Single Edge Config Item with Query Parameter
DESCRIPTION: Demonstrates how to retrieve a specific item from an Edge Config by its key, using a GET request with the read access token as a query parameter. The key is appended to the /item path.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: cURL
CODE:
```
curl "https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1?token=your_edge_config_read_access_token_here" \
```

LANGUAGE: JavaScript
CODE:
```
try {
  const readSingle = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1?token=your_edge_config_read_access_token_here',
  );
  const result = await readSingle.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

----------------------------------------

TITLE: Assign Custom Domain to Deployment with vercel alias set
DESCRIPTION: This command assigns a specified custom domain to a given deployment URL. It is used for manually aliasing deployments to custom domains.
SOURCE: https://vercel.com/docs/cli/alias

LANGUAGE: Shell
CODE:
```
vercel alias set [deployment-url] [custom-domain]
```

----------------------------------------

TITLE: Manage Trusted IPs using Vercel REST API
DESCRIPTION: This snippet demonstrates how to update an existing Vercel project's Trusted IPs configuration using the Vercel REST API. It details the request body parameters for enabling/updating and disabling Trusted IPs.
SOURCE: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/trusted-ips

LANGUAGE: APIDOC
CODE:
```
Vercel Project Update API Body Parameters for Trusted IPs:
- deploymentType: string
    * prod_deployment_urls_and_all_previews: Standard Protection
    * all: All Deployments
    * preview: Only Preview Deployments
    * production: Only Production Deployments
- addresses: Array of objects
    * value: string (The IPv4, or IPv4 CIDR address)
    * note: string (Optional note about the address)
    * protectionMode: string
        * additional: IP is required along with other enabled protection methods (recommended setting)
```

LANGUAGE: JSON
CODE:
```
{  "trustedIps": {
      "deploymentType": "all" | "preview" | "production" | "prod_deployment_urls_and_all_previews",
      "addresses": { "value": "<value>"; "note": "<note>" | undefined }[],
      "protectionMode": "additional"
  }
}
{  "trustedIps": null
}
```

----------------------------------------

TITLE: Configure Project-Level On-Demand Concurrent Builds
DESCRIPTION: This section provides examples for configuring project-level on-demand concurrent builds, allowing queued builds to automatically proceed. It demonstrates how to enable elastic concurrency and optionally select an enhanced build machine type using both cURL and the Vercel SDK.
SOURCE: https://vercel.com/docs/builds/managing-builds

LANGUAGE: curl
CODE:
```
curl --request PATCH \
  --url https://api.vercel.com/v9/projects/YOUR_PROJECT_ID?teamId=YOUR_TEAM_ID \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "resourceConfig": {
      "elasticConcurrencyEnabled": true,
      "buildMachineType": "enhanced"
    }
  }'
```

LANGUAGE: javascript
CODE:
```
import { Vercel } from '@vercel/sdk';
 
const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});
 
async function run() {
  const result = await vercel.projects.updateProject({
    idOrName: 'YOUR_PROJECT_ID',
    teamId: 'YOUR_TEAM_ID',
    requestBody: {
      resourceConfig: {
        elasticConcurrencyEnabled: true,
        buildMachineType: 'enhanced',
      },
    },
  });
 
  // Handle the result
  console.log(result);
}
 
run();
```

----------------------------------------

TITLE: Remove Query Parameters from Analytics Events in React
DESCRIPTION: This example shows how to modify the `event.url` within the `beforeSend` function to remove specific query parameters (e.g., 'secret') before the event is sent to Vercel analytics, ensuring sensitive data is not tracked.
SOURCE: https://vercel.com/docs/analytics/redacting-sensitive-data

LANGUAGE: JavaScript
CODE:
```
'use client';
import { Analytics } from '@vercel/analytics/react';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics
          beforeSend={(event) => {
            const url = new URL(event.url);
            url.searchParams.delete('secret');
            return {
              ...event,
              url: url.toString(),
            };
          }}
        />
      </body>
    </html>
  );
}
```

----------------------------------------

TITLE: Filter Vercel Logs in JSON Format with JQ
DESCRIPTION: Displays Vercel deployment logs in JSON format, enabling programmatic parsing. This example pipes the output to `jq` to filter and show only log entries with a 'warning' level, demonstrating advanced log processing.
SOURCE: https://vercel.com/docs/cli/logs

LANGUAGE: Shell
CODE:
```
vercel logs [deployment-url | deployment-id] --json | jq 'select(.level == "warning")'
```

----------------------------------------

TITLE: Rewrite Object Definition API Reference
DESCRIPTION: Defines the properties available for a rewrite object within the Vercel configuration. Includes details on source, destination, permanence, and conditional matching using 'has' and 'missing' properties.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Rewrite Object Properties:
  source: string
    Description: A pattern that matches each incoming pathname (excluding querystring).
  destination: string
    Description: A location destination defined as an absolute pathname or external URL.
  permanent: boolean
    Description: A boolean to toggle between permanent (308) and temporary (307) redirect (default true).
  has: Array<object> (optional)
    Description: An array of 'has' objects with 'type', 'key', and 'value' properties. Used for conditional rewrites based on the presence of specified properties.
  missing: Array<object> (optional)
    Description: An array of 'missing' objects with 'type', 'key', and 'value' properties. Used for conditional rewrites based on the absence of specified properties.
```

----------------------------------------

TITLE: Add Key-Value Pair to Edge Config Store
DESCRIPTION: Define a JSON object representing a key-value pair to be stored in the Vercel Edge Config, such as a 'greeting' message.
SOURCE: https://vercel.com/docs/edge-config/get-started

LANGUAGE: JSON
CODE:
```
{
  "greeting": "hello world"
}
```

----------------------------------------

TITLE: Initialize and Push Application Code to Git
DESCRIPTION: This code block provides a sequence of Git commands to initialize a new repository, stage all current files, commit them with an initial message, link to a remote Git repository, and push the local main branch to the remote. This is a crucial first step before importing your project into Vercel.
SOURCE: https://vercel.com/docs/integrations/cms/sitecore

LANGUAGE: bash
CODE:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin [repository url]
git push -u origin main
```

----------------------------------------

TITLE: Vercel Function API Support for Node.js Runtime
DESCRIPTION: Details the API capabilities available for Vercel Functions running on the Node.js runtime, including support for geolocation data, access to request headers, and the ability to cache responses.
SOURCE: https://vercel.com/docs/functions/limitations

LANGUAGE: APIDOC
CODE:
```
|  | Node.js runtime (and more) |
| --- | --- |
| Geolocation data | [Yes](/docs/headers#x-vercel-ip-country) |
| Access request headers | Yes |
| Cache responses | [Yes](/docs/edge-network/caching#using-vercel-functions) |
```

----------------------------------------

TITLE: Implement Dynamic Redirects with Vercel Functions
DESCRIPTION: This snippet demonstrates how to perform a dynamic redirect using a Vercel Function. It utilizes `next/navigation`'s `redirect` function within a `GET` request handler to send the user to a specified URL.
SOURCE: https://vercel.com/docs/redirects

LANGUAGE: javascript
CODE:
```
import { redirect } from 'next/navigation';
 
export async function GET(request: Request) {
  redirect('https://nextjs.org/');
}
```

----------------------------------------

TITLE: Track Upload Progress for Vercel Blob Operations
DESCRIPTION: This example demonstrates how to monitor the progress of a blob upload using the `onUploadProgress` callback. It shows how to log the loaded bytes, total bytes, and percentage completion during the upload process. This callback is available on `put` and `upload` methods.
SOURCE: https://vercel.com/docs/vercel-blob/examples

LANGUAGE: javascript
CODE:
```
const blob = await upload('big-file.mp4', file, {
  access: 'public',
  handleUploadUrl: '/api/upload',
  onUploadProgress: (progressEvent) => {
    console.log(`Loaded ${progressEvent.loaded} bytes`);
    console.log(`Total ${progressEvent.total} bytes`);
    console.log(`Percentage ${progressEvent.percentage}%`);
  },
});
```

----------------------------------------

TITLE: Pulling Vercel Environment Variables to Local .env Files
DESCRIPTION: Explains how to download environment variables from the Vercel cloud to a local file, such as `.env.local`. It demonstrates pulling variables for development, preview, or specific Git branches.
SOURCE: https://vercel.com/docs/cli/env

LANGUAGE: Shell
CODE:
```
vercel env pull [file]
```

LANGUAGE: Shell
CODE:
```
vercel env pull --environment=preview
```

LANGUAGE: Shell
CODE:
```
vercel env pull --environment=preview --git-branch=feature-branch
```

----------------------------------------

TITLE: Link Turborepo Remote Cache to Vercel Project
DESCRIPTION: Links your Turborepo project to a specific Vercel team scope, defining who the remote cache should be shared with. This step is crucial for optimizing build processes by enabling the sharing of build outputs across your Vercel team.
SOURCE: https://vercel.com/docs/integrations/ecommerce/bigcommerce

LANGUAGE: Shell
CODE:
```
turbo link
```

----------------------------------------

TITLE: Test Vercel Functions Locally with CLI
DESCRIPTION: This snippet demonstrates the Vercel CLI command used to test Vercel Functions and other compute resources locally, particularly when not integrated with a frontend framework.
SOURCE: https://vercel.com/docs/edge-network

LANGUAGE: CLI
CODE:
```
vercel dev
```

----------------------------------------

TITLE: Manually Promoting a Staged Deployment to Production
DESCRIPTION: Promotes a previously created staged deployment to production, making it live on the project's domain. This command requires the deployment's ID or URL.
SOURCE: https://vercel.com/docs/cli/deploying-from-cli

LANGUAGE: Shell
CODE:
```
vercel promote [deployment-id or url]
```

----------------------------------------

TITLE: Integrate Vercel Analytics Component in Next.js App Router
DESCRIPTION: This TypeScript code snippet demonstrates how to integrate the Analytics component into the root layout of a Next.js application using the /app directory. The component wraps the tracking script, providing seamless integration and route support for analytics.
SOURCE: https://vercel.com/docs/frameworks/nextjs

LANGUAGE: TypeScript
CODE:
```
import { Analytics } from '@vercel/analytics/next';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

----------------------------------------

TITLE: Abort Vercel Blob Requests with AbortController
DESCRIPTION: This snippet illustrates how to cancel an ongoing Vercel Blob operation using an `AbortController`, similar to a standard fetch call. It demonstrates setting a timeout to abort a `put` request and handling the `BlobRequestAbortedError` specifically, along with other potential errors.
SOURCE: https://vercel.com/docs/vercel-blob/examples

LANGUAGE: javascript
CODE:
```
const abortController = new AbortController();
 
try {
  const blobPromise = vercelBlob.put('hello.txt', 'Hello World!', {
    access: 'public',
    abortSignal: abortController.signal,
  });
 
  const timeout = setTimeout(() => {
    // Abort the request after 1 second
    abortController.abort();
  }, 1000);
 
  const blob = await blobPromise;
 
  console.info('blob put request completed', blob);
 
  clearTimeout(timeout);
 
  return blob.url;
} catch (error) {
  if (error instanceof vercelBlob.BlobRequestAbortedError) {
    // Handle the abort
    console.info('canceled put request');
  }
 
  // Handle other errors
}
```

----------------------------------------

TITLE: Get Vercel Git Pull Request ID
DESCRIPTION: Retrieves the ID of the pull request that triggered the deployment. If a deployment is created on a branch before a pull request is made, this value will be an empty string.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
VITE_VERCEL_GIT_PULL_REQUEST_ID=23
```

----------------------------------------

TITLE: Access Vercel Git Pull Request ID
DESCRIPTION: Retrieve the ID of the GitHub pull request that triggered the deployment. This value will be an empty string if the deployment was created on a branch before a pull request was made.
SOURCE: https://vercel.com/docs/git/vercel-for-github

LANGUAGE: shell
CODE:
```
VERCEL_GIT_PULL_REQUEST_ID=23
```

----------------------------------------

TITLE: Vercel Blob: SDK Error Handling with try/catch
DESCRIPTION: This snippet demonstrates how to implement robust error handling when interacting with the Vercel Blob SDK. It advises wrapping SDK requests in a `try/catch` block to gracefully manage common issues like missing parameters, invalid tokens, or store-related errors, and specifically identifies `BlobAccessError` for targeted handling.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: TypeScript
CODE:
```
import { put, BlobAccessError } from '@vercel/blob';
 
try {
  await put(...);
} catch (error) {
  if (error instanceof BlobAccessError) {
    // handle a recognized error
  } else {
    // throw the error again if it's unknown
    throw error;
  }
}
```

----------------------------------------

TITLE: Configure Community Runtimes with vercel.json 'functions' Property
DESCRIPTION: The 'functions' property in 'vercel.json' allows users to specify and configure community runtimes for their Vercel Functions, enabling support for languages not officially provided by default.
SOURCE: https://vercel.com/docs/functions/runtimes

LANGUAGE: APIDOC
CODE:
```
Property: functions
  Type: object
  Description: Used to configure community runtimes for Vercel Functions.
  Usage: Set in `vercel.json` to specify custom runtime modules.
  Reference: /docs/project-configuration#functions
```

----------------------------------------

TITLE: Create Next.js API Route for OG Image with Embedded SVG
DESCRIPTION: This snippet demonstrates how to create a Next.js API route (`route.tsx`) to generate an Open Graph image that includes an embedded SVG. It leverages `next/og`'s `ImageResponse` to render HTML and SVG content into an image, which is ideal for social media sharing.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <svg fill="black" viewBox="0 0 284 65">
          <path d="M141.68 16.25c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm117.14-14.5c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm-39.03 3.5c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9v-46h9zM37.59.25l36.95 64H.64l36.95-64zm92.38 5l-27.71 48-27.71-48h10.39l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9v-34h9v9.2c0-5.08 5.91-9.2 13.2-9.2z" />
        </svg>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

----------------------------------------

TITLE: Read All Edge Config Items using Vercel REST API GET Request
DESCRIPTION: This section explains how to retrieve all items from a Vercel Edge Config using a GET request. While the Vercel SDK is the recommended approach for reading data, this provides the API method. It includes the URL format and examples in cURL and JavaScript (fetch API) for making the request.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: APIDOC
CODE:
```
Endpoint: GET https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items[?teamId=your_team_id_here]

Headers:
  Authorization: Bearer {your_vercel_api_token_here}

Response: JSON object containing Edge Config items.
```

LANGUAGE: cURL
CODE:
```
curl "https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here" \
     -H 'Authorization: Bearer your_vercel_api_token_here'
```

LANGUAGE: JavaScript
CODE:
```
try {
  const readItems = await fetch(
    'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`
      }
    }
  );
  const result = await readItems.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

----------------------------------------

TITLE: Configure Cache-Control Headers in React Router
DESCRIPTION: Demonstrates how to use the `headers` function within a React Router route to add `Cache-Control` headers. This example sets `s-maxage` to 1 second and `stale-while-revalidate` to 59 seconds, allowing cached content to be served while revalidating in the background.
SOURCE: https://vercel.com/docs/frameworks/react-router

LANGUAGE: JavaScript
CODE:
```
import { Route } from './+types/some-route';
 
export function headers(_: Route.HeadersArgs) {
  return {
    'Cache-Control': 's-maxage=1, stale-while-revalidate=59',
  };
}
 
export async function loader() {
  // Fetch data necessary to render content
}
```

----------------------------------------

TITLE: Using RequestContext with waitUntil for Background Tasks in Edge Functions
DESCRIPTION: The `RequestContext` extends the standard `Request` object, providing the `waitUntil` function to execute background tasks after a response has been sent. This example demonstrates fetching data asynchronously and logging it without delaying the response.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import type { RequestContext } from '@vercel/edge';
 
export default function handler(request: Request, context: RequestContext) {
  context.waitUntil(getAlbum().then((json) => console.log({ json })));
 
  return new Response(`Hello there, from ${request.url} I'm an Edge Function!`);
}
 
export const config = {
  matcher: '/',
};
 
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 
async function getAlbum() {
  const res = await fetch('https://jsonplaceholder.typicode.com/albums/1');
  await wait(10000);
  return res.json();
}
```

----------------------------------------

TITLE: Accessing Vercel Request Signature Header in Next.js
DESCRIPTION: This snippet illustrates how to obtain the `x-vercel-signature` header, which is used to verify that a request originated from Vercel. This header contains a hash signature that can be used to validate the request body's integrity and authenticity.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function POST(request: Request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

----------------------------------------

TITLE: Testing Shopify Webhooks Locally with ngrok
DESCRIPTION: Instructions for setting up and testing Shopify webhooks during local development using ngrok to expose the local server to the internet. This allows Shopify to send notifications to your local application.
SOURCE: https://vercel.com/docs/integrations/ecommerce/shopify

LANGUAGE: Shell
CODE:
```
npm run dev
```

LANGUAGE: Shell
CODE:
```
ngrok http 3000
```

----------------------------------------

TITLE: Configure Skew Protection for Next.js (v13.4.7 to 14.1.3)
DESCRIPTION: This configuration snippet for `next.config.js` enables Skew Protection for Next.js applications running versions 13.4.7 to 14.1.3. It activates `useDeploymentId` for static file requests and optionally `useDeploymentIdServerActions` for Server Actions.
SOURCE: https://vercel.com/docs/skew-protection

LANGUAGE: JavaScript
CODE:
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useDeploymentId: true,
    // Optionally, use with Server Actions
    useDeploymentIdServerActions: true,
  },
};
 
module.exports = nextConfig;
```

----------------------------------------

TITLE: Define Redirect Object Properties
DESCRIPTION: This section outlines the properties available for configuring redirects in Vercel. It details parameters such as source, destination, and various conditional options like `has` and `missing` for precise control over redirect behavior.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Property: source
  Description: A pattern that matches each incoming pathname (excluding querystring).
Property: destination
  Description: A location destination defined as an absolute pathname or external URL.
Property: permanent
  Description: An optional boolean to toggle between permanent and temporary redirect (default true). When true, the status code is 308. When false the status code is 307.
Property: statusCode
  Description: An optional integer to define the status code of the redirect. Used when you need a value other than 307/308 from permanent, and therefore cannot be used with permanent boolean.
Property: has
  Description: An optional array of has objects with the type, key and value properties. Used for conditional redirects based on the presence of specified properties.
Property: missing
  Description: An optional array of missing objects with the type, key and value properties. Used for conditional redirects based on the absence of specified properties.
```

----------------------------------------

TITLE: Install AI SDK and OpenAI Packages
DESCRIPTION: Instructions for installing the necessary `ai` and `@ai-sdk/openai` packages using pnpm. These packages are essential for interacting with AI models and streaming responses.
SOURCE: https://vercel.com/docs/functions/streaming-functions

LANGUAGE: pnpm
CODE:
```
pnpm i ai openai
```

----------------------------------------

TITLE: Override Vercel Ignore Build Step Command
DESCRIPTION: The `ignoreCommand` property in `vercel.json` allows overriding the default ignored build step. If the command exits with code 1, the build continues; if it exits with 0, the build is ignored. This provides granular control over deployment triggers.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Type: `string | null`
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

----------------------------------------

TITLE: Rewrite Requests with Path Variables
DESCRIPTION: This example rewrites requests to the paths under `/resize` that with 2 paths levels (defined as variables `width` and `height` that can be used in the destination value) to the api route `/api/sharp` relative to your site's root.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/resize/:width/:height", "destination": "/api/sharp" }
  ]
}
```

----------------------------------------

TITLE: Example cURL Request for Vercel v0 Chat Completions
DESCRIPTION: This cURL command demonstrates how to make a basic API call to the Vercel v0 Chat Completions endpoint. It includes the necessary authorization header, content type, and a simple message payload.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: Shell
CODE:
```
curl https://api.v0.dev/v1/chat/completions \
  -H "Authorization: Bearer $V0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "v0-1.0-md",
    "messages": [
      { "role": "user", "content": "Create a Next.js AI chatbot" }
    ]
  }'
```

----------------------------------------

TITLE: Accessing Environment Variables in Edge Runtime
DESCRIPTION: Environment variables can be accessed within the Edge runtime using the standard `process.env` object.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
process.env:
  Description: Used to access Environment Variables.
```

----------------------------------------

TITLE: Vercel Modern Redirects for Temporary Redirects
DESCRIPTION: Demonstrates the equivalent temporary redirect configuration using the modern `redirects` property, disabling the `permanent` flag.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/posts/:id",
      "destination": "/blog/:id",
      "permanent": false
    }
  ]
}
```

----------------------------------------

TITLE: Accessing Environment Variables in Edge Runtime
DESCRIPTION: Environment variables can be accessed using the `process.env` object within the Vercel Edge runtime.
SOURCE: https://vercel.com/docs/edge-middleware/edge-runtime

LANGUAGE: JavaScript
CODE:
```
const myVariable = process.env.MY_ENV_VARIABLE;
```

----------------------------------------

TITLE: Create Custom Environment
DESCRIPTION: Provides methods to create a new custom environment (e.g., staging, QA) for a Vercel project. This functionality is available for Pro and Enterprise plans and can be achieved via cURL or the Vercel SDK.
SOURCE: https://vercel.com/docs/deployments/environments

LANGUAGE: Shell
CODE:
```
curl --request POST \
  --url https://api.vercel.com/v9/projects/<project-id-or-name>/custom-environments \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "slug": "<environment_name_slug>",
    "description": "<environment_description>"
  }'
```

LANGUAGE: JavaScript
CODE:
```
import { Vercel } from '@vercel/sdk';
 
const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});
 
async function run() {
  const result = await vercel.environment.createCustomEnvironment({
    idOrName: '<project-id-or-name>',
    requestBody: {
      slug: '<environment_name_slug>',
      description: '<environment_description>',
    },
  });
  // Handle the result
  console.log(result);
}
 
run();
```

----------------------------------------

TITLE: No-op Middleware Example with NextResponse.next()
DESCRIPTION: This simple example shows the basic usage of `NextResponse.next()` to allow the middleware chain to continue without any modifications, resulting in a `200 OK` response.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: TypeScript
CODE:
```
import { NextResponse } from 'next/server';
export default function middleware() {
  return NextResponse.next();
}
```

----------------------------------------

TITLE: Turborepo Configuration for Environment Variable and File Caching
DESCRIPTION: This JSON configuration for `turbo.json` demonstrates how to declare environment variables (`env`, `globalEnv`) and files (`globalDependencies`) that should influence Turborepo's cache hashing. It shows how to define task-specific environment variables for `build` tasks and global environment variables or file dependencies that affect all tasks. This ensures consistent caching across different environments and prevents accidental production deployments of staging builds. Note that `env` and `globalEnv` support is available in Turborepo version 1.5 or later.
SOURCE: https://vercel.com/docs/monorepos/turborepo

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://turborepo.com/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "env": [
        "SOME_ENV_VAR"
      ],
      "outputs": ["dist/**"]
    },
    "web#build": {
      "dependsOn": ["^build"],
      "env": ["SOME_OTHER_ENV_VAR"],
      "outputs": [".next/**", "!.next/cache/**"]
    }
  },
  "globalEnv": [
    "GITHUB_TOKEN"
  ],
  "globalDependencies": [
    "tsconfig.json"
  ]
}
```

----------------------------------------

TITLE: Vercel API Integration Scopes Overview
DESCRIPTION: A comprehensive list of Vercel API scopes, detailing the permissions granted by each for integration development and management.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Scope: integration-configuration
  Description: Interact with the installation of your integration
Scope: deployment
  Description: Interact with deployments
Scope: deployment-check
  Description: Verify deployments with Checks
Scope: edge-config
  Description: Create and manage Edge Configs and their tokens
Scope: project
  Description: Access project details and settings
Scope: project-env-vars
  Description: Create and manage integration-owned project environment variables
Scope: global-project-env-vars
  Description: Create and manage all account project environment variables
Scope: team
  Description: Access team details
Scope: user
  Description: Get information about the current user
Scope: log-drain
  Description: Create and manage log drains to forward logs
Scope: domain
  Description: Manage and interact with domains and certificates. Write permissions are required for both `project` and `domain` when updating the domain of a project.
```

----------------------------------------

TITLE: Generate Audio with ElevenLabs SDK
DESCRIPTION: Initializes the ElevenLabs client with an API key and demonstrates how to generate multilingual audio using a specified voice and model, then plays the generated audio.
SOURCE: https://vercel.com/docs/ai/elevenlabs

LANGUAGE: TypeScript
CODE:
```
// index.ts
import { ElevenLabsClient, play } from 'elevenlabs';
const elevenlabs = new ElevenLabsClient({
  apiKey: 'YOUR_API_KEY', // Defaults to process.env.ELEVENLABS_API_KEY
});
const audio = await elevenlabs.generate({
  voice: 'Rachel',
  text: 'Hello! 你好! Hola! नमस्ते! Bonjour! こんにちは! مرحبا! 안녕하세요! Ciao! Cześć! Привіт! வணக்கம்!',
  model_id: 'eleven_multilingual_v2',
});
await play(audio);
```

----------------------------------------

TITLE: Rewrite All Requests to SPA Root
DESCRIPTION: This example rewrites all requests to the root path which is often used for a Single Page Application (SPA).
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

----------------------------------------

TITLE: Cache-Control Priority: Vercel Functions vs. Config Files
DESCRIPTION: Demonstrates that `Cache-Control` headers returned from Vercel Functions take priority over those defined in `next.config.js` or `vercel.json`.
SOURCE: https://vercel.com/docs/headers/cache-control-headers

LANGUAGE: APIDOC
CODE:
```
Scenario: Vercel Function vs. Config Files
  Vercel Function response headers: Cache-Control: s-maxage=60
  vercel.json or next.config.js headers: Cache-Control: s-maxage: 120
  Cache behavior: 60s TTL
  Headers sent to the client: Cache-Control: public, max-age: 0
```

----------------------------------------

TITLE: API: createMultipartUploader Function Reference
DESCRIPTION: Documents the `createMultipartUploader` function, detailing its required `pathname` and `options` parameters, including `access`, `contentType`, `token`, `addRandomSuffix`, `cacheControlMaxAge`, and `abortSignal`.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: APIDOC
CODE:
```
createMultipartUploader(pathname: string, options: object)
  pathname: (Required) A string specifying the path inside the blob store. This will be the base value of the return URL and includes the filename and extension.
  options: (Required) A JSON object with the following required and optional parameters:
    access: (Required) "public"
    contentType: (Optional) The media type for the file. If not specified, it's derived from the file extension. Falls back to "application/octet-stream" when no extension exists or can't be matched.
    token: (Optional) A string specifying the token to use when making requests. It defaults to process.env.BLOB_READ_WRITE_TOKEN when deployed on Vercel as explained in Read-write token. You can also pass a client token created with the generateClientTokenFromReadWriteToken method.
    addRandomSuffix: (Optional) A boolean specifying whether to add a random suffix to the pathname. It defaults to true.
    cacheControlMaxAge: (Optional) A number in seconds to configure the edge and browser cache. Defaults to one year. See the caching documentation for more details.
    abortSignal: (Optional) An AbortSignal to cancel the operation.
```

----------------------------------------

TITLE: Configure Speed Insights to Filter or Modify Events with beforeSend
DESCRIPTION: The `beforeSend` function allows developers to modify or filter event data before it is sent to Vercel. This example demonstrates how to ignore events from a specific URL path, such as '/sensitive-path', by returning `null`, or send the event as is by returning the data object.
SOURCE: https://vercel.com/docs/speed-insights/package

LANGUAGE: JavaScript
CODE:
```
// Example usage of beforeSend
beforeSend: (data) => {
  if (data.url.includes('/sensitive-path')) {
    return null; // this will ignore the event
  }
  return data; // this will send the event as is
};
```

----------------------------------------

TITLE: Configure Basic Rewrites in vercel.json
DESCRIPTION: Demonstrates the fundamental structure for defining rewrites within a `vercel.json` file, illustrating how to map a source path to a destination path for basic routing within your Vercel project.
SOURCE: https://vercel.com/docs/rewrites

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/source-path",
      "destination": "/destination-path"
    }
  ]
}
```

----------------------------------------

TITLE: Pull Vercel Environment Variables Locally
DESCRIPTION: Pulls environment variables configured in your linked Vercel project and saves them into a .env.local file in your current directory, making them accessible for local development.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/hypertune-edge-config

LANGUAGE: shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: JSON Log Drain Batch Data Structure
DESCRIPTION: This API documentation describes the comprehensive JSON array format used for `json` type log drains. Each object in the array represents a log entry, detailing attributes such as ID, message, timestamp, source (build, static, external, lambda), project and deployment identifiers, and host. For request-related logs, it includes `requestId`, `statusCode`, `path`, `executionRegion`, and a nested `proxy` object with detailed request information like method, scheme, user agent, referer, client IP, and cache details.
SOURCE: https://vercel.com/docs/log-drains/log-drains-reference

LANGUAGE: APIDOC
CODE:
```
[
  {
    "id": <identifier>,
    "message": <Log messages that push the log over 256 KB can be truncated to only show tail>,
    "timestamp": <timestamp>,
    "type": <"stdout" or "stderr">,
    "source": <"build", "static", "external", or "lambda">,
    "projectId": <identifier of project>,
    "deploymentId": <identifier of deployment>,
    "buildId": <identifier of build>,
    "host": <deployment unique url hostname>,
    "entrypoint": <entrypoint>
  },
  {
    "id": <identifier>,
    "message": <Log messages that push the log over 256 KB can be truncated to only show tail >,
    "timestamp": <timestamp>,
    "requestId": <identifier of request>,
    "statusCode": <HTTP status code of request>,
    "source": <"build", "static", "external", or "lambda">,
    "projectId": <identifier of project>,
    "deploymentId": <identifier of deployment>,
    "buildId": <identifier of build only on build logs>,
    "destination": <origin of external content only on external logs>,
    "host": <deployment unique url hostname>,
    "path": <function or the dynamic path of the request>,
    "executionRegion": <region where the request is executed>,
    "level": <"error", "warning", or "info">,
    "proxy": {
      "timestamp": <timestamp of proxy request>,
      "method": <method of request>,
      "scheme": <protocol of request>,
      "host": <alias hostname if exists>,
      "path": <request path>,
      "userAgent": <user agent>,
      "referer": <referer>,
      "statusCode": <HTTP status code of proxy request>,
      "clientIp": <client IP>,
      "region": <region request is processed>,
      "cacheId": <original request id when request is served from cache>,
      "vercelCache": <the X-Vercel-Cache value sent to the browser>,
      "wafAction": <the action taken by firewall rules if they exist>,
      "wafRule": <the id of the rule that matched the request if it exists>
    }
  }
]
```

----------------------------------------

TITLE: Link Turborepo to Vercel Remote Cache
DESCRIPTION: This command connects your monorepo to the Vercel Remote Cache, enabling shared cache artifacts. Users will be prompted to confirm and select a team scope for billing and sharing.
SOURCE: https://vercel.com/docs/monorepos/remote-caching

LANGUAGE: bash
CODE:
```
npx turbo link
```

----------------------------------------

TITLE: Vercel API: Manage Project Environment Variables
DESCRIPTION: Provides API endpoints for creating, reading, updating, and deleting project-level environment variables within Vercel projects.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
Action: Read/Write
Endpoints:
  GET /v9/projects/{idOrName}/env (Retrieve environment variables)
  POST /v9/projects/{idOrName}/env (Create one or more environment variables)
  PATCH /v9/projects/{idOrName}/env/{id} (Edit an environment variable)
  DELETE /v9/projects/{idOrName}/env/{keyOrId} (Remove an environment variable)
```

----------------------------------------

TITLE: Displaying SvelteKit Layout Data in Svelte Component
DESCRIPTION: This Svelte component snippet illustrates how to consume data provided by a SvelteKit `load` function within a layout. By using `export let data;`, the component receives the `deploymentGitBranch` property, which is then dynamically rendered into the HTML. This showcases how server-side data is seamlessly integrated into the client-side Svelte UI.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: Svelte
CODE:
```
<script>
  /** @type {import('./$types').LayoutData} */
  export let data;
</script>
 
<p>This staging environment was deployed from {data.deploymentGitBranch}.</p>
```

----------------------------------------

TITLE: Authenticate Vercel CLI Commands with an Authorization Token
DESCRIPTION: The `--token` option, shorthand `-t`, allows users to execute Vercel CLI commands using a specific authorization token. This provides a way to authenticate commands without relying on the default login session, useful for automation or CI/CD environments.
SOURCE: https://vercel.com/docs/cli/global-options

LANGUAGE: bash
CODE:
```
vercel --token iZJb2oftmY4ab12HBzyBXMkp
```

----------------------------------------

TITLE: Generate FLAGS_SECRET using Node.js Crypto
DESCRIPTION: This snippet demonstrates how to generate a 32-byte base64url encoded random string using Node.js's `crypto` module, suitable for use as the `FLAGS_SECRET` environment variable for Vercel's Flags API.
SOURCE: https://vercel.com/docs/feature-flags/flags-explorer/reference

LANGUAGE: node
CODE:
```
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

----------------------------------------

TITLE: Example JSON Structure for Vercel Checks API Metrics Output
DESCRIPTION: Illustrates the expected JSON structure for the `metrics` field within the `output` property of a Vercel check, showing typical values for FCP, LCP, CLS, and TBT, including `value`, `previousValue`, and `source`. All fields are required except `previousValue`.
SOURCE: https://vercel.com/docs/checks/creating-checks

LANGUAGE: JSON
CODE:
```
{
  "path": "/",
  "output": {
    "metrics": {
        "FCP": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        },
        "LCP": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        },
        "CLS": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        },
        "TBT": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        }
      }
    }
  }
}
```

----------------------------------------

TITLE: Accessing the 'x-forwarded-proto' Header in Vercel Functions
DESCRIPTION: This header represents the protocol of the forwarded server, typically `https` in production and `http` in development. The code demonstrates how to retrieve and use the `x-forwarded-proto` header from the `Request` object in a Vercel Function.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

----------------------------------------

TITLE: JavaScript: Initialize Multipart Uploader
DESCRIPTION: Demonstrates how to create an instance of the multipart uploader by calling `createMultipartUploader` with the target pathname and configuration options.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: JavaScript
CODE:
```
const uploader = await createMultipartUploader(pathname, options);
```

----------------------------------------

TITLE: Vercel CLI Command: vercel init
DESCRIPTION: Learn how to initialize example Vercel Projects locally using the vercel init CLI command.
SOURCE: https://context7_llms

LANGUAGE: APIDOC
CODE:
```
vercel init
```

----------------------------------------

TITLE: Create a New Vercel Project
DESCRIPTION: Initiates the process to create a new Vercel Project, typically prompting for project details and configuration.
SOURCE: https://vercel.com/docs/cli/project

LANGUAGE: Shell
CODE:
```
vercel project add
```

----------------------------------------

TITLE: Retrieve Vercel Deployment Details via cURL API Call
DESCRIPTION: This cURL command demonstrates how to use the Vercel REST API's 'Get a deployment by ID or URL' endpoint to fetch additional details about a specific deployment. An `access_token` is required for authorization.
SOURCE: https://vercel.com/docs/integrations/create-integration/deployment-integration-action

LANGUAGE: cURL
CODE:
```
curl https://api.vercel.com/v13/deployments/dpl_568301234 \
  -H "Authorization: {access_token}"
```

----------------------------------------

TITLE: List All Edge Configs for a Vercel Team
DESCRIPTION: This section shows how to retrieve a list of all Edge Configs associated with a specific Hobby team or team. It involves making a GET request to the Vercel API's `edge-config` endpoint, providing the `teamId` query parameter and an authorization token. The API returns an array of JSON objects, each representing an Edge Config with its metadata.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: cURL
CODE:
```
curl "https://api.vercel.com/v1/edge-config?teamId=your_team_id_here" \
     -H 'Authorization: Bearer your_vercel_api_token_here'
```

LANGUAGE: JavaScript
CODE:
```
try {
  const listItems = await fetch(
    'https://api.vercel.com/v1/edge-config?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
      },
    },
  );
  const result = await listItems.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

LANGUAGE: APIDOC
CODE:
```
Response Schema:
[
  {
    "slug": "example_config_1",
    "itemCount": 0,
    "createdAt": 1234567890123,
    "updatedAt": 1234567890123,
    "id": "your_edge_config_id_here",
    "digest": "abc123efg456hij789",
    "sizeInBytes": 2,
    "ownerId": "your_id_here"
  },
  {
    "slug": "example_config_2",
    "itemCount": 0,
    "createdAt": 0123456789012,
    "updatedAt": 0123456789012,
    "id": "your_edge_config_id_here",
    "digest": "123efg456hij789abc",
    "sizeInBytes": 2,
    "ownerId": "your_id_here"
  }
]
```

----------------------------------------

TITLE: Default HSTS Header for Custom Domains on Vercel
DESCRIPTION: This snippet illustrates the default `Strict-Transport-Security` header for custom domains on Vercel. It sets a `max-age` of two years, ensuring the browser remembers to connect via HTTPS for the specific domain.
SOURCE: https://vercel.com/docs/encryption

LANGUAGE: HTTP
CODE:
```
Strict-Transport-Security: max-age=63072000;
```

----------------------------------------

TITLE: Vercel Redirect: External site with 308 status
DESCRIPTION: Example `vercel.json` configuration to redirect requests from `/view-source` to an absolute external URL (`https://github.com/vercel/vercel`) with a default 308 redirect status.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/view-source",
      "destination": "https://github.com/vercel/vercel"
    }
  ]
}
```

----------------------------------------

TITLE: Access Vercel Project Production URL
DESCRIPTION: Retrieve a production domain name for the project. This is always set, even in preview deployments, and is useful for generating reliable links to production, such as OG-image URLs. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: dotenv
CODE:
```
NUXT_ENV_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Vercel Environment Variables for Shopify Integration
DESCRIPTION: This section outlines the essential environment variables required for deploying a Next.js Commerce application on Vercel, detailing their purpose and providing examples for connecting to Shopify and configuring site-specific settings.
SOURCE: https://vercel.com/docs/integrations/ecommerce/shopify

LANGUAGE: APIDOC
CODE:
```
COMPANY_NAME: (optional) Displayed in the footer next to the copyright in the event the company is different from the site name, for example `Acme, Inc.`
SHOPIFY_STORE_DOMAIN: Used to connect to your Shopify storefront, for example `[your-shopify-store-subdomain].myshopify.com`
SHOPIFY_STOREFRONT_ACCESS_TOKEN: Used to secure API requests between Shopify and your headless site, which was created when you [installed the Shopify Headless app](#install-the-shopify-headless-app)
SHOPIFY_REVALIDATION_SECRET: Used to secure data revalidation requests between Shopify and your headless site, which was created when you [created a secret for secure revalidation](#create-a-secret-for-secure-revalidation)
SITE_NAME: Displayed in the header and footer navigation next to the logo, for example `Acme Store`
TWITTER_CREATOR: Used in Twitter OG metadata, for example `@nextjs`
TWITTER_SITE: Used in Twitter OG metadata, for example `https://nextjs.org`
```

----------------------------------------

TITLE: Run Vercel Build Image Locally (Amazon Linux 2023)
DESCRIPTION: Use this Docker command to run a local instance of the Amazon Linux 2023 base image, mirroring Vercel's current build environment for testing purposes. The `--rm` flag removes the container upon exit, and `-it` provides an interactive terminal.
SOURCE: https://vercel.com/docs/builds/build-image/build-image

LANGUAGE: Bash
CODE:
```
docker run --rm -it amazonlinux:2023.2.20231011.0 sh
```

----------------------------------------

TITLE: Edge Function Fetch API Usage Limitations
DESCRIPTION: This section outlines specific operational constraints and behaviors when utilizing the `fetch` API within Vercel Edge Functions. These include restrictions on allowed port numbers, concurrency limits, and connection timeout mechanisms.
SOURCE: https://vercel.com/docs/functions/runtimes/edge/edge-functions

LANGUAGE: APIDOC
CODE:
```
Fetch API Limitations:
- Port Numbers: Only 80 and 443 are allowed in fetch URLs. Non-standard ports are ignored.
- Maximum Requests: 950 requests per Edge Function invocation.
- Maximum Open Connections: 6 simultaneous open connections per invocation. Additional requests are queued.
- Connection Timeout: In-flight requests may be canceled after 15 seconds of inactivity (LRU logic).
- Error Handling: 'Network connection lost.' exception may be thrown. Handle with try/catch or AbortController.
```

----------------------------------------

TITLE: Update Edge Config Items using Vercel REST API PATCH Request
DESCRIPTION: This section details how to modify or add items to your Vercel Edge Config via a PATCH request. It outlines the required URL structure, including Edge Config ID and optional team ID, and specifies the JSON request body format for 'create', 'update', 'upsert', and 'delete' operations. Examples are provided in cURL and JavaScript (fetch API), along with the expected error response structure.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: APIDOC
CODE:
```
Endpoint: PATCH https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items[?teamId=your_team_id_here]

Request Body Schema:
  items: array of objects
    - operation: string
      Description: The change you want to make to your Edge Config.
      Valid values: "create", "update", "upsert", "delete"
    - key: string
      Description: The name of the key you want to add to or update within your Edge Config.
      Constraints: Alphanumeric, "_", "-" only. Up to 256 characters.
    - value: any
      Description: The value you want to assign to the key.
      Valid types: Strings, JSON objects, null, Numbers, and arrays of the previous four types.
```

LANGUAGE: JSON
CODE:
```
{
  "items": [
    {
      "operation": "create",
      "key": "example_key_1",
      "value": "example_value_1"
    },
    {
      "operation": "update",
      "key": "example_key_2",
      "value": "new_value"
    }
  ]
}
```

LANGUAGE: cURL
CODE:
```
curl -X 'PATCH' 'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items' \
     -H 'Authorization: Bearer your_vercel_api_token_here' \
     -H 'Content-Type: application/json' \
     -d $' { "items": [ { "operation": "create", "key": "example_key_1", "value": "example_value_1" }, { "operation": "update", "key": "example_key_2", "value": "new_value" } ] }'
```

LANGUAGE: JavaScript
CODE:
```
try {
  const updateEdgeConfig = await fetch(
    'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'create',
            key: 'example_key_1',
            value: 'example_value_1'
          },
          {
            operation: 'update',
            key: 'example_key_2',
            value: 'new_value'
          }
        ]
      })
    }
  );
  const result = await updateEdgeConfig.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

LANGUAGE: JSON
CODE:
```
{
  "error": {
    "code": "forbidden",
    "message": "The request is missing an authentication token",
    "missingToken": true
  }
}
```

----------------------------------------

TITLE: Update a Project Domain using Vercel REST API
DESCRIPTION: This snippet refers to the Vercel REST API PATCH endpoint for programmatically updating a project domain's configuration. It serves as an alternative to the manual dashboard process for assigning a domain to a specific Git branch or environment, particularly useful for Pro and Enterprise teams managing custom environments.
SOURCE: https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch

LANGUAGE: APIDOC
CODE:
```
Vercel REST API Endpoint:
  Method: PATCH
  Endpoint: /v9/projects/{id}/domains/{domain}
  Purpose: Update a project domain's configuration, including assigning it to a specific Git branch or environment.
  Reference: /docs/rest-api/reference/endpoints/projects/update-a-project-domain
```

----------------------------------------

TITLE: Set Custom Endpoint for Vercel Analytics Data
DESCRIPTION: Demonstrates configuring a custom `endpoint` for Vercel Analytics. This is useful for directing collected analytics data to a URL different from the default, especially when deploying multiple projects under the same domain to maintain isolation.
SOURCE: https://vercel.com/docs/analytics/package

LANGUAGE: TypeScript
CODE:
```
<Analytics endpoint="https://bob-app.vercel.sh/_vercel/insights" />
```

----------------------------------------

TITLE: VERCEL_URL Environment Variable
DESCRIPTION: The domain name of the generated deployment URL. Example: `*.vercel.app`. The value does not include the protocol scheme `https://`. Available at both build and runtime.
SOURCE: https://vercel.com/docs/environment-variables/system-environment-variables

LANGUAGE: Shell
CODE:
```
VERCEL_URL=my-site.vercel.app
```

----------------------------------------

TITLE: Next.js Local Image Cache Key and Invalidation Reference
DESCRIPTION: This API documentation details the components of the cache key for Next.js local images, including Project ID, query parameters (`q`, `w`, `url` with content hash), and the normalized `Accept` HTTP header. It also outlines the cache invalidation mechanism, which requires replacing the image content and redeploying, and specifies the cache expiration period of 31 days on the Vercel Edge Network.
SOURCE: https://vercel.com/docs/image-optimization

LANGUAGE: APIDOC
CODE:
```
Cache Key:
  Project ID
  Query string parameters:
    q: The quality of the optimized image, between 1 (lowest quality) and 100 (highest quality).
    w: The width (in pixels) of the optimized image.
    url: The URL of the optimized image is keyed by content hash e.g. /assets/me.png is converted to 3399d02f49253deb9f5b5d1159292099.
  Accept HTTP header (normalized).
Local image cache invalidation:
  Redeploying your app doesn't invalidate the image cache.
  To invalidate, replace the image of the same name with different content, then redeploy.
Local image cache expiration:
  Cached for up to 31 days on the Vercel Edge Network.
```

----------------------------------------

TITLE: Configure Cron Jobs in Vercel.json
DESCRIPTION: The `crons` property configures cron jobs for a project's production deployment. Each cron object requires a `path` to invoke and a `schedule` using a cron expression. There are string length limits for both `path` (512) and `schedule` (256).
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
crons:
  Type: Array of cron Object
  Limits:
    - A maximum of string length of 512 for the path value.
    - A maximum of string length of 256 for the schedule value.
  Cron object definition:
    path: Required - The path to invoke when the cron job is triggered. Must start with /.
    schedule: Required - The cron schedule expression to use for the cron job.
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/every-minute",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/every-hour",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/every-day",
      "schedule": "0 0 * * *"
    }
  ]
}
```

----------------------------------------

TITLE: Set Vary Header in Next.js next.config.js
DESCRIPTION: Illustrates how to configure `Vary` and `Cache-Control` headers for API routes within a Next.js application using the `headers` async function in `next.config.js`. This provides programmatic control over headers for Next.js projects.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JavaScript
CODE:
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/data',
        headers: [
          {
            key: 'Vary',
            value: 'X-Vercel-IP-Country',
          },
          {
            key: 'Cache-Control',
            value: 's-maxage=3600',
          },
        ],
      },
    ];
  },
};
 
module.exports = nextConfig;
```

----------------------------------------

TITLE: Example Vercel Configuration for Serverless Function Regions
DESCRIPTION: This JSON snippet demonstrates how to specify the deployment regions for Serverless Functions within the `vercel.json` configuration file, setting 'sfo1' as the desired region.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sfo1"]
}
```

----------------------------------------

TITLE: Configure Vercel Function Regions in vercel.json
DESCRIPTION: This snippet demonstrates how to specify the execution region(s) for Vercel Functions within the `vercel.json` configuration file. It uses the `regions` key to define one or more desired regions, such as 'sfo1'. Pro and Enterprise users can specify multiple regions for multi-region deployments, and Enterprise users can also define failover regions.
SOURCE: https://vercel.com/docs/functions/configuring-functions/region

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sfo1"]
}
```

----------------------------------------

TITLE: AbortController API
DESCRIPTION: Allows you to abort one or more DOM requests as and when desired, providing control over ongoing operations.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
API: AbortController
Description: Allows you to abort one or more DOM requests as and when desired
```

----------------------------------------

TITLE: Configure Max Duration for Specific Functions via vercel.json
DESCRIPTION: Define `maxDuration` for individual functions or groups using glob patterns in `vercel.json`. This method applies to older Next.js versions, Go, Python, Ruby, and other frameworks, offering granular control over function timeouts and resource usage.
SOURCE: https://vercel.com/docs/functions/configuring-functions/duration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "maxDuration": 30 // This function can run for a maximum of 30 seconds
    },
    "api/*.js": {
      "maxDuration": 15 // This function can run for a maximum of 15 seconds
    },
    "src/api/*.js": {
      "maxDuration": 25 // You must prefix functions in the src directory with /src/
    }
  }
}
```

----------------------------------------

TITLE: Configure WAF to Log Suspicious Traffic from Specific Countries (JSON)
DESCRIPTION: This custom WAF rule logs traffic originating from a specific country, such as Ireland (IE). It's useful for monitoring unusual traffic spikes or potential threats from particular geographical regions. The rule is active and logs any matching requests.
SOURCE: https://vercel.com/docs/vercel-firewall/vercel-waf/examples

LANGUAGE: JSON
CODE:
```
{
  "name": "Log Ireland Traffic",
  "active": true,
  "description": "Understand Ireland traffic spike",
  "action": {
    "mitigate": {
      "redirect": null,
      "action": "log",
      "rateLimit": null,
      "actionDuration": null
    }
  },
  "id": "",
  "conditionGroup": [
    {
      "conditions": [
        {
          "op": "eq",
          "type": "geo_country",
          "value": "IE"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Verify _acme-challenge TXT Records using dig
DESCRIPTION: Use the `dig` command to check for existing `_acme-challenge` TXT records on your apex or subdomains. This helps in verifying domain ownership for Let's Encrypt's DNS-01 challenge. If a record resolves, it might need removal if the domain was previously hosted elsewhere to prevent certificate provisioning issues.
SOURCE: https://vercel.com/docs/domains/troubleshooting

LANGUAGE: shell
CODE:
```
dig -t TXT _acme-challenge.example.com
```

LANGUAGE: shell
CODE:
```
dig -t TXT _acme-challenge.subdomain.example.com
```

----------------------------------------

TITLE: Implement Home Component for SSR Route
DESCRIPTION: This code defines the Home component and its metadata, which is rendered server-side for the example route.
SOURCE: https://vercel.com/docs/frameworks/react-router

LANGUAGE: TypeScript
CODE:
```
import type { Route } from './+types/home';
import { Welcome } from '../welcome/welcome';
 
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}
 
export default function Home() {
  return <Welcome />;
}
```

----------------------------------------

TITLE: VITE_VERCEL_ENV Environment Variable
DESCRIPTION: Specifies the environment where the Vercel application is deployed and running. Possible values include `production`, `preview`, or `development`.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Environment Variables
CODE:
```
VITE_VERCEL_ENV=production
```

----------------------------------------

TITLE: JavaScript Client Initialization with Vercel Secret Handling
DESCRIPTION: Illustrates how to initialize an SDK client for a Vercel marketplace product, demonstrating the use of `{{YOUR_SECRET}}` or `{{process.env.YOUR_SECRET}}` placeholders for secure secret injection within the Vercel dashboard's quickstart snippets.
SOURCE: https://vercel.com/docs/integrations/create-integration/submit-integration

LANGUAGE: JavaScript
CODE:
```
import { createClient } from 'acme-sdk';
 
const client = createClient('https://your-project.acme.com', '{{YOUR_SECRET}}');
```

----------------------------------------

TITLE: Opt Out of Prerendering for Astro Server-Side Rendered Routes
DESCRIPTION: This snippet shows how to mark an individual Astro component or route to be server-rendered by setting `export const prerender = false;` in its frontmatter. This ensures the page is dynamically generated at runtime rather than pre-built during the static rendering process.
SOURCE: https://vercel.com/docs/frameworks/astro

LANGUAGE: Astro
CODE:
```
---
export const prerender = false;
// ...
---
<html>
  <!-- Server-rendered page here... -->
</html>
```

----------------------------------------

TITLE: Create a Vue Template for Nuxt Open Graph Images
DESCRIPTION: This code defines a Vue component that serves as a template for generating dynamic Open Graph social card images using `nuxt-og-image`. It accepts a `title` prop and renders it within a styled div, suitable for social media previews.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: Vue
CODE:
```
<script setup lang="ts">
  withDefaults(defineProps<{
    title?: string
  }>(), {
    title: 'title'
  })
</script>
<template>
  <div class="h-full w-full flex items-start justify-start border-solid border-blue-500 border-[12px] bg-gray-50">
    <div class="flex items-start justify-start h-full">
      <div class="flex flex-col justify-between w-full h-full">
        <h1 class="text-[80px] p-20 font-black text-left">
          {{ title }}
        </h1>
        <p class="text-2xl pb-10 px-20 font-bold mb-0">
          acme.com
        </p>
      </div>
    </div>
  </div>
</template>
```

----------------------------------------

TITLE: Vercel Query Metrics Reference
DESCRIPTION: Details for each query metric available in Vercel, including its description and supported aggregation methods. These metrics allow users to analyze various aspects of their application's performance and resource usage on the Vercel platform.
SOURCE: https://vercel.com/docs/observability/query/query-reference

LANGUAGE: APIDOC
CODE:
```
Edge Requests:
  Description: The number of Edge Requests
  Aggregations: Count, Count per Second, Percentages
```

LANGUAGE: APIDOC
CODE:
```
Duration:
  Description: The time spent serving a request, as measured by Vercel's Edge Network
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Incoming Fast Data Transfer:
  Description: The incoming amount of Fast Data Transfer used by the request.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Outgoing Fast Data Transfer:
  Description: The outgoing amount of Fast Data Transfer used by the response.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Total Fast Data Transfer:
  Description: The total amount of Fast Data Transfer used by the response.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Function Invocations:
  Description: The number of Function invocations
  Aggregations: Count, Count per Second, Percentages
```

LANGUAGE: APIDOC
CODE:
```
Function Duration:
  Description: The amount of Function duration, as measured in GB-hours.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Function CPU Time:
  Description: The amount of CPU time a Vercel Function has spent responding to requests, as measured in milliseconds.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Incoming Fast Origin Transfer:
  Description: The amount of Fast Origin Transfer used by the request.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Outgoing Fast Origin Transfer:
  Description: The amount of Fast Origin Transfer used by the response.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Provisioned Memory:
  Description: The amount of memory provisioned to a Serverless Function.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Peak Memory:
  Description: The maximum amount of memory used by Serverless Function at any point in time.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Edge Function Execution Units:
  Description: The number of execution units that your Edge Functions have used. An execution unit is 50 ms of CPU time.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Requests Blocked:
  Description: All requests blocked by either the system or user.
  Aggregations: Count, Count per Second, Percentages
```

LANGUAGE: APIDOC
CODE:
```
ISR Read Units:
  Description: The amount of Read Units used to access ISR data
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
ISR Write Units:
  Description: The amount of Write Units used to store new ISR data
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
ISR Read/Write:
  Description: The amount of ISR operations
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Time to First Byte:
  Description: The time between the request for a resource and when the first byte of a response begins to arrive.
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Function Wall Time:
  Description: The duration that a Vercel Function has run
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Firewall Actions:
  Description: The incoming web traffic observed by firewall rules.
  Aggregations: Sum, Sum per Second, Unique, Percentages,
```

LANGUAGE: APIDOC
CODE:
```
Optimizations:
  Description: The number of image transformations
  Aggregations: Sum, Sum per Second, Unique, Percentages,
```

LANGUAGE: APIDOC
CODE:
```
Source Size:
  Description: The source size of image optimizations
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Optimized Size:
  Description: The optimized size of image optimizations
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Compression Ratio:
  Description: The compression ratio of image optimizations
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

LANGUAGE: APIDOC
CODE:
```
Size Change:
  Description: The size change of image optimizations
  Aggregations: Sum, Sum per Second, Min/Max, Percentages, Percentiles
```

----------------------------------------

TITLE: Pulling from a Custom Environment
DESCRIPTION: Utilizes the `--environment` option to specify and pull environment variables from a custom-defined environment, such as 'staging'.
SOURCE: https://vercel.com/docs/cli/pull

LANGUAGE: Shell
CODE:
```
vercel pull --environment=staging
```

----------------------------------------

TITLE: REACT_APP_VERCEL_TARGET_ENV: Vercel Deployment Environment
DESCRIPTION: Defines the environment where the Vercel app is deployed and running. Possible values include `production`, `preview`, `development`, or a custom environment name. This variable helps applications adapt behavior based on the deployment stage.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: dotenv
CODE:
```
REACT_APP_VERCEL_TARGET_ENV=production
```

----------------------------------------

TITLE: Install AI SDK React Package for useChat
DESCRIPTION: Installs the `@ai-sdk/react` package, which provides essential React hooks like `useChat` for building conversational AI interfaces in Next.js and other React frameworks, simplifying client-side integration.
SOURCE: https://vercel.com/docs/ai/xai

LANGUAGE: pnpm
CODE:
```
pnpm i @ai-sdk/react
```

----------------------------------------

TITLE: Add Vercel Adapter to SvelteKit Configuration (Default)
DESCRIPTION: This JavaScript snippet demonstrates how to import and add the Vercel adapter to your `svelte.config.js` file. This configuration uses the default Node.js runtime, which runs on Vercel Serverless Functions.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: javascript
CODE:
```
import adapter from '@sveltejs/adapter-vercel';
 
export default {
  kit: {
    adapter: adapter(),
  },
};
```

----------------------------------------

TITLE: Get Request Geolocation Details with geolocation
DESCRIPTION: Describes the `geolocation()` method from `@vercel/functions`, which returns detailed location information (city, country, coordinates, etc.) for the incoming request based on its IP address.
SOURCE: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package

LANGUAGE: APIDOC
CODE:
```
geolocation(request: Request): object
  request: The incoming request object which provides the IP
Returns object with properties:
  city: string (e.g., "New York")
  country: string (e.g., "US")
  flag: string (e.g., "🇺🇸")
  countryRegion: string (e.g., "NY")
  region: string (e.g., "iad1")
  latitude: string (e.g., "40.7128")
  longitude: string (e.g., "-74.0060")
  postalCode: string (e.g., "10001")
```

LANGUAGE: TypeScript
CODE:
```
import { geolocation } from '@vercel/functions';
 
export function GET(request) {
  const details = geolocation(request);
  return Response.json(details);
}
```

----------------------------------------

TITLE: Vercel Redirect: Temporary 307 to profile.html
DESCRIPTION: Example `vercel.json` configuration to redirect requests from `/me` to `/profile.html` using a 307 Temporary Redirect (`permanent: false`).
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/me", "destination": "/profile.html", "permanent": false }
  ]
}
```

----------------------------------------

TITLE: Edge Middleware `config` Object Properties Reference
DESCRIPTION: This section provides a reference for the properties available within the Edge Middleware `config` object, detailing their types and descriptions for proper configuration.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: APIDOC
CODE:
```
Property: matcher
  Type: string / string[]
  Description: A string or array of strings that define the paths the Middleware should be run on
```

----------------------------------------

TITLE: Set Preferred Regions for Next.js Edge Function
DESCRIPTION: This example illustrates how to specify one or more preferred regions for an Edge Function's execution in a Next.js environment. It uses `export const preferredRegion` to define desired locations and `export const dynamic = 'force-dynamic'` to disable caching, also showing how to access the current execution region.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: JavaScript
CODE:
```
export const runtime = 'edge'; // 'nodejs' is the default
// execute this function on iad1 or hnd1, based on the connecting client location
export const preferredRegion = ['iad1', 'hnd1'];
export const dynamic = 'force-dynamic'; // no caching
 
export function GET(request: Request) {
  return new Response(
    `I am an Edge Function! (executed on ${process.env.VERCEL_REGION})`,
    {
      status: 200,
    },
  );
}
```

----------------------------------------

TITLE: Vercel Blob put() Method API Reference
DESCRIPTION: Detailed API documentation for the `put` method, outlining its signature, required parameters (`pathname`, `body`, `options`), and the various properties available within the `options` object, such as `access`, `addRandomSuffix`, `multipart`, and `onUploadProgress`.
SOURCE: https://vercel.com/docs/vercel-blob/using-blob-sdk

LANGUAGE: APIDOC
CODE:
```
put(pathname, body, options):
  pathname: (Required) A string specifying the base value of the return URL
  body: (Required) A blob object as ReadableStream, String, ArrayBuffer or Blob based on these supported body types
  options: (Required) A JSON object with the following required and optional parameters:
    access: (Required) Values: public
    addRandomSuffix: (Optional) A boolean specifying whether to add a random suffix to the pathname. It defaults to false. We recommend using this option to ensure there are no conflicts in your blob filenames.
    allowOverwrite: (Optional) A boolean to allow overwriting blobs. By default an error will be thrown if you try to overwrite a blob by using the same pathname for multiple blobs.
    cacheControlMaxAge: (Optional) A number in seconds to configure how long Blobs are cached. Defaults to one month. Cannot be set to a value lower than 1 minute. See the caching documentation for more details.
    contentType: (Optional) A string indicating the media type. By default, it's extracted from the pathname's extension.
    token: (Optional) A string specifying the token to use when making requests. It defaults to process.env.BLOB_READ_WRITE_TOKEN when deployed on Vercel as explained in Read-write token. You can also pass a client token created with the generateClientTokenFromReadWriteToken method
    multipart: (Optional) Pass multipart: true when uploading large files. It will split the file into multiple parts, upload them in parallel and retry failed parts.
    abortSignal: (Optional) An AbortSignal to cancel the operation
    onUploadProgress: (Optional) Callback to track upload progress: onUploadProgress({loaded: number, total: number, percentage: number})
```

----------------------------------------

TITLE: Retrieve Vercel OIDC Token with `@vercel/functions`
DESCRIPTION: This snippet demonstrates how to retrieve an OIDC token from a Vercel environment using the `getVercelOidcToken` function from the `@vercel/functions` package. The retrieved token can then be used to authenticate requests to external APIs, simplifying secure API calls from Vercel deployments.
SOURCE: https://vercel.com/docs/oidc/api

LANGUAGE: pnpm
CODE:
```
pnpm i @vercel/functions
```

LANGUAGE: JavaScript
CODE:
```
import { getVercelOidcToken } from '@vercel/functions/oidc';
 
export const GET = async () => {
  const result = await fetch('https://api.example.com', {
    headers: {
      Authorization: `Bearer ${await getVercelOidcToken()}`,
    },
  });
 
  return Response.json(await result.json());
};
```

----------------------------------------

TITLE: Install Latest Next.js
DESCRIPTION: Ensures the application is using the most recent version of Next.js, a prerequisite for creating Edge Middleware.
SOURCE: https://vercel.com/docs/edge-middleware/quickstart

LANGUAGE: pnpm
CODE:
```
pnpm i next
```

----------------------------------------

TITLE: Sort Vercel Blobs by Creation Date Using Pathname Timestamps
DESCRIPTION: This snippet demonstrates how to upload a file to Vercel Blob with a timestamp embedded in its pathname. By prefixing the filename with a `YYYY-MM-DD` formatted date, blobs can be effectively sorted by their creation date when retrieved using `list()`, as `list()` returns results in lexicographical order. This approach helps overcome the default lexicographical sorting of `list()` which treats numbers as characters.
SOURCE: https://vercel.com/docs/vercel-blob

LANGUAGE: JavaScript
CODE:
```
const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
await put(`reports/${timestamp}-quarterly-report.pdf`, file, {
  access: 'public',
});
```

----------------------------------------

TITLE: Deploy Project to Vercel Custom Environment
DESCRIPTION: Deploys the current project to a specified custom environment on Vercel, such as 'staging'. This command is used to target specific deployment environments.
SOURCE: https://vercel.com/docs/deployments/environments

LANGUAGE: shell
CODE:
```
vercel deploy --target=staging
```

----------------------------------------

TITLE: Edge Function API Restrictions: Unsupported JavaScript APIs
DESCRIPTION: This section details JavaScript APIs that are not supported within Vercel Edge Functions due to security or runtime limitations. Using these APIs will result in runtime errors. It's crucial to ensure that any libraries used do not rely on these APIs.
SOURCE: https://vercel.com/docs/functions/runtimes/edge/edge-functions

LANGUAGE: APIDOC
CODE:
```
Unsupported APIs:
- eval: Evaluates JavaScript code represented as a string
- new Function(evalString): Creates a new function with the code provided as an argument
- WebAssembly.instantiate: Compiles and instantiates a WebAssembly module from a buffer source
```

----------------------------------------

TITLE: API Reference: `request.ip` Helper Object
DESCRIPTION: Documentation for the `ip` object, which returns the IP address of the request from the headers, or `undefined` if not available. This helper is exclusive to Vercel deployments.
SOURCE: https://vercel.com/docs/edge-middleware/middleware-api

LANGUAGE: APIDOC
CODE:
```
request.ip: string | undefined
  Description: Returns the IP address of the request from the headers, or undefined.
```

----------------------------------------

TITLE: Basic Remix Route for Serverless Vercel Function
DESCRIPTION: This example demonstrates a simple Remix API route that is deployed as a Vercel Function. It renders a basic HTML heading, showcasing how Remix routes are automatically handled as serverless functions on Vercel.
SOURCE: https://vercel.com/docs/frameworks/remix

LANGUAGE: JavaScript
CODE:
```
export default function Serverless() {
  return <h1>Welcome to Remix with Vercel</h1>;
}
```

----------------------------------------

TITLE: Structured Tool Call Response from LLM
DESCRIPTION: When an LLM decides to utilize a defined tool, it returns a structured JSON object. This object specifies the `tool` name to be invoked and the `arguments` inferred from the conversation context, which are then passed to the tool's execution function.
SOURCE: https://vercel.com/docs/agents

LANGUAGE: JSON
CODE:
```
{
  "tool": "weather",
  "arguments": { "location": "San Francisco" }
}
```

----------------------------------------

TITLE: Configure Astro to Deploy Middleware at the Edge
DESCRIPTION: To deploy Astro's middleware at the Edge and gain access to `RequestContext` and `Request` objects, set `edgeMiddleware: true` within the Vercel adapter configuration in `astro.config.ts`. This enables the use of Vercel's Edge Middleware helpers.
SOURCE: https://vercel.com/docs/frameworks/astro

LANGUAGE: TypeScript
CODE:
```
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
 
export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true,
  }),
});
```

----------------------------------------

TITLE: Building Vercel Project Locally for Inspection
DESCRIPTION: Builds the Vercel project locally, producing output in the `.vercel/output` directory according to the Build Output API format. This is useful for debugging and inspecting build artifacts before deployment.
SOURCE: https://vercel.com/docs/cli/deploying-from-cli

LANGUAGE: Shell
CODE:
```
vercel build
```

----------------------------------------

TITLE: Read Relative Files in Python Functions from Project Root
DESCRIPTION: This Python function demonstrates how to read a file (`data/file.txt`) located relative to the project's base directory. It uses `os.path.join` to construct the correct path, assuming the function is in `api/user.py` and the data file is in `data/`.
SOURCE: https://vercel.com/docs/functions/runtimes/python

LANGUAGE: Python
CODE:
```
from http.server import BaseHTTPRequestHandler
from os.path import join
 
class handler(BaseHTTPRequestHandler):
 
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        with open(join('data', 'file.txt'), 'r') as file:
          for line in file:
            self.wfile.write(line.encode())
        return
```

----------------------------------------

TITLE: Vercel Redirect: Conditional based on x-vercel-ip-country header
DESCRIPTION: Example `vercel.json` configuration for a conditional redirect. It redirects requests from any path not starting with `/uk/` to the corresponding `/uk/` path, specifically when the `x-vercel-ip-country` header value is `GB`, using a 307 Temporary Redirect.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/:path((?!uk/).*)",
      "has": [
        {
          "type": "header",
          "key": "x-vercel-ip-country",
          "value": "GB"
        }
      ],
      "destination": "/uk/:path*",
      "permanent": false
    }
  ]
}
```

----------------------------------------

TITLE: Vercel Webhook Event: deployment.canceled Payload
DESCRIPTION: Details the specific payload structure for the `deployment.canceled` event, which occurs when a Vercel deployment is canceled. This payload provides comprehensive information about the associated team, user, deployment, project, and relevant dashboard links.
SOURCE: https://vercel.com/docs/webhooks/webhooks-api

LANGUAGE: APIDOC
CODE:
```
deployment.canceled Payload:
  payload:
    team:
      id: ID - The ID of the event's team (possibly null).
    user:
      id: ID - The ID of the event's user.
    deployment:
      id: ID - The ID of the deployment.
      meta: Map - A Map of deployment metadata.
      url: String - The URL of the deployment.
      name: String - The project name used in the deployment URL.
    links:
      deployment: String - The URL on the Vercel Dashboard to inspect the deployment.
      project: String - The URL on the Vercel Dashboard to the project.
    target: String - A String that indicates the target. Possible values are `production`, `staging` or `null`.
    project:
      id: ID - The ID of the project.
    plan: String - The plan type of the deployment.
    regions: List - An array of the supported regions for the deployment.
```

----------------------------------------

TITLE: Install Vercel CLI Globally
DESCRIPTION: This command installs or updates the Vercel CLI to its latest version globally using pnpm. Having the latest CLI is a prerequisite for interacting with Vercel projects and integrations.
SOURCE: https://vercel.com/docs/edge-config/edge-config-integrations/devcycle-edge-config

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Install Vercel CLI globally using pnpm
DESCRIPTION: To enable pulling environment variables from DatoCMS into your Vercel project, install the Vercel CLI globally. This command uses pnpm to install the latest version of the Vercel CLI.
SOURCE: https://vercel.com/docs/integrations/cms/dato-cms

LANGUAGE: pnpm
CODE:
```
pnpm i -g vercel@latest
```

----------------------------------------

TITLE: Access Vercel Project Production URL Environment Variable
DESCRIPTION: This environment variable provides a production domain name for the project, prioritizing custom domains or a `vercel.app` domain. It's always set, even in preview deployments, and is useful for generating production-pointing links. The value does not include the `https://` protocol scheme.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: plaintext
CODE:
```
PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

----------------------------------------

TITLE: Implement Skew Protection using `__vdpl` cookie
DESCRIPTION: This snippet illustrates how to set the `__vdpl` cookie with the `VERCEL_DEPLOYMENT_ID` on the server-side. This approach ensures that subsequent requests from the client include the deployment ID, enabling Skew Protection for frameworks without native support.
SOURCE: https://vercel.com/docs/skew-protection

LANGUAGE: JavaScript
CODE:
```
export default function handler(req, res) {
  if (process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1') {
    res.setHeader('Set-Cookie', [
      `__vdpl=${process.env.VERCEL_DEPLOYMENT_ID}; HttpOnly`,
    ]);
  }
  res.end('<h1>Hello World</h1>');
}
```

----------------------------------------

TITLE: Pull Vercel Environment Variables
DESCRIPTION: Use the Vercel CLI to pull environment variables from your Vercel project into your local development environment, ensuring your application has access to necessary configurations like API tokens.
SOURCE: https://vercel.com/docs/ai/replicate

LANGUAGE: Shell
CODE:
```
vercel env pull
```

----------------------------------------

TITLE: Update an existing Vercel deployment check
DESCRIPTION: Allows the integration to update existing checks with a new status or conclusion. This endpoint sets the status to “completed”. The value for the conclusion can be "canceled", "failed", "neutral", "succeeded", or "skipped".
SOURCE: https://vercel.com/docs/checks/checks-api

LANGUAGE: APIDOC
CODE:
```
Action: Read/Write
Method: PATCH
Endpoint: /v1/deployments/{deploymentId}/checks/{checkId}
```

----------------------------------------

TITLE: Compatible Node.js Modules for Edge Runtime
DESCRIPTION: This section lists Node.js modules that are compatible with the Vercel Edge runtime, detailing their purpose and specific support levels. These modules can be imported with or without the `node:` prefix.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
async_hooks:
  Description: Manage asynchronous resources lifecycles with AsyncLocalStorage. Supports the WinterCG subset of APIs
events:
  Description: Facilitate event-driven programming with custom event emitters and listeners. This API is fully supported
buffer:
  Description: Efficiently manipulate binary data using fixed-size, raw memory allocations with Buffer. Every primitive compatible with Uint8Array accepts Buffer too
assert:
  Description: Provide a set of assertion functions for verifying invariants in your code
util:
  Description: Offer various utility functions where we include promisify/callbackify and types
```

----------------------------------------

TITLE: Configure Incremental Static Regeneration (ISR) in SvelteKit
DESCRIPTION: This example demonstrates how to enable Incremental Static Regeneration (ISR) in a SvelteKit route. It exports a 'config' object with an 'isr' property, specifying an 'expiration' of 60 seconds for revalidation and a 'bypassToken' for on-demand revalidation via the 'x-prerender-revalidate' header.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: JavaScript
CODE:
```
export const config = {
  isr: {
    expiration: 60,
    bypassToken: 'REPLACE_ME_WITH_SECRET_VALUE',
  },
};
```

----------------------------------------

TITLE: Generate OG Image with Dynamic External Image in Next.js
DESCRIPTION: This example shows how to create an Open Graph image API route that fetches and displays an external image (e.g., a GitHub profile picture) based on a `username` query parameter. It uses `@vercel/og` to render the image and text, providing a fallback message if the username is missing.
SOURCE: https://vercel.com/docs/og-image-generation/examples

LANGUAGE: TypeScript
CODE:
```
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return new ImageResponse(<>Visit with &quot;?username=vercel&quot;</>, {
      width: 1200,
      height: 630,
    });
  }
 
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'black',
          background: '#f6f6f6',
          width: '100%',
          height: '100%',
          paddingTop: 50,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          width="256"
          height="256"
          src={`https://github.com/${username}.png`}
          style={{
            borderRadius: 128,
          }}
        />
        <p>github.com/{username}</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
```

----------------------------------------

TITLE: Create an Edge Config using Vercel REST API
DESCRIPTION: This snippet demonstrates how to create a new Edge Config by making a POST request to the Vercel REST API. The request body requires a 'slug' for the Edge Config's name. It also shows how to scope the creation to a specific Vercel Team using the 'teamId' query parameter.
SOURCE: https://vercel.com/docs/edge-config/vercel-api

LANGUAGE: cURL
CODE:
```
curl  -X 'POST' 'https://api.vercel.com/v1/edge-config' \
      -H 'Authorization: Bearer your_vercel_api_token_here' \
      -H 'Content-Type: application/json; charset=utf-8' \
      -d '$'{ "slug": "your_edge_config_name_here" }'
```

LANGUAGE: JavaScript
CODE:
```
try {
  const createEdgeConfig = await fetch(
    'https://api.vercel.com/v1/edge-config',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'your_edge_config_name_here',
      }),
    },
  );
  const result = await createEdgeConfig.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

----------------------------------------

TITLE: Add Security Headers with Vercel Edge Middleware
DESCRIPTION: This TypeScript example shows how to implement Vercel Edge Middleware to add security headers to responses. The `config.matcher` property scopes the middleware to only run on the `/example` route, enhancing security for specific paths in a Gatsby application.
SOURCE: https://vercel.com/docs/frameworks/gatsby

LANGUAGE: TypeScript
CODE:
```
import { next } from '@vercel/edge';
 
export const config = {
  // Only run the middleware on the example route
  matcher: '/example',
};
 
export default function middleware(request: Request): Response {
  return next({
    headers: {
      'Referrer-Policy': 'origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'on',
      'Strict-Transport-Security':
        'max-age=31536000; includeSubDomains; preload',
    },
  });
}
```

----------------------------------------

TITLE: SANITY_STUDIO_VERCEL_ENV Environment Variable
DESCRIPTION: This variable indicates the Vercel environment (`production`, `preview`, or `development`) on which the application is currently deployed and running. It's crucial for conditional logic based on the deployment stage.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Shell
CODE:
```
SANITY_STUDIO_VERCEL_ENV=production
```

----------------------------------------

TITLE: Display Images from Vercel Blob using Next.js Image Component
DESCRIPTION: Fetches a list of blobs from Vercel Blob using `list` and renders them as `next/image` components, optimizing image loading with `priority`.
SOURCE: https://vercel.com/docs/vercel-blob/server-upload

LANGUAGE: typescript
CODE:
```
import { list } from '@vercel/blob';
import Image from 'next/image';
 
export async function Images() {
  const { blobs } = await list();
 
  return (
    <section>
      {blobs.map((image, i) => (
        <Image
          priority={i < 2}
          key={image.pathname}
          src={image.url}
          alt="My Image"
          width={200}
          height={200}
        />
      ))}
    </section>
  );
}
```

----------------------------------------

TITLE: Specify Multiple Vary Headers in Node.js
DESCRIPTION: Example of setting multiple `Vary` header values by separating them with commas using `res.setHeader`. This allows for creating separate cache entries based on multiple request attributes, such as country and language preference.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JavaScript
CODE:
```
res.setHeader('Vary', 'X-Vercel-IP-Country, Accept-Language');
```

----------------------------------------

TITLE: Define Custom Vercel Build Script in package.json
DESCRIPTION: To include a custom build step for your Node.js Serverless Function, add a `vercel-build` script to your `package.json` file. This script will be executed during the build process, allowing you to generate assets or perform pre-processing.
SOURCE: https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration

LANGUAGE: JSON
CODE:
```
{
  "scripts": {
    "vercel-build": "node ./build.js"
  }
}
```

----------------------------------------

TITLE: Install AI SDK for Vercel v0 API
DESCRIPTION: This command installs the necessary packages for integrating with the Vercel v0 API using the AI SDK, including the core AI SDK and the Vercel provider.
SOURCE: https://vercel.com/docs/v0/api

LANGUAGE: Shell
CODE:
```
npm install ai @ai-sdk/vercel
```

----------------------------------------

TITLE: Accessing Vercel Target Environment in Next.js
DESCRIPTION: This environment variable specifies the system or custom environment (production, preview, development, or custom name) where the Next.js application is deployed. It provides granular control over environment-specific configurations.
SOURCE: https://vercel.com/docs/environment-variables/framework-environment-variables

LANGUAGE: Plaintext
CODE:
```
NEXT_PUBLIC_VERCEL_TARGET_ENV=production
```

----------------------------------------

TITLE: Configure Route Cache-Control Headers in next.config.js
DESCRIPTION: Shows the recommended method for Next.js applications to add `Cache-Control` headers to a route (`/about`) using the `async headers()` function in `next.config.js`, allowing fine-grained caching control.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JavaScript
CODE:
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/about',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=1, stale-while-revalidate=59'
          }
        ]
      }
    ];
  }
};
 
module.exports = nextConfig;
```

----------------------------------------

TITLE: Configure Vercel Serverless Functions with `functions` property
DESCRIPTION: This configuration example demonstrates how to set memory and maximum duration for specific Serverless Functions or a group of functions using glob patterns within the `functions` property in `vercel.json`.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "memory": 3009,
      "maxDuration": 30
    },
    "api/*.js": {
      "memory": 3009,
      "maxDuration": 30
    }
  }
}
```

----------------------------------------

TITLE: Define an Example Feature Flag in Next.js
DESCRIPTION: Defines a basic feature flag using the 'flags/next' SDK, specifying its unique key, a descriptive text, and a 'decide' function to determine its value.
SOURCE: https://vercel.com/docs/feature-flags/flags-explorer/getting-started

LANGUAGE: TypeScript
CODE:
```
import { flag } from 'flags/next';
 
export const exampleFlag = flag({
  key: 'example-flag',
  description: 'An example feature flag',
  decide() {
    return false;
  }
});
```

----------------------------------------

TITLE: Vercel `trailingSlash` Configuration Property API
DESCRIPTION: Defines the `trailingSlash` property in `vercel.json` which controls URL redirection behavior for paths ending or not ending with a forward slash. Type is `Boolean` with a default value of `undefined`. When `undefined`, visiting a path with or without a trailing slash will not redirect, which is not recommended because it could lead to search engines indexing two different pages with duplicate content.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Property: trailingSlash
  Type: Boolean
  Default Value: undefined
```

----------------------------------------

TITLE: Writing Data to Vercel KV with Nitro Storage API
DESCRIPTION: This example shows how to write and read data using the configured Vercel KV storage via Nitro's `useStorage` API. The event handler sets an item 'hello' with value 'world' and then retrieves it, demonstrating basic write and read operations.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
export default defineEventHandler(async (event) => {
  const dataStorage = useStorage('data');
  await dataStorage.setItem('hello', 'world');
  return {
    hello: await dataStorage.getItem('hello'),
  };
});
```

----------------------------------------

TITLE: Reading Server Assets with Nitro Storage API
DESCRIPTION: This snippet demonstrates how to read server assets, such as a `users.json` file, using Nitro's `useStorage` API with the 'assets:server' driver. It defines an event handler that retrieves and returns the content of the specified asset.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: JavaScript
CODE:
```
export default defineEventHandler(async () => {
  // https://nitro.unjs.io/guide/assets#server-assets
  const assets = useStorage('assets:server');
  const users = await assets.getItem('users.json');
  return {
    users,
  };
});
```

----------------------------------------

TITLE: Configure Route Cache-Control Headers in vercel.json
DESCRIPTION: Illustrates how to define `Cache-Control` headers for a specific route (`/about.js`) within a `vercel.json` file, enabling edge caching for static or dynamic content served from that path.
SOURCE: https://vercel.com/docs/edge-cache

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/about.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=1, stale-while-revalidate=59"
        }
      ]
    }
  ]
}
```

----------------------------------------

TITLE: Querying Edge Config Endpoint Routes and Authentication
DESCRIPTION: Specifies the available routes for querying an Edge Config endpoint and the authentication method using a Read Access token in the Authorization header.
SOURCE: https://vercel.com/docs/edge-config/using-edge-config

LANGUAGE: APIDOC
CODE:
```
Routes:
  GET /<edgeConfigId>/items
  GET /<edgeConfigId>/item/<itemKey>
  GET /<edgeConfigId>/digest

Authentication:
  Header: Authorization
  Value: Bearer <token> (Read Access token)
```

----------------------------------------

TITLE: Check Edge Config Key Existence with Vercel Edge Config SDK
DESCRIPTION: This snippet demonstrates how to use the `has` helper method from `@vercel/edge-config` to verify if a specific key exists in your Edge Config. It returns a boolean indicating existence, which is then used to form a JSON response.
SOURCE: https://vercel.com/docs/edge-config/edge-config-sdk

LANGUAGE: JavaScript
CODE:
```
import { NextResponse } from 'next/server';
import { has } from '@vercel/edge-config';
 
export async function GET() {
  const exists = await has('key');
 
  return NextResponse.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`
  });
}
```

----------------------------------------

TITLE: Utilize Open Graph Image Component in Nuxt Pages
DESCRIPTION: This snippet demonstrates how to integrate a custom Open Graph image template into a Nuxt page using `defineOgImageComponent`. It shows how to pass props, such as a title, to the OG image component for dynamic content generation.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: Vue
CODE:
```
<script lang="ts" setup>
defineOgImageComponent('Template', {
  title: 'Is this thing on?'
})
</script>
```

----------------------------------------

TITLE: Implement User Opt-Out for Analytics Tracking in React
DESCRIPTION: This example illustrates how to use the `beforeSend` function to allow users to opt-out of all analytics tracking by checking for a specific `localStorage` value (e.g., 'va-disable'). If the value is present, the event is ignored by returning `null`.
SOURCE: https://vercel.com/docs/analytics/redacting-sensitive-data

LANGUAGE: JavaScript
CODE:
```
'use client';
import { Analytics } from '@vercel/analytics/react';
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics
          beforeSend={(event) => {
            if (localStorage.getItem('va-disable')) {
              return null;
            }
            return event;
          }}
        />
      </body>
    </html>
  );
}
```

----------------------------------------

TITLE: Connect Git Repository to Vercel Project
DESCRIPTION: Connects a local Git repository, identified by its `.git` config file and remote URL, to a Vercel Project. This command enables Vercel deployments directly from the connected Git provider.
SOURCE: https://vercel.com/docs/cli/git

LANGUAGE: bash
CODE:
```
vercel git connect
```

----------------------------------------

TITLE: API Header: x-vercel-ja4-digest
DESCRIPTION: Describes the `x-vercel-ja4-digest` HTTP header, a unique client fingerprint hash generated by the JA4 algorithm. This header is preferred for its granular and flexible network fingerprinting, aiding in malicious traffic mitigation.
SOURCE: https://vercel.com/docs/vercel-firewall/firewall-concepts

LANGUAGE: APIDOC
CODE:
```
Header: x-vercel-ja4-digest
Type: Client Fingerprint
Algorithm: JA4
Description: Unique client fingerprint hash generated by the JA4 algorithm.
Purpose: Offers granular and flexible network fingerprinting to help mitigate malicious traffic.
Status: Preferred
```

----------------------------------------

TITLE: Overwriting or Removing Vercel Environment Variables Without Confirmation
DESCRIPTION: Shows how to use the `--yes` option with `vercel env pull` and `vercel env rm` commands to bypass confirmation prompts, useful for scripting or automated workflows when overwriting files or removing variables.
SOURCE: https://vercel.com/docs/cli/env

LANGUAGE: Shell
CODE:
```
vercel env pull --yes
```

LANGUAGE: Shell
CODE:
```
vercel env rm [name] --yes
```

----------------------------------------

TITLE: Skipping Setup Questions with --yes
DESCRIPTION: Deploys a Vercel project, skipping interactive setup questions and using default or inferred answers from `vercel.json` and the folder name with the `--yes` option.
SOURCE: https://vercel.com/docs/cli/deploy

LANGUAGE: Shell
CODE:
```
vercel --yes
```

----------------------------------------

TITLE: Available xAI Models Overview
DESCRIPTION: A catalog of xAI models available through the Vercel integration, detailing their types and primary use cases. This includes chat models like Grok-2 and Grok-3 variants, and vision models such as Grok-2 Vision and Grok 2 Image.
SOURCE: https://vercel.com/docs/ai/xai

LANGUAGE: APIDOC
CODE:
```
Grok-2:
  Type: Chat
  Description: A large language model that can be used for a variety of tasks, including text generation, translation, and question answering.

Grok-2 Vision:
  Type: Image
  Description: A multimodal AI model that combines advanced language understanding with powerful visual processing capabilities.

Grok 2 Image:
  Type: Image
  Description: A text-to-image model that can generate high-quality images across several domains where other image generation models often struggle. It can render precise visual details of real-world entities, text, logos, and can create realistic portraits of humans.

Grok-3 Beta:
  Type: Chat
  Description: xAI's flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, healthcare, law, and science.

Grok-3 Fast Beta:
  Type: Chat
  Description: xAI's flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, healthcare, law, and science. Fast mode delivers reduced latency and a quicker time-to-first-token.

Grok-3 Mini Beta:
  Type: Chat
  Description: xAI's flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, healthcare, law, and science. Fast mode delivers reduced latency and a quicker time-to-first-token. Mini is a lightweight model that thinks before responding. Great for simple or logic-based tasks that do not require deep domain knowledge. The raw thinking traces are accessible.

Grok-3 Mini Fast Beta:
  Type: Chat
  Description: xAI's flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, healthcare, law, and science. Fast mode delivers reduced latency and a quicker time-to-first-token. Mini is a lightweight model that thinks before responding. Fast mode delivers reduced latency and a quicker time-to-first-token.
```

----------------------------------------

TITLE: Perplexity Sonar API Models Overview
DESCRIPTION: Overview of key models available through the Perplexity Sonar API, optimized for different tasks such as advanced reasoning and real-time search. These models provide varying capabilities in terms of search grounding, query support, and cost-efficiency.
SOURCE: https://vercel.com/docs/ai/perplexity

LANGUAGE: APIDOC
CODE:
```
Sonar Pro:
  Type: Chat
  Description: Perplexity's premier offering with search grounding, supporting advanced queries and follow-ups.

Sonar:
  Type: Chat
  Description: Perplexity's lightweight offering with search grounding, quicker and cheaper than Sonar Pro.
```

----------------------------------------

TITLE: Conditional Rewrite Based on Header Presence
DESCRIPTION: This example rewrites requests to any path from your site's root that does not start with /uk/ and has x-vercel-ip-country header value of GB to a corresponding path under /uk/ relative to your site's root.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/:path((?!uk/).*)",
      "has": [
        {
          "type": "header",
          "key": "x-vercel-ip-country",
          "value": "GB"
        }
      ],
      "destination": "/uk/:path*"
    }
  ]
}
```

----------------------------------------

TITLE: Verify MX Record using dig
DESCRIPTION: Demonstrates how to use the `dig` command-line tool to check the MX record (mail exchange record) for a specified domain, displaying only the short answer.
SOURCE: https://vercel.com/docs/domains/managing-dns-records

LANGUAGE: Shell
CODE:
```
$ dig MX example.com +short
```

----------------------------------------

TITLE: Configure git.deploymentEnabled with multiple matching rules
DESCRIPTION: Example `vercel.json` configuration demonstrating how multiple rules are evaluated for `git.deploymentEnabled`. If a branch matches multiple rules and at least one rule is `true`, a deployment will occur, as shown with 'experiment-my-branch-dev'.
SOURCE: https://vercel.com/docs/project-configuration/git-configuration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "experiment-*": false,
      "*-dev": true
    }
  }
}
```

----------------------------------------

TITLE: Override Vercel Install Command
DESCRIPTION: The `installCommand` property in `vercel.json` overrides the project's default install command. This is useful for experimenting with different package managers or for skipping the install step entirely by providing an empty string.
SOURCE: https://vercel.com/docs/project-configuration

LANGUAGE: APIDOC
CODE:
```
Type: `string | null`
```

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install"
}
```

----------------------------------------

TITLE: Creating Project Environment Variables via Vercel API
DESCRIPTION: Details the capability to expose API tokens or configuration URLs within a Vercel Project by creating project environment variables using the Vercel API. It also notes that environment variables created by an integration will display the integration's logo.
SOURCE: https://vercel.com/docs/integrations/vercel-api-integrations

LANGUAGE: APIDOC
CODE:
```
API Interaction Pattern:
  - Method: Create a Project Environment Variable using the API.
  - Purpose: Expose API tokens or configuration URLs for deployments within a Project.
  - Visual Indicator: Environment Variables created by an Integration will display the Integration's logo.
  - Reference: /docs/rest-api/endpoints#create-one-or-more-environment-variables
```

----------------------------------------

TITLE: Track a server-side event with Vercel Analytics
DESCRIPTION: Demonstrates how to track an event on the server-side using `@vercel/analytics/server`. This example shows tracking an 'Item purchased' event within an `async` server action, including custom quantity data, which is useful for events like purchases or sign-ups.
SOURCE: https://vercel.com/docs/analytics/custom-events

LANGUAGE: JavaScript
CODE:
```
'use server';
import { track } from '@vercel/analytics/server';
 
export async function purchase() {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

----------------------------------------

TITLE: Configure Nx Cache Directory in nx.json
DESCRIPTION: Before using remote caching with Nx, ensure the cache directory is set to `/tmp/nx-cache` in your `nx.json` file under `tasksRunnerOptions`. This example shows setting the `cacheDirectory` option for the default runner.
SOURCE: https://vercel.com/docs/monorepos/nx

LANGUAGE: JSON
CODE:
```
"tasksRunnerOptions": {
  "default": {
    "runner": "nx/tasks-runners/default",
    "options": {
      "cacheDirectory": "/tmp/nx-cache"
    }
  }
}
```

----------------------------------------

TITLE: Applying Nuxt Route Middleware to a Page
DESCRIPTION: This example illustrates how to apply a specific Nuxt route middleware to an individual page. By calling `definePageMeta` within the page's `<script>` block and setting `middleware: 'middleware-filename'`, the defined middleware will execute before the page is rendered.
SOURCE: https://vercel.com/docs/frameworks/nuxt

LANGUAGE: HTML
CODE:
```
<script>
definePageMeta({
  middleware: 'redirect'
})
</script>
 
<template>
  <div>
    You should never see this page
  </div>
</template>
```

----------------------------------------

TITLE: Accessing Vercel System Environment Variables in SvelteKit Load Function
DESCRIPTION: This TypeScript code demonstrates how to securely access Vercel system environment variables, such as `VERCEL_COMMIT_REF`, within a SvelteKit `load` function. Variables are imported from `'$env/static/private'` to ensure they remain server-side and are not exposed to the client. The `load` function then returns this data for use in a Svelte layout.
SOURCE: https://vercel.com/docs/frameworks/sveltekit

LANGUAGE: TypeScript
CODE:
```
import { LayoutServerLoad } from './types';
import { VERCEL_COMMIT_REF } from '$env/static/private';
 
type DeploymentInfo = {
  deploymentGitBranch: string;
};
 
export function load(): LayoutServerLoad<DeploymentInfo> {
  return {
    deploymentGitBranch: 'Test',
  };
}
```

----------------------------------------

TITLE: AbortSignal API
DESCRIPTION: Represents a signal object that allows communication with a DOM request (such as a Fetch request) to abort it if required, enabling graceful cancellation.
SOURCE: https://vercel.com/docs/functions/runtimes/edge

LANGUAGE: APIDOC
CODE:
```
API: AbortSignal
Description: Represents a signal object that allows you to communicate with a DOM request (such as a Fetch request) and abort it if required
```

----------------------------------------

TITLE: Define Astro Middleware onRequest Function
DESCRIPTION: This snippet demonstrates how to define an Astro middleware function using `defineMiddleware`. It shows how to intercept requests, modify the `locals` object to share data across endpoints and pages, and then proceed with the request using `next()`.
SOURCE: https://vercel.com/docs/frameworks/astro

LANGUAGE: TypeScript
CODE:
```
// This helper automatically types middleware params
import { defineMiddleware } from 'astro:middleware';
 
export const onRequest = defineMiddleware(({ locals }, next) => {
  // intercept data from a request
  // optionally, modify the properties in `locals`
  locals.title = 'New title';
 
  // return a Response or the result of calling `next()`
  return next();
});
```

----------------------------------------

TITLE: Demonstrating Limited Date API Behavior in Edge Functions
DESCRIPTION: This TypeScript code snippet illustrates how `Date.now()` behaves in Vercel Edge Functions. It shows that the date value remains constant during CPU-bound loops and only updates after an I/O operation like `fetch`, mitigating CPU timing attacks.
SOURCE: https://vercel.com/docs/functions/runtimes/edge/edge-functions

LANGUAGE: TypeScript
CODE:
```
export const runtime = 'edge';
 
export async function GET(request: Request) {
  const currentDate = () => new Date().toISOString();
  for (let i = 0; i < 500; i++) {
    console.log(`Current Date before fetch: ${currentDate()}`); // Prints the same value 1000 times.
  }
 
  await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
  console.log(`Current Date after fetch: ${currentDate()}`); // Prints the new time
 
  return Response.json({ date: currentDate() });
}
```

----------------------------------------

TITLE: Playwright Configuration for Vercel Protection Bypass
DESCRIPTION: Example Playwright test configuration demonstrating how to include the `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie` headers in automated tests. This allows Playwright to bypass Vercel's deployment protection during end-to-end testing.
SOURCE: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation

LANGUAGE: JavaScript
CODE:
```
const config: PlaywrightTestConfig = {
  use: {
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': true | 'samesitenone' (optional)
    }
  }
}
```

----------------------------------------

TITLE: Install AI SDK Groq and AI Packages
DESCRIPTION: Installs the necessary `@ai-sdk/groq` and `ai` packages using pnpm, enabling Groq integration and AI functionalities in your project.
SOURCE: https://vercel.com/docs/ai/groq

LANGUAGE: pnpm
CODE:
```
pnpm i @ai-sdk/groq ai
```

----------------------------------------

TITLE: Deploying an MCP Server on Vercel with @vercel/mcp-adapter
DESCRIPTION: This code snippet demonstrates how to create an API route using `@vercel/mcp-adapter` to host an MCP server on Vercel. It defines a `roll_dice` tool that takes an integer `sides` parameter and returns a random dice roll value. The handler is exposed for GET, POST, and DELETE requests.
SOURCE: https://vercel.com/docs/mcp

LANGUAGE: JavaScript
CODE:
```
import { createMcpHandler } from '@vercel/mcp-adapter';
 
const handler = createMcpHandler((server) => {
  server.tool(
    'roll_dice',
    'Rolls an N-sided die',
    { sides: z.number().int().min(2) },
    async ({ sides }) => {
      const value = 1 + Math.floor(Math.random() * sides);
      return { content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }] };
    },
  );
});
 
export { handler as GET, handler as POST, handler as DELETE };
```

----------------------------------------

TITLE: Accessing Vercel IP Longitude Header in Next.js
DESCRIPTION: This snippet illustrates how to retrieve the longitude coordinate of the requester's public IP address from the `x-vercel-ip-longitude` header. The value is a numerical string representing the longitude, for example, `-122.4194`.
SOURCE: https://vercel.com/docs/headers/request-headers

LANGUAGE: TypeScript
CODE:
```
export function GET(request: Request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

----------------------------------------

TITLE: Set Default Max Duration for All Functions via vercel.json
DESCRIPTION: Establish a project-wide default maximum duration for all functions within a specified path using a glob pattern in `vercel.json`. This overrides Vercel's default limits, providing a consistent timeout setting across your application.
SOURCE: https://vercel.com/docs/functions/configuring-functions/duration

LANGUAGE: JSON
CODE:
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "app/api/**/*": {
      "maxDuration": 5 // All functions can run for a maximum of 5 seconds
    }
  }
}
```