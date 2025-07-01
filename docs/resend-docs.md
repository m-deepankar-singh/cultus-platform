TITLE: Send Email using Resend API
DESCRIPTION: This snippet demonstrates how to send an email using the Resend API across various programming languages. It includes examples for Node.js, PHP, Python, Ruby, Go, Rust, Java, C#, and cURL, showing how to initialize the client and send a basic HTML email.
SOURCE: https://resend.com/docs/api-reference/emails/send-email

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
});
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'hello world',
  'html' => '<p>it works!</p>'
]);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

params: resend.Emails.SendParams = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>"
}

email = resend.Emails.send(params)
print(email)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>"
}

sent = Resend::Emails.send(params)
puts sent
```

LANGUAGE: Go
CODE:
```
import (
	"fmt"

	"github.com/resend/resend-go/v2"
)

func main() {
  ctx := context.TODO()
  client := resend.NewClient("re_xxxxxxxxx")

  params := &resend.SendEmailRequest{
      From:        "Acme <onboarding@resend.dev>",
      To:          []string{"delivered@resend.dev"},
      Subject:     "hello world",
      Html:        "<p>it works!</p>"
  }

  sent, err := client.Emails.SendWithContext(ctx, params)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Id)
}
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::{CreateEmailBaseOptions};
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "hello world";
  let html = "<p>it works!</p>";

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html(html);

  let _email = resend.emails.send(email).await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("hello world")
                .html("<p>it works!</p>")
                .build();

        CreateEmailResponse data = resend.emails().send(params);
    }
}
```

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.EmailSendAsync( new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "delivered@resend.dev",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
} );
Console.WriteLine( "Email Id={0}", resp.Content );
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/emails' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -d $'{
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>"
}'
```

----------------------------------------

TITLE: Send Email with Resend API in Next.js Function
DESCRIPTION: This TypeScript snippet defines a Next.js App Router handler (`app/api/send/route.ts`) that sends an email via the Resend API. It performs a POST request to the `/emails` endpoint, including `Content-Type` and `Authorization` headers, and a JSON body specifying sender, recipient, subject, and HTML content. The function handles the API response and returns it as JSON.
SOURCE: https://resend.com/docs/send-with-vercel-functions

LANGUAGE: TypeScript
CODE:
```
const RESEND_API_KEY = 're_xxxxxxxxx';

export async function POST() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'hello world',
      html: '<strong>it works!</strong>',
    }),
  });

  if (res.ok) {
    const data = await res.json();
    return Response.json(data);
  }
}
```

----------------------------------------

TITLE: Send Multiple Emails in Batch via Resend API
DESCRIPTION: This snippet illustrates how to send a collection of emails in a single API call using the Resend SDKs. It shows how to define multiple email objects, each with 'from', 'to', 'subject', and 'html' fields, and then pass them to the batch send method. This method is efficient for sending personalized emails to multiple recipients or multiple transactional emails.
SOURCE: https://resend.com/docs/api-reference/emails/send-batch-emails

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.batch.send([
  {
    from: 'Acme <onboarding@resend.dev>',
    to: ['foo@gmail.com'],
    subject: 'hello world',
    html: '<h1>it works!</h1>',
  },
  {
    from: 'Acme <onboarding@resend.dev>',
    to: ['bar@outlook.com'],
    subject: 'world hello',
    html: '<p>it works!</p>',
  },
]);
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->batch->send([
  [
    'from' => 'Acme <onboarding@resend.dev>',
    'to' => ['foo@gmail.com'],
    'subject' => 'hello world',
    'html' => '<h1>it works!</h1>',
  ],
  [
    'from' => 'Acme <onboarding@resend.dev>',
    'to' => ['bar@outlook.com'],
    'subject' => 'world hello',
    'html' => '<p>it works!</p>',
  ]
]);
```

LANGUAGE: Python
CODE:
```
import resend
from typing import List

resend.api_key = "re_xxxxxxxxx"

params: List[resend.Emails.SendParams] = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
  }
]

resend.Batch.send(params)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = 're_xxxxxxxxx'

params = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
  }
]

Resend::Batch.send(params)
```

LANGUAGE: Go
CODE:
```
package examples

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func main() {

  ctx := context.TODO()

  client := resend.NewClient("re_xxxxxxxxx")

  var batchEmails = []*resend.SendEmailRequest{
    {
      From:    "Acme <onboarding@resend.dev>",
      To:      []string{"foo@gmail.com"},
      Subject: "hello world",
      Html:    "<h1>it works!</h1>",
    },
    {
      From:    "Acme <onboarding@resend.dev>",
      To:      []string{"bar@outlook.com"},
      Subject: "world hello",
      Html:    "<p>it works!</p>",
    },
  }

  sent, err := client.Batch.SendWithContext(ctx, batchEmails)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Data)
}
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let emails = vec![
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["foo@gmail.com"],
      "hello world",
    )
    .with_html("<h1>it works!</h1>"),
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["bar@outlook.com"],
      "world hello",
    )
    .with_html("<p>it works!</p>"),
  ];

  let _emails = resend.batch.send(emails).await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions firstEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("foo@gmail.com")
            .subject("hello world")
            .html("<h1>it works!</h1>")
            .build();

        CreateEmailOptions secondEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("bar@outlook.com")
            .subject("world hello")
            .html("<p>it works!</p>")
            .build();

        CreateBatchEmailsResponse data = resend.batch().send(
            Arrays.asList(firstEmail, secondEmail)
        );
    }
}
```

LANGUAGE: .NET
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var mail1 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "foo@gmail.com",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
};

var mail2 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "bar@outlook.com",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
};

var resp = await resend.EmailBatchAsync( [ mail1, mail2 ] );
Console.WriteLine( "Nr Emails={0}", resp.Content.Count );
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/emails/batch' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -d '$[
  {
    "from": "Acme <onboarding@resend.dev>",

```

----------------------------------------

TITLE: Send Email with Resend using Bun and React Template
DESCRIPTION: This example sets up a basic Bun server that sends an email using the Resend SDK. It imports the `EmailTemplate` component, renders it as the email's content, and handles potential errors during the sending process.
SOURCE: https://resend.com/docs/send-with-bun

LANGUAGE: tsx
CODE:
```
import { Resend } from 'resend';
import { EmailTemplate } from './email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

const server = Bun.serve({
  port: 3000,
  async fetch() {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello World',
      react: EmailTemplate({ firstName: 'Vitor' }),
    });

    if (error) {
      return new Response(JSON.stringify({ error }));
    }

    return new Response(JSON.stringify({ data }));
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
```

----------------------------------------

TITLE: Axum Email Sending Example with Resend Rust SDK
DESCRIPTION: This Rust code demonstrates a complete Axum application setup to send emails using the Resend Rust SDK. It initializes the Resend client, defines an `AppState` for sharing the client, and creates an asynchronous `endpoint` function that constructs and sends an email via the Resend API, returning the email ID or an error status.
SOURCE: https://resend.com/docs/send-with-axum

LANGUAGE: Rust
CODE:
```
use std::sync::Arc;

use axum::{extract::State, http::StatusCode, routing::get, Router};
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

// Cloning the Resend client is fine and cheap as the internal HTTP client is
// not cloned.
#[derive(Clone)]
struct AppState {
  resend: Resend,
}

#[tokio::main]
async fn main() {
  let shared_state = Arc::new(AppState {
    resend: Resend::new("re_xxxxxxxxx"),
  });

  // build our application with a single route
  let app = Router::new()
    .route("/", get(endpoint))
    // provide the state so the router can access it
    .with_state(shared_state);

  // run our app with hyper, listening globally on port 3000
  let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
  axum::serve(listener, app).await.unwrap();
}

async fn endpoint(State(state): State<Arc<AppState>>) -> Result<String, StatusCode> {
  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "Hello World";

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html("<strong>It works!</strong>");

  // access the state via the `State` extractor and handle the error
  match state.resend.emails.send(email).await {
    Ok(email) => Ok(email.id.to_string()),
    Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
  }
}
```

----------------------------------------

TITLE: Send Email using React Template in Next.js API Route
DESCRIPTION: Demonstrates how to send an email using the Resend SDK within a Next.js API route. It shows implementations for both the Pages Router (`pages/api/send.ts`) and the App Router (`app/api/send/route.ts`), integrating the previously created React email template.
SOURCE: https://resend.com/docs/send-with-nextjs

LANGUAGE: ts
CODE:
```
import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailTemplate } from '../../components/EmailTemplate';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'Hello world',
    react: EmailTemplate({ firstName: 'John' }),
  });

  if (error) {
    return res.status(400).json(error);
  }

  res.status(200).json(data);
};
```

LANGUAGE: ts
CODE:
```
import { EmailTemplate } from '../../../components/EmailTemplate';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      react: EmailTemplate({ firstName: 'John' }),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
```

----------------------------------------

TITLE: Store Resend API Key in .env file
DESCRIPTION: Demonstrates how to store a Resend API key in a `.env` file. This practice ensures that sensitive API keys are kept out of the main codebase and are managed as environment variables, which is crucial for security.
SOURCE: https://resend.com/docs/knowledge-base/how-to-handle-api-keys

LANGUAGE: .env
CODE:
```
RESEND_API_KEY = 're_xxxxxxxxx';
```

----------------------------------------

TITLE: Resend API Authentication Header
DESCRIPTION: Authenticate your requests by including an 'Authorization' header. The header's content should be 'Bearer' followed by your Resend API Key (e.g., 're_xxxxxxxxx').
SOURCE: https://resend.com/docs/api-reference/introduction

LANGUAGE: APIDOC
CODE:
```
Authorization: Bearer re_xxxxxxxxx
```

----------------------------------------

TITLE: Implement Resend Email Logic in Supabase Edge Function
DESCRIPTION: Provides the TypeScript code for the `index.ts` handler, demonstrating how to make a POST request to the Resend API to send an email. It includes setting headers, authorization, and the email body with sender, recipient, subject, and HTML content.
SOURCE: https://resend.com/docs/send-with-supabase-edge-functions

LANGUAGE: js
CODE:
```
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = 're_xxxxxxxxx';

const handler = async (_request: Request): Promise<Response> => {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'Acme <onboarding@resend.dev>',
            to: ['delivered@resend.dev'],
            subject: 'hello world',
            html: '<strong>it works!</strong>',
        })
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

serve(handler);
```

----------------------------------------

TITLE: Send HTML Email with FastAPI and Resend
DESCRIPTION: This Python code snippet demonstrates how to create a FastAPI endpoint that sends an email with HTML content using the Resend Python SDK. It initializes the Resend API key, defines a POST route, and uses the `resend.Emails.send` method to dispatch an email with a specified sender, recipient, subject, and HTML body.
SOURCE: https://resend.com/docs/send-with-fastapi

LANGUAGE: python
CODE:
```
import resend
from typing import Dict
from fastapi import FastAPI

resend.api_key = "re_xxxxxxxxx"

app = FastAPI()

@app.post("/")
def send_mail() -> Dict:
    params: resend.Emails.SendParams = {
        "from": "onboarding@resend.dev",
        "to": ["delivered@resend.dev"],
        "subject": "Hello World",
        "html": "<strong>it works!</strong>",
    }
    email: resend.Email = resend.Emails.send(params)
    return email
```

----------------------------------------

TITLE: Send Batch Emails with Idempotency Key in C#
DESCRIPTION: This snippet demonstrates how to send multiple emails in a single batch request using the Resend C# SDK. It utilizes an idempotency key to prevent duplicate email sends if the request is retried. The code initializes the Resend client, creates an idempotency key, defines two EmailMessage objects, and then sends them as a batch.
SOURCE: https://resend.com/docs/dashboard/emails/idempotency-keys

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var key = IdempotencyKey.New<int>( "team-quota", 123456789 );

var mail1 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "foo@gmail.com",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
};

var mail2 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "bar@outlook.com",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
};

var resp = await resend.EmailBatchAsync(key, [ mail1, mail2 ] );
Console.WriteLine( "Nr Emails={0}", resp.Content.Count );
```

----------------------------------------

TITLE: Send Email with Remote File Attachment using Resend API
DESCRIPTION: This snippet demonstrates how to send an email using the Resend API, including an attachment sourced from a remote URL. The `attachments` array/list/slice contains an object/map with `path` (the URL to the file) and `filename` (the desired name for the attachment) parameters. An API key is required for authentication.
SOURCE: https://resend.com/docs/dashboard/emails/attachments

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Receipt for your payment',
  html: '<p>Thanks for the payment</p>',
  attachments: [
    {
      path: 'https://resend.com/static/sample/invoice.pdf',
      filename: 'invoice.pdf',
    },
  ],
});
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'Receipt for your payment',
  'html' => '<p>Thanks for the payment</p>',
  'attachments' => [
    [
      'path' => 'https://resend.com/static/sample/invoice.pdf',
      'filename' => 'invoice.pdf'
    ]
  ]
]);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

attachment: resend.Attachment = {
  "path": "https://resend.com/static/sample/invoice.pdf",
  "filename": "invoice.pdf",
}

params: resend.Emails.SendParams = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "Receipt for your payment",
  "html": "<p>Thanks for the payment</p>",
  "attachments": [attachment],
}

resend.Emails.send(params)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "Receipt for your payment",
  "html": "<p>Thanks for the payment</p>",
  "attachments": [
    {
      "path": "https://resend.com/static/sample/invoice.pdf",
      "filename": 'invoice.pdf',
    }
  ]
}

Resend::Emails.send(params)
```

LANGUAGE: Go
CODE:
```
import (
	"fmt"

	"github.com/resend/resend-go/v2"
)

func main() {
  ctx := context.TODO()
  client := resend.NewClient("re_xxxxxxxxx")

  attachment := &resend.Attachment{
    Path:  "https://resend.com/static/sample/invoice.pdf",
    Filename: "invoice.pdf",
  }

  params := &resend.SendEmailRequest{
      From:        "Acme <onboarding@resend.dev>",
      To:          []string{"delivered@resend.dev"},
      Subject:     "Receipt for your payment",
      Html:        "<p>Thanks for the payment</p>",
      Attachments: []*resend.Attachment{attachment},
  }

  sent, err := client.Emails.SendWithContext(ctx, params)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Id)
}
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::{Attachment, CreateEmailBaseOptions};
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "Receipt for your payment";

  let path = "https://resend.com/static/sample/invoice.pdf";
  let filename = "invoice.pdf";

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html("<p>Thanks for the payment</p>")
    .with_attachment(Attachment::from_path(path).with_filename(filename));

  let _email = resend.emails.send(email).await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        Attachment att = Attachment.builder()
                .path("https://resend.com/static/sample/invoice.pdf")
                .fileName("invoice.pdf")
                .build();

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("Receipt for your payment")
                .text("<p>Thanks for the payment</p>")
                .attachments(att)
                .build();

        CreateEmailResponse data = resend.emails().send(params);
    }
}
```

LANGUAGE: .NET
CODE:
```
using Resend;
using System.Collections.Generic;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var message = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "delivered@resend.dev",
    Subject = "Receipt for your payment",
    HtmlBody = "<p>Thanks for the payment</p>",
};

message.Attachments = new List<EmailAttachment>();
message.Attachments.Add( new EmailAttachment() {
  Filename = "invoice.pdf",
  Path = "https://resend.com/static/sample/invoice.pdf",
} );

var resp = await resend.EmailSendAsync( message );
```

----------------------------------------

TITLE: Send Email with Resend API in AWS Lambda (Node.js)
DESCRIPTION: This Node.js handler function for AWS Lambda sends an email using the Resend API. It constructs a POST request to the Resend emails endpoint, including the API key in the Authorization header and the email details (from, to, subject, html) in the JSON body. The function checks for a successful response and returns the API data with a 200 status code. It requires a valid Resend API key and a verified domain.
SOURCE: https://resend.com/docs/send-with-aws-lambda

LANGUAGE: JavaScript
CODE:
```
const RESEND_API_KEY = 're_xxxxxxxxx';

export const handler = async (event) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'hello world',
      html: '<strong>it works!</strong>',
    }),
  });

  if (res.ok) {
    const data = await res.json();

    return {
      statusCode: 200,
      body: data,
    };
  }
};
```

----------------------------------------

TITLE: Send HTML Email with Express and Resend Node.js SDK
DESCRIPTION: This snippet demonstrates how to set up a basic Express server to send an HTML email using the Resend Node.js SDK. It initializes Resend with an API key, defines a GET endpoint, and handles email sending with error checking. The server listens on port 3000.
SOURCE: https://resend.com/docs/send-with-express

LANGUAGE: js
CODE:
```
import express, { Request, Response } from "express";
import { Resend } from "resend";

const app = express();
const resend = new Resend("re_xxxxxxxxx");

app.get("/", async (req: Request, res: Response) => {
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to: ["delivered@resend.dev"],
    subject: "hello world",
    html: "<strong>it works!</strong>"
  });

  if (error) {
    return res.status(400).json({ error });
  }

  res.status(200).json({ data });
});

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
```

----------------------------------------

TITLE: Send HTML Email using Resend Python SDK
DESCRIPTION: This Python code demonstrates how to send an email with HTML content using the Resend SDK. It initializes the API key from an environment variable and constructs an email payload with sender, recipient, subject, and HTML body. The resend.Emails.send method is then called to dispatch the email.
SOURCE: https://resend.com/docs/send-with-python

LANGUAGE: python
CODE:
```
import os
import resend

resend.api_key = os.environ["RESEND_API_KEY"]

params: resend.Emails.SendParams = {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "html": "<strong>it works!</strong>",
}

email = resend.Emails.send(params)
print(email)
```

----------------------------------------

TITLE: Send Email with Hono and Resend SDK
DESCRIPTION: Initializes a Hono application and the Resend SDK. It demonstrates sending an email using the previously defined React template and handles potential errors or successful data responses.
SOURCE: https://resend.com/docs/send-with-hono

LANGUAGE: ts
CODE:
```
import { Hono } from 'hono';
import { Resend } from 'resend';
import { EmailTemplate } from './emails/email-template';

const app = new Hono();
const resend = new Resend('re_xxxxxxxxx');

app.get('/', async (c) => {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'hello world',
    react: <EmailTemplate firstName="John" />,
  });

  if (error) {
    return c.json(error, 400);
  }

  return c.json(data);
});

export default app;
```

----------------------------------------

TITLE: Send Email via Resend POST /emails Endpoint with Idempotency Key
DESCRIPTION: This snippet demonstrates how to send an email using the Resend API's `POST /emails` endpoint across various programming languages. It includes the use of an idempotency key to prevent duplicate email sends for the same request, ensuring reliable message delivery.
SOURCE: https://resend.com/docs/dashboard/emails/idempotency-keys

LANGUAGE: Node.js
CODE:
```
await resend.emails.send(
    {
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'hello world',
      html: '<p>it works!</p>',
    },
    {
      idempotencyKey: 'welcome-user/123456789',
    },
  );
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

  $resend->emails->send([
    'from' => 'Acme <onboarding@resend.dev>',
    'to' => ['delivered@resend.dev'],
    'subject' => 'hello world',
    'text' => 'it works!',
  ], [
    'idempotency_key' => 'welcome-user/123456789',
  ]);
```

LANGUAGE: Python
CODE:
```
params: resend.Emails.SendParams = {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "text": "it works!"
  }

  options: resend.Emails.SendOptions = {
    "idempotency_key": "welcome-user/123456789",
  }

  resend.Emails.send(params, options)
```

LANGUAGE: Ruby
CODE:
```
params = {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "text": "it works!"
  }
  Resend::Emails.send(
    params,
    options: { idempotency_key: "welcome-user/123456789" }
  )
```

LANGUAGE: Go
CODE:
```
ctx := context.TODO()
  params := &resend.SendEmailRequest{
    From:    "onboarding@resend.dev",
    To:      []string{"delivered@resend.dev"},
    Subject: "hello world",
    Text:    "it works!",
  }
  options := &resend.SendEmailOptions{
    IdempotencyKey: "welcome-user/123456789",
  }
  _, err := client.Emails.SendWithOptions(ctx, params, options)
  if err != nil {
    panic(err)
  }
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::CreateEmailBaseOptions;
  use resend_rs::{Resend, Result};

  #[tokio::main]
  async fn main() -> Result<()> {
    let resend = Resend::new("re_xxxxxxxxx");

    let from = "Acme <onboarding@resend.dev>";
    let to = ["delivered@resend.dev"];
    let subject = "Hello World";

    let email = CreateEmailBaseOptions::new(from, to, subject)
      .with_text("It works!")
      .with_idempotency_key("welcome-user/123456789");

    let _email = resend.emails.send(email).await?;

    Ok(())
  }
```

LANGUAGE: Java
CODE:
```
CreateEmailOptions params = CreateEmailOptions.builder()
    .from("Acme <onboarding@resend.dev>")
    .to("delivered@resend.dev")
    .subject("hello world")
    .html("<p>it works!</p>")
    .build();

  RequestOptions options = RequestOptions.builder()
    .setIdempotencyKey("welcome-user/123456789").build();

  CreateEmailResponse data = resend.emails().send(params, options);
```

LANGUAGE: C#
CODE:
```
using Resend;

  IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

  var key = IdempotencyKey.New<int>( "welcome-user", 123456789 );
  var resp = await resend.EmailSendAsync(key, new EmailMessage()
  {
      From = "Acme <onboarding@resend.dev>",
      To = "delivered@resend.dev",
      Subject = "hello world",
      HtmlBody = "<p>it works!</p>",
  } );
  Console.WriteLine( "Email Id={0}", resp.Content );
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/emails' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -H 'Idempotency-Key: welcome-user/123456789' \
       -d $'{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "text": "it works!"
  }'
```

----------------------------------------

TITLE: Access Resend API Key from Environment Variable in Node.js
DESCRIPTION: Shows how to securely access the Resend API key from an environment variable within a Node.js application using TypeScript. This method ensures that the API key is not hard-coded and is retrieved dynamically at runtime, enhancing security.
SOURCE: https://resend.com/docs/knowledge-base/how-to-handle-api-keys

LANGUAGE: ts
CODE:
```
const resend = new Resend(process.env.RESEND_API_KEY);
```

----------------------------------------

TITLE: Add .env to .gitignore
DESCRIPTION: Illustrates how to prevent the `.env` file, which contains sensitive API keys, from being committed to version control. Adding `.env` to `.gitignore` is a fundamental security practice to avoid exposing credentials in public or private repositories.
SOURCE: https://resend.com/docs/knowledge-base/how-to-handle-api-keys

LANGUAGE: .gitignore
CODE:
```
.env
```

----------------------------------------

TITLE: Send Email with Attachment using Resend API (cURL)
DESCRIPTION: Demonstrates sending an HTML email with a PDF attachment to the Resend API using a cURL POST request. It includes setting authorization, content type, and the JSON payload for email details.
SOURCE: https://resend.com/docs/dashboard/emails/attachments

LANGUAGE: bash
CODE:
```
curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'{
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "Receipt for your payment",
  "html": "<p>Thanks for the payment</p>",
  "attachments": [
    {
      "path": "https://resend.com/static/sample/invoice.pdf",
      "filename": "invoice.pdf"
    }
  ]
}'
```

----------------------------------------

TITLE: Create React Email Template
DESCRIPTION: Defines a basic React functional component (`EmailTemplate`) that serves as the structure for an email. This template accepts props, such as `firstName`, to personalize the email content.
SOURCE: https://resend.com/docs/send-with-nextjs

LANGUAGE: tsx
CODE:
```
import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
}) => (
  <div>
    <h1>Welcome, {firstName}!</h1>
  </div>
);
```

----------------------------------------

TITLE: Send Email with Django's EmailMessage and Resend SMTP
DESCRIPTION: This Python snippet demonstrates how to send an email using Django's `EmailMessage` class and `get_connection` with the pre-configured Resend SMTP settings. It shows how to construct an email with subject, body, recipients, and sender, then send it within a Django view context.
SOURCE: https://resend.com/docs/send-with-django-smtp

LANGUAGE: python
CODE:
```
import os
from django.conf import settings
from django.http import JsonResponse
from django.core.mail import EmailMessage, get_connection

# Sample Django view
def index(request):

    subject = "Hello from Django SMTP"
    recipient_list = ["delivered@resend.dev"]
    from_email = "onboarding@resend.dev"
    message = "<strong>it works!</strong>"

    with get_connection(
        host=settings.RESEND_SMTP_HOST,
        port=settings.RESEND_SMTP_PORT,
        username=settings.RESEND_SMTP_USERNAME,
        password=os.environ["RESEND_API_KEY"],
        use_tls=True,
        ) as connection:
            r = EmailMessage(
                  subject=subject,
                  body=message,
                  to=recipient_list,
                  from_email=from_email,
                  connection=connection).send()
    return JsonResponse({"status": "ok"})
```

----------------------------------------

TITLE: Create a GET API Endpoint for Sending Emails with Resend in Next.js
DESCRIPTION: This TypeScript code defines a Next.js API route (`app/api/send/route.ts`) that handles GET requests. It uses the Resend SDK to send an email to `delivered@resend.dev` and returns a JSON response with the email data or an error. This endpoint is designed to be fetched by Playwright during E2E testing.
SOURCE: https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright

LANGUAGE: ts
CODE:
```
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      html: '<h1>Hello world</h1>',
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
```

----------------------------------------

TITLE: Add Contact to Audience via API
DESCRIPTION: This snippet demonstrates how to programmatically add a new contact to a specific audience using the Resend API. It provides examples across various SDKs (Node.js, PHP, Python, Ruby, Go, Rust, Java) and a direct cURL command. This method is ideal for integrating contact management into applications, such as automatically adding users after a purchase. Required parameters include `email` and `audienceId`, with optional fields for `firstName`, `lastName`, and `unsubscribed` status.
SOURCE: https://resend.com/docs/dashboard/audiences/contacts

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

resend.contacts.create({
  email: 'steve.wozniak@gmail.com',
  firstName: 'Steve',
  lastName: 'Wozniak',
  unsubscribed: false,
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
});
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->contacts->create(
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
  [
    'email' => 'steve.wozniak@gmail.com',
    'first_name' => 'Steve',
    'last_name' => 'Wozniak',
    'unsubscribed' => false
  ]
);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

params: resend.Contacts.CreateParams = {
  "email": "steve.wozniak@gmail.com",
  "first_name": "Steve",
  "last_name": "Wozniak",
  "unsubscribed": False,
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
}

resend.Contacts.create(params)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

params = {
  "email": "steve.wozniak@gmail.com",
  "first_name": "Steve",
  "last_name": "Wozniak",
  "unsubscribed": false,
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
}

Resend::Contacts.create(params)
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")

params := &resend.CreateContactRequest{
  Email:        "steve.wozniak@gmail.com",
  FirstName:    "Steve",
  LastName:     "Wozniak",
  Unsubscribed: false,
  AudienceId:   "78261eea-8f8b-4381-83c6-79fa7120f1cf",
}

contact, err := client.Contacts.Create(params)
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{types::ContactData, Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let contact = ContactData::new("steve.wozniak@gmail.com")
    .with_first_name("Steve")
    .with_last_name("Wozniak")
    .with_unsubscribed(false);

  let _contact = resend
    .contacts
    .create("78261eea-8f8b-4381-83c6-79fa7120f1cf", contact)
    .await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateContactOptions params = CreateContactOptions.builder()
                .email("steve.wozniak@gmail.com")
                .firstName("Steve")
                .lastName("Wozniak")
                .unsubscribed(false)
                .audienceId("78261eea-8f8b-4381-83c6-79fa7120f1cf")
                .build();

        CreateContactResponseSuccess data = resend.contacts().create(params);
    }
}
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/audiences/78261eea-8f8b-4381-83c6-79fa7120f1cf/contacts' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -d $'{
    "email": "steve.wozniak@gmail.com",
    "first_name": "Steve",
    "last_name": "Wozniak",
    "unsubscribed": false
  }'
```

----------------------------------------

TITLE: Send Email from Cloudflare Worker using Resend and React
DESCRIPTION: Demonstrates how to integrate the Resend SDK into a Cloudflare Worker to send emails. It initializes the Resend client with an API key, uses the previously defined React email template, and sends an email to a specified recipient upon a fetch request.
SOURCE: https://resend.com/docs/send-with-cloudflare-workers

LANGUAGE: tsx
CODE:
```
import { Resend } from 'resend';
import { EmailTemplate } from './emails/email-template';

export default {
  async fetch(request, env, context): Promise<Response> {
    const resend = new Resend('re_xxxxxxxxx');

    const data = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'hello world',
      react: <EmailTemplate firstName="John" />,
    });

    return Response.json(data);
  },
} satisfies ExportedHandler<Env, ExecutionContext>;
```

----------------------------------------

TITLE: Create a React Email Template for Resend
DESCRIPTION: This code defines a reusable React component named `EmailTemplate`. It accepts `firstName` as a prop and renders a simple welcome message, serving as the content for emails sent via Resend.
SOURCE: https://resend.com/docs/send-with-bun

LANGUAGE: tsx
CODE:
```
import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
}) => (
  <div>
    <h1>Welcome, {firstName}!</h1>
  </div>
);
```

----------------------------------------

TITLE: Retrieve a list of audiences using Resend SDKs and cURL
DESCRIPTION: This snippet demonstrates how to retrieve a list of existing audiences from Resend. It provides examples for various Resend SDKs (Node.js, PHP, Python, Ruby, Go, Rust, Java, .NET) and a direct cURL command. All examples require a Resend API key for authentication.
SOURCE: https://resend.com/docs/api-reference/audiences/list-audiences

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

resend.audiences.list();
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->audiences->list();
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

resend.Audiences.list()
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

Resend::Audiences.list
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")

audiences, err := client.Audiences.List()
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let _audiences = resend
    .audiences
    .list()
    .await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        ListAudiencesResponseSuccess data = resend.audiences().list();
    }
}
```

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.AudienceListAsync();
Console.WriteLine( "Nr Audience={0}", resp.Content.Count );
```

LANGUAGE: Bash
CODE:
```
curl -X GET 'https://api.resend.com/audiences' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json'
```

----------------------------------------

TITLE: Configure Django SMTP Backend for Resend
DESCRIPTION: This Python snippet illustrates the necessary settings to configure Django's email backend to use Resend's SMTP service. It defines the backend class, SMTP port, username, and host for email sending.
SOURCE: https://resend.com/docs/send-with-django-smtp

LANGUAGE: python
CODE:
```
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
RESEND_SMTP_PORT = 587
RESEND_SMTP_USERNAME = 'resend'
RESEND_SMTP_HOST = 'smtp.resend.com'
```

----------------------------------------

TITLE: Configure Playwright for E2E Testing in Next.js Project
DESCRIPTION: This Playwright configuration file (`playwright.config.ts`) defines settings for running E2E tests. Key properties include `testDir` for test file location, `outputDir` for results, `webServer` to run the Next.js app before tests, and `projects` to specify different browser configurations (Chrome, Firefox, Safari, mobile devices) for testing.
SOURCE: https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright

LANGUAGE: ts
CODE:
```
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const baseURL = 'http://localhost:3000';

export default defineConfig({
  timeout: 30 * 1000,
  testDir: path.join(__dirname, 'e2e'),
  retries: 2,
  outputDir: 'test-results/',
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL,
    // Retry a test if its failing with enabled tracing. This allows you to analyze the DOM, console logs, network traffic etc.
    trace: 'retry-with-trace',
  },

  projects: [
    // Test against desktop browsers.
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    // Test against mobile viewports.
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: devices['iPhone 12'],
    },
  ],
});
```

----------------------------------------

TITLE: Configure Custom Return Path for Resend Domain Creation
DESCRIPTION: This snippet demonstrates how to set a custom return path when creating a new domain using the Resend API. A custom return path allows you to change the default 'send' subdomain used by Resend for the Return-Path address, which can enhance email deliverability and branding. The examples cover various programming languages and a cURL command.
SOURCE: https://resend.com/docs/dashboard/domains/introduction

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

resend.domains.create({ name: 'example.com', customReturnPath: 'outbound' });
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->domains->create([
  'name' => 'example.com',
  'custom_return_path' => 'outbound'
]);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

params: resend.Domains.CreateParams = {
  "name": "example.com",
  "custom_return_path": "outbound"
}

resend.Domains.create(params)
```

LANGUAGE: Ruby
CODE:
```
Resend.api_key = ENV["RESEND_API_KEY"]

params = {
  name: "example.com",
  custom_return_path: "outbound"
}
domain = Resend::Domains.create(params)
puts domain
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")

params := &resend.CreateDomainRequest{
    Name: "example.com",
    CustomReturnPath: "outbound",
}

domain, err := client.Domains.Create(params)
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{types::CreateDomainOptions, Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let _domain = resend
    .domains
    .add(CreateDomainOptions::new("example.com").with_custom_return_path("outbound"))
    .await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateDomainOptions params = CreateDomainOptions
                .builder()
                .name("example.com")
                .customReturnPath("outbound")
                .build();

        CreateDomainResponse domain = resend.domains().create(params);
    }
}
```

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.DomainAddAsync( "example.com", new DomainAddOptions { CustomReturnPath = "outbound" } );
Console.WriteLine( "Domain Id={0}", resp.Content.Id );
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/domains' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -d $'{
    "name": "example.com",
    "custom_return_path": "outbound"
  }'
```

----------------------------------------

TITLE: Initialize Rails UserMailer Instance
DESCRIPTION: Demonstrates how to initialize and prepare an email message using the `UserMailer`. It creates a dummy `User` object, then calls `UserMailer.with(user: u).welcome_email` to generate a `Mail::Message` object, ready for delivery.
SOURCE: https://resend.com/docs/send-with-rails-smtp

LANGUAGE: Ruby
CODE:
```
u = User.new name: "derich"
mailer = UserMailer.with(user: u).welcome_email
```

----------------------------------------

TITLE: Send HTML Email using Resend Go SDK
DESCRIPTION: This Go code demonstrates sending an email with HTML content using the Resend SDK. It initializes the Resend client with an API key, then constructs an email request specifying sender, recipients, subject, and HTML body. The example also shows how to include CC, BCC, and Reply-To addresses.
SOURCE: https://resend.com/docs/send-with-go

LANGUAGE: Go
CODE:
```
package main

import (
	"fmt"
	"github.com/resend/resend-go/v2"
)

func main() {
    apiKey := "re_xxxxxxxxx"

    client := resend.NewClient(apiKey)

    params := &resend.SendEmailRequest{
        From:    "Acme <onboarding@resend.dev>",
        To:      []string{"delivered@resend.dev"},
        Html:    "<strong>hello world</strong>",
        Subject: "Hello from Golang",
        Cc:      []string{"cc@example.com"},
        Bcc:     []string{"bcc@example.com"},
        ReplyTo: "replyto@example.com",
    }

    sent, err := client.Emails.Send(params)
    if err != nil {
        fmt.Println(err.Error())
        return
    }
    fmt.Println(sent.Id)
}
```

----------------------------------------

TITLE: Schedule Email Delivery using Natural Language with Resend API
DESCRIPTION: This code demonstrates how to send an email using the Resend API, scheduling its delivery at a future time specified with natural language (e.g., 'in 1 min', 'tomorrow at 9am'). It utilizes the 'scheduledAt' parameter to define the delivery time without requiring complex date formatting. This method simplifies the process of sending time-sensitive or delayed communications.
SOURCE: https://resend.com/docs/dashboard/emails/schedule-email

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  scheduledAt: 'in 1 min',
});
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'hello world',
  'html' => '<p>it works!</p>',
  'scheduled_at' => 'in 1 min'
]);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

params: resend.Emails.SendParams = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "in 1 min"
}

resend.Emails.send(params)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "in 1 min"
}

Resend::Emails.send(params)
```

LANGUAGE: Go
CODE:
```
import (
	"fmt"

	"github.com/resend/resend-go/v2"
)

func main() {
  ctx := context.TODO()
  client := resend.NewClient("re_xxxxxxxxx")

  params := &resend.SendEmailRequest{
    From:        "Acme <onboarding@resend.dev>",
    To:          []string{"delivered@resend.dev"},
    Subject:     "hello world",
    Html:        "<p>it works!</p>",
    ScheduledAt: "in 1 min"
  }

  sent, err := client.Emails.SendWithContext(ctx, params)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Id)
}
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "hello world";

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html("<p>it works!</p>")
    .with_scheduled_at("in 1 min");

  let _email = resend.emails.send(email).await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("hello world")
                .html("<p>it works!</p>")
                .scheduledAt("in 1 min")
                .build();

        CreateEmailResponse data = resend.emails().send(params);
    }
}
```

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.EmailSendAsync( new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "delivered@resend.dev",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
    MomentSchedule = "in 1 min",
} );
Console.WriteLine( "Email Id={0}", resp.Content );
```

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/emails' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json' \
       -d '$'{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "html": "<p>it works!</p>",
    "scheduled_at": "in 1 min"
  }'
```

----------------------------------------

TITLE: Send Individual Transactional Email via Resend API
DESCRIPTION: This method allows sending individual transactional emails, which are essential, user-triggered communications that recipients cannot unsubscribe from. Examples include order confirmations and password resets.
SOURCE: https://resend.com/docs/knowledge-base/what-sending-feature-to-use

LANGUAGE: APIDOC
CODE:
```
Send Email API: /api-reference/emails/send-email
```

----------------------------------------

TITLE: Configure DMARC TXT Record for Domain
DESCRIPTION: This snippet provides the structure for a DMARC TXT record, which is added to a domain's DNS at `_dmarc.yourdomain.com`. It includes parameters for DMARC version (`v`), policy (`p`), and reporting URI for aggregate reports (`rua`). The policy (`p`) dictates how mail servers handle messages that fail DMARC, with options like `none` (monitoring), `quarantine` (send to spam), or `reject` (bounce). It's recommended to start with `p=none` to avoid accidental delivery issues.
SOURCE: https://resend.com/docs/dashboard/domains/dmarc

LANGUAGE: DNS Configuration
CODE:
```
v=DMARC1; p=none; rua=mailto:dmarcreports@yourdomain.com;
```

----------------------------------------

TITLE: Send Email using Resend Laravel Facade
DESCRIPTION: Illustrates sending an email directly via the `Resend` facade provided by the `resend-laravel` package. This approach offers a more direct interaction with the Resend API for email dispatch.
SOURCE: https://resend.com/docs/send-with-laravel

LANGUAGE: php
CODE:
```
<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Mail\OrderShipped;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Resend\Laravel\Facades\Resend;

class OrderShipmentController extends Controller
{
    /**
     * Ship the given order.
     */
    public function store(Request $request): RedirectResponse
    {
        $order = Order::findOrFail($request->order_id);

        // Ship the order...

        Resend::emails()->send([
            'from' => 'Acme <onboarding@resend.dev>',
            'to' => [$request->user()->email],
            'subject' => 'hello world',
            'html' => (new OrderShipped($order))->render(),
        ]);

        return redirect('/orders');
    }
}
```

----------------------------------------

TITLE: List Broadcasts using Resend API
DESCRIPTION: This snippet demonstrates how to retrieve a list of broadcasts using the Resend API across various programming languages. It initializes the Resend client with an API key and then calls the `broadcasts.list()` method. The cURL example shows a direct HTTP GET request to the API endpoint.
SOURCE: https://resend.com/docs/api-reference/broadcasts/list-broadcasts

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.broadcasts.list();
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let _broadcasts = resend.broadcasts.list().await?;

  Ok(())
}
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->broadcasts->list();
```

LANGUAGE: Java
CODE:
```
Resend resend = new Resend("re_xxxxxxxxx");

ListBroadcastsResponseSuccess data = resend.broadcasts().list();
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

resend.Broadcasts.list()
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

Resend::Broadcasts.list()
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")

broadcasts, _ := client.Broadcasts.List()
```

LANGUAGE: .NET
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.BroadcastListAsync();
Console.WriteLine( "Nr Broadcasts={0}", resp.Content.Count );
```

LANGUAGE: cURL
CODE:
```
curl -X GET 'https://api.resend.com/broadcasts' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json'
```

----------------------------------------

TITLE: Send HTML Email with Resend in Remix Resource Route
DESCRIPTION: This snippet demonstrates how to send an email with HTML content using the Resend Node.js SDK within a Remix resource route (`app/routes/send.ts`). It initializes the Resend client with an API key, sends an email with specified sender, recipient, subject, and HTML body, and handles potential errors by returning appropriate JSON responses.
SOURCE: https://resend.com/docs/send-with-remix

LANGUAGE: ts
CODE:
```
import { json } from '@remix-run/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const loader = async () => {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'Hello world',
    html: '<strong>It works!</strong>',
  });

  if (error) {
    return json({ error }, 400);
  }

  return json(data, 200);
};
```

----------------------------------------

TITLE: Send HTML Emails with Resend Java SDK
DESCRIPTION: This Java code demonstrates how to send an HTML-formatted email using the Resend Java SDK. It initializes the Resend client with an API key, constructs an email with sender, recipient, subject, and HTML content, and handles potential exceptions during the sending process.
SOURCE: https://resend.com/docs/send-with-java

LANGUAGE: java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("it works!")
                .html("<strong>hello world</strong>")
                .build();

         try {
            CreateEmailResponse data = resend.emails().send(params);
            System.out.println(data.getId());
        } catch (ResendException e) {
            e.printStackTrace();
        }
    }
}
```

----------------------------------------

TITLE: Send Batch Emails with Idempotency Key via cURL
DESCRIPTION: This cURL command demonstrates how to send multiple emails in a single batch request to the Resend API using an idempotency key. It includes the necessary headers for authorization and content type, and a JSON payload containing the details for two email messages. The idempotency key ensures that the request is processed only once.
SOURCE: https://resend.com/docs/dashboard/emails/idempotency-keys

LANGUAGE: cURL
CODE:
```
curl -X POST 'https://api.resend.com/emails/batch' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -H 'Idempotency-Key: team-quota/123456789' \
     -d '$[
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>"
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>"
  }
]'
```

----------------------------------------

TITLE: Resend API: Send Multiple Emails Request Body
DESCRIPTION: This JSON array demonstrates how to structure a request body to send multiple emails using the Resend API. Each object in the array represents an individual email, specifying 'from', 'to', 'subject', and 'html' content.
SOURCE: https://resend.com/docs/api-reference/emails/send-batch-emails

LANGUAGE: json
CODE:
```
[
  {
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>"
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>"
  }
]
```

----------------------------------------

TITLE: Send Email with Resend API using Deno Deploy
DESCRIPTION: This JavaScript code snippet demonstrates how to send an email using the Resend API within a Deno Deploy project. It sets up an HTTP server using Deno's `serve` function, makes a POST request to the Resend API endpoint with email details (from, to, subject, html), and returns the API response. A Resend API key is required for authorization.
SOURCE: https://resend.com/docs/send-with-deno-deploy

LANGUAGE: JavaScript
CODE:
```
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = 're_xxxxxxxxx';

const handler = async (_request: Request): Promise<Response> => {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'Acme <onboarding@resend.dev>',
            to: ['delivered@resend.dev'],
            subject: 'hello world',
            html: '<strong>it works!</strong>',
        })
    });

    if (res.ok) {
        const data = await res.json();

        return new Response(data, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};

serve(handler);
```

----------------------------------------

TITLE: Verify Resend Webhooks with Svix in JavaScript
DESCRIPTION: Demonstrates how to verify Resend webhook requests using the Svix library in JavaScript. It shows how to initialize the Webhook object with a secret and then use the verify method with the raw payload and headers. Emphasizes using the raw request body for cryptographic signature sensitivity.
SOURCE: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests

LANGUAGE: js
CODE:
```
import { Webhook } from 'svix';

const secret = process.env.WEBHOOK_SECRET;

// These were all sent from the server
const headers = {
  'svix-id': 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  'svix-timestamp': '1614265330',
  'svix-signature': 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
};
const payload = '{"test": 2432232314}';

const wh = new Webhook(secret);
// Throws on error, returns the verified content on success
wh.verify(payload, headers);
```

----------------------------------------

TITLE: Define React Email Template for Resend
DESCRIPTION: Creates a reusable React component (`EmailTemplate`) that accepts `firstName` as a prop, designed to be rendered as an email body by Resend.
SOURCE: https://resend.com/docs/send-with-hono

LANGUAGE: tsx
CODE:
```
import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
}) => (
  <div>
    <h1>Welcome, {firstName}!</h1>
  </div>
);
```

----------------------------------------

TITLE: Send Multiple Emails in a Batch with Idempotency Key
DESCRIPTION: This code snippet demonstrates how to send multiple emails efficiently using the Resend API's batch send functionality. It utilizes an `idempotencyKey` to ensure that if the request is retried, the batch operation is processed only once, preventing duplicate email sends. Examples are provided for various programming languages, showcasing the API call with a list of email objects and the idempotency key.
SOURCE: https://resend.com/docs/dashboard/emails/idempotency-keys

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.batch.send(
  [
    {
      from: 'Acme <onboarding@resend.dev>',
      to: ['foo@gmail.com'],
      subject: 'hello world',
      html: '<h1>it works!</h1>',
    },
    {
      from: 'Acme <onboarding@resend.dev>',
      to: ['bar@outlook.com'],
      subject: 'world hello',
      html: '<p>it works!</p>',
    },
  ],
  {
    idempotencyKey: 'team-quota/123456789',
  },
);
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->batch->send(
  [
    [
      'from' => 'Acme <onboarding@resend.dev>',
      'to' => ['foo@gmail.com'],
      'subject' => 'hello world',
      'html' => '<h1>it works!</h1>',
    ],
    [
      'from' => 'Acme <onboarding@resend.dev>',
      'to' => ['bar@outlook.com'],
      'subject' => 'world hello',
      'html' => '<p>it works!</p>',
    ]
  ],
  [
    'idempotency_key' => 'team-quota/123456789',
  ]
);
```

LANGUAGE: Python
CODE:
```
import resend
from typing import List

resend.api_key = "re_xxxxxxxxx"

params: List[resend.Emails.SendParams] = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
  }
]

options: resend.Batch.SendOptions = {
  "idempotency_key": "team-quota/123456789",
}

resend.Batch.send(params, options)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = 're_xxxxxxxxx'

params = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
  }
]

Resend::Batch.send(
  params,
  options: { idempotency_key: "team-quota/123456789" }
)
```

LANGUAGE: Go
CODE:
```
package examples

import (
	"context"
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

func main() {

  ctx := context.TODO()

  client := resend.NewClient("re_xxxxxxxxx")

  var batchEmails = []*resend.SendEmailRequest{
    {
      From:    "Acme <onboarding@resend.dev>",
      To:      []string{"foo@gmail.com"},
      Subject: "hello world",
      Html:    "<h1>it works!</h1>",
    },
    {
      From:    "Acme <onboarding@resend.dev>",
      To:      []string{"bar@outlook.com"},
      Subject: "world hello",
      Html:    "<p>it works!</p>",
    },
  }

  options := &resend.BatchSendEmailOptions{
    IdempotencyKey: "team-quota/123456789",
  }

  sent, err := client.Batch.SendWithOptions(ctx, batchEmails, options)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Data)
}
```

LANGUAGE: Rust
CODE:
```
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let emails = vec![
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["foo@gmail.com"],
      "hello world",
    )
    .with_html("<h1>it works!</h1>"),
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["bar@outlook.com"],
      "world hello",
    )
    .with_html("<p>it works!</p>"),
  ];

  let _emails = resend.batch.send_with_idempotency_key(emails, "team-quota/123456789").await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

import java.util.Arrays;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions firstEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("foo@gmail.com")
            .subject("hello world")
            .html("<h1>it works!</h1>")
            .build();

        CreateEmailOptions secondEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("bar@outlook.com")
            .subject("world hello")
            .html("<p>it works!</p>")
            .build();

        CreateBatchEmailsResponse data = resend.batch().send(
            Arrays.asList(firstEmail, secondEmail),
            Map.of("idempotency_key", "team-quota/123456789")
        );
    }
}
```

----------------------------------------

TITLE: Playwright E2E Test Mocking Resend API Response
DESCRIPTION: This Playwright test (`e2e/app.spec.ts`) mocks the response from the `/api/send` endpoint before navigation. It uses `page.route` to intercept the API call and fulfill it with a predefined JSON body, allowing testing of the application's flow without making actual calls to the Resend API or impacting sending quotas.
SOURCE: https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright

LANGUAGE: ts
CODE:
```
import { test, expect } from '@playwright/test';

test("mocks the response and doesn't call the Resend API", async ({ page }) => {
  // Sample response from Resend
  const body = JSON.stringify({
    data: {
      id: '621f3ecf-f4d2-453a-9f82-21332409b4d2',
    },
  });

  // Mock the api call before navigating
  await page.route('*/**/api/send', async (route) => {
    await route.fulfill({
      body,
      contentType: 'application/json',
      status: 200,
    });
  });
});
```

----------------------------------------

TITLE: Send HTML Email with Resend Node.js SDK
DESCRIPTION: This snippet demonstrates how to send an email with HTML content using the Resend Node.js SDK. It shows how to initialize the Resend client with an API key, specify sender and recipient, subject, and the HTML body, then handle the response or any errors.
SOURCE: https://resend.com/docs/send-with-nodejs

LANGUAGE: js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

(async function () {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'Hello World',
    html: '<strong>It works!</strong>',
  });

  if (error) {
    return console.error({ error });
  }

  console.log({ data });
})();
```

----------------------------------------

TITLE: Send HTML Email with Flask and Resend
DESCRIPTION: This Python code demonstrates how to send an HTML email using the Resend Python SDK within a Flask application. It sets up a Flask route that initializes the Resend API key from environment variables, constructs email parameters including sender, recipient, subject, and HTML content, and then sends the email via resend.Emails.send(), returning the API response as JSON.
SOURCE: https://resend.com/docs/send-with-flask

LANGUAGE: python
CODE:
```
import resend
import os
from flask import Flask, jsonify

resend.api_key = os.environ["RESEND_API_KEY"]

app = Flask(__name__)


@app.route("/")
def index():
    params: resend.Emails.SendParams = {
        "from": "Acme <onboarding@resend.dev>",
        "to": ["delivered@resend.dev"],
        "subject": "hello world",
        "html": "<strong>it works!</strong>",
    }

    r = resend.Emails.send(params)
    return jsonify(r)


if __name__ == "__main__":
    app.run()
```

----------------------------------------

TITLE: Send HTML Email using Resend PHP SDK
DESCRIPTION: This PHP code snippet demonstrates how to send a basic HTML email using the Resend SDK. It requires the SDK to be installed and an API key for authentication. The email is sent from a specified 'from' address to a 'to' address with a subject and HTML content.
SOURCE: https://resend.com/docs/send-with-php

LANGUAGE: php
CODE:
```
<?php

require __DIR__ . '/vendor/autoload.php';

$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'hello world',
  'html' => '<strong>it works!</strong>',
]);
```

----------------------------------------

TITLE: Send Email with Nodemailer and Resend SMTP
DESCRIPTION: This JavaScript example demonstrates how to configure Nodemailer to send an email using Resend's SMTP service. It sets up a transporter with the specified host, port, and authentication credentials (username 'resend' and your API key), then sends a basic HTML email from a verified sender to a recipient.
SOURCE: https://resend.com/docs/send-with-nodemailer-smtp

LANGUAGE: js
CODE:
```
import nodemailer from 'nodemailer';

async function main() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    secure: true,
    port: 465,
    auth: {
      user: 'resend',
      pass: 're_xxxxxxxxx',
    },
  });

  const info = await transporter.sendMail({
    from: 'onboarding@resend.dev',
    to: 'delivered@resend.dev',
    subject: 'Hello World',
    html: '<strong>It works!</strong>',
  });

  console.log('Message sent: %s', info.messageId);
}

main().catch(console.error);
```

----------------------------------------

TITLE: Delete an API Key using Resend SDKs and cURL
DESCRIPTION: This snippet demonstrates how to remove an existing API key using the Resend SDKs across various programming languages and a direct cURL command. It requires an API key ID as a path parameter and authenticates with a Resend API key. A successful deletion returns an HTTP 200 OK status.
SOURCE: https://resend.com/docs/api-reference/api-keys/delete-api-key

LANGUAGE: APIDOC
CODE:
```
Path Parameters:
  api_key_id:
    type: string
    required: true
    description: The API key ID.
```

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

resend.apiKeys.remove('b6d24b8e-af0b-4c3c-be0c-359bbd97381e');
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

$resend->apiKeys->remove('b6d24b8e-af0b-4c3c-be0c-359bbd97381e');
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"
resend.ApiKeys.remove(api_key_id="b6d24b8e-af0b-4c3c-be0c-359bbd97381e")
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

Resend::ApiKeys.remove "b6d24b8e-af0b-4c3c-be0c-359bbd97381e"
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")
client.ApiKeys.Remove("b6d24b8e-af0b-4c3c-be0c-359bbd97381e")
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  resend
    .api_keys
    .delete("b6d24b8e-af0b-4c3c-be0c-359bbd97381e")
    .await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        resend.apiKeys().remove("b6d24b8e-af0b-4c3c-be0c-359bbd97381e");
    }
}
```

LANGUAGE: C#
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

await resend.ApiKeyDeleteAsync( new Guid( "b6d24b8e-af0b-4c3c-be0c-359bbd97381e" ) );
```

LANGUAGE: cURL
CODE:
```
curl -X DELETE 'https://api.resend.com/api-keys/b6d24b8e-af0b-4c3c-be0c-359bbd97381e' \
       -H 'Authorization: Bearer re_xxxxxxxxx' \
       -H 'Content-Type: application/json'
```

LANGUAGE: APIDOC
CODE:
```
Response:
  HTTP Status: 200 OK
```

----------------------------------------

TITLE: Update Resend Contact by ID or Email
DESCRIPTION: Demonstrates how to update an existing contact in Resend, either by their unique ID or by their email address. Examples are provided for various programming languages, showing how to modify contact properties like the 'unsubscribed' status.
SOURCE: https://resend.com/docs/api-reference/contacts/update-contact

LANGUAGE: Node.js
CODE:
```
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

// Update by contact id
resend.contacts.update({
  id: 'e169aa45-1ecf-4183-9955-b1499d5701d3',
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
  unsubscribed: true,
});

// Update by contact email
resend.contacts.update({
  email: 'acme@example.com',
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
  unsubscribed: true,
});
```

LANGUAGE: PHP
CODE:
```
$resend = Resend::client('re_xxxxxxxxx');

// Update by contact id
$resend->contacts->update(
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
  id: 'e169aa45-1ecf-4183-9955-b1499d5701d3',
  [
    'unsubscribed' => true
  ]
);

// Update by contact email
$resend->contacts->update(
  audienceId: '78261eea-8f8b-4381-83c6-79fa7120f1cf',
  email: 'acme@example.com',
  [
    'unsubscribed' => true
  ]
);
```

LANGUAGE: Python
CODE:
```
import resend

resend.api_key = "re_xxxxxxxxx"

# Update by contact id
params: resend.Contacts.UpdateParams = {
  "id": "e169aa45-1ecf-4183-9955-b1499d5701d3",
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "unsubscribed": True,
}

resend.Contacts.update(params)

# Update by contact email
params: resend.Contacts.UpdateParams = {
  "email": "acme@example.com",
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "unsubscribed": True,
}

resend.Contacts.update(params)
```

LANGUAGE: Ruby
CODE:
```
require "resend"

Resend.api_key = "re_xxxxxxxxx"

# Update by contact id
params = {
  "id": "e169aa45-1ecf-4183-9955-b1499d5701d3",
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "unsubscribed": true,
}

Resend::Contacts.update(params)

# Update by contact email
params = {
  "email": "acme@example.com",
  "audience_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "unsubscribed": true,
}

Resend::Contacts.update(params)
```

LANGUAGE: Go
CODE:
```
import 	"github.com/resend/resend-go/v2"

client := resend.NewClient("re_xxxxxxxxx")

// Update by contact id
params := &resend.UpdateContactRequest{
  Id:           "e169aa45-1ecf-4183-9955-b1499d5701d3",
  AudienceId:   "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  Unsubscribed: true,
}

contact, err := client.Contacts.Update(params)

// Update by contact email
params = &resend.UpdateContactRequest{
  Email:        "acme@example.com",
  AudienceId:   "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  Unsubscribed: true,
}

contact, err := client.Contacts.Update(params)
```

LANGUAGE: Rust
CODE:
```
use resend_rs::{types::ContactChanges, Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let changes = ContactChanges::new().with_unsubscribed(true);

  // Update by contact id
  let _contact = resend
    .contacts
    .update_by_id(
      "e169aa45-1ecf-4183-9955-b1499d5701d3",
      "78261eea-8f8b-4381-83c6-79fa7120f1cf",
      changes.clone(),
    )
    .await?;

  // Update by contact email
  let _contact = resend
    .contacts
    .update_by_email(
      "acme@example.com",
      "78261eea-8f8b-4381-83c6-79fa7120f1cf",
      changes,
    )
    .await?;

  Ok(())
}
```

LANGUAGE: Java
CODE:
```
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        // Update by contact id
        UpdateContactOptions params = UpdateContactOptions.builder()
                .audienceId("78261eea-8f8b-4381-83c6-79fa7120f1cf")
                .id("e169aa45-1ecf-4183-9955-b1499d5701d3")
                .unsubscribed(true)
                .build();

        // Update by contact email
        UpdateContactOptions params = UpdateContactOptions.builder()
                .audienceId("78261eea-8f8b-4381-83c6-79fa7120f1cf")
                .email("acme@example.com")
                .unsubscribed(true)
                .build();

        UpdateContactResponseSuccess data = resend.contacts().update(params);
    }
}
```

LANGUAGE: .NET
CODE:
```
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

// By Id
await resend.ContactUpdateAsync(
    audienceId: new Guid( "78261eea-8f8b-4381-83c6-79fa7120f1cf" ),
    contactId: new Guid( "e169aa45-1ecf-4183-9955-b1499d5701d3" ),
    new ContactData()
    {
        FirstName = "Stevie",
        LastName = "Wozniaks",
        IsUnsubscribed = true,
    }
);

// By Email
await resend.ContactUpdateByEmailAsync(
```

----------------------------------------

TITLE: Send HTML Email with Resend .NET SDK
DESCRIPTION: Demonstrates how to send an HTML email using an injected IResend instance. It constructs an EmailMessage object, specifying sender, recipient, subject, and HTML content, then asynchronously sends the message.
SOURCE: https://resend.com/docs/send-with-dotnet

LANGUAGE: csharp
CODE:
```
using Resend;

public class FeatureImplementation
{
    private readonly IResend _resend;


    public FeatureImplementation( IResend resend )
    {
        _resend = resend;
    }


    public Task Execute()
    {
        var message = new EmailMessage();
        message.From = "you@example.com";
        message.To.Add( "user@gmail.com" );
        message.Subject = "hello world";
        message.HtmlBody = "<strong>it works!</strong>";

        await _resend.EmailSendAsync( message );
    }
}
```