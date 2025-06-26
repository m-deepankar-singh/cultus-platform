TITLE: Configure Celery Application with Upstash Redis
DESCRIPTION: Initializes a Celery application, loading environment variables for Upstash Redis connection details. It constructs the Redis connection string with SSL and defines a simple `add` task, demonstrating how to set up Celery to use Upstash Redis as both broker and backend.
SOURCE: https://upstash.com/docs/redis/integrations/celery.mdx

LANGUAGE: python
CODE:
```
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Configure Celery with Upstash Redis
UPSTASH_REDIS_HOST = os.getenv("UPSTASH_REDIS_HOST")
UPSTASH_REDIS_PORT = os.getenv("UPSTASH_REDIS_PORT")
UPSTASH_REDIS_PASSWORD = os.getenv("UPSTASH_REDIS_PASSWORD")

connection_link = f"rediss://:{UPSTASH_REDIS_PASSWORD}@{UPSTASH_REDIS_HOST}:{UPSTASH_REDIS_PORT}?ssl_cert_reqs=required"

celery_app = Celery("tasks", broker=connection_link, backend=connection_link)

@celery_app.task
def add(x, y):
    return x + y
```

----------------------------------------

TITLE: TypeScript Example: Using redis.touch
DESCRIPTION: An example demonstrating how to use the `redis.touch` method in TypeScript to update the last access time for multiple keys.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/generic/touch.mdx

LANGUAGE: ts
CODE:
```
await redis.touch("key1", "key2", "key3");
```

----------------------------------------

TITLE: Install and Import Upstash Ratelimit
DESCRIPTION: Instructions for installing the `@upstash/ratelimit` package using npm for Node.js projects and importing the `Ratelimit` class for Deno environments.
SOURCE: https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted.mdx

LANGUAGE: bash
CODE:
```
npm install @upstash/ratelimit
```

LANGUAGE: ts
CODE:
```
import { Ratelimit } from "https://cdn.skypack.dev/@upstash/ratelimit@latest";
```

----------------------------------------

TITLE: Redis HyperLogLog Commands
DESCRIPTION: Documents the HyperLogLog commands supported by Upstash Redis, used for estimating the cardinality of a set. These commands allow adding elements, counting unique elements, and merging multiple HyperLogLogs.
SOURCE: https://upstash.com/docs/redis/overall/rediscompatibility.mdx

LANGUAGE: APIDOC
CODE:
```
PFADD
PFCOUNT
PFMERGE
```

----------------------------------------

TITLE: ZREMRANGEBYLEX Command API Reference
DESCRIPTION: Detailed API documentation for the Redis ZREMRANGEBYLEX command, including its arguments, return values, and purpose.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/zset/zremrangebylex.mdx

LANGUAGE: APIDOC
CODE:
```
Command: ZREMRANGEBYLEX
Description: Remove all members in a sorted set between the given lexicographical range.

Arguments:
  key:
    Type: str
    Required: true
    Description: The key of the sorted set
  min:
    Type: str
    Required: true
    Description: The minimum lexicographical value to remove.
  max:
    Type: str
    Required: true
    Description: The maximum lexicographical value to remove.

Response:
  Type: int
  Required: true
  Description: The number of elements removed from the sorted set.
```

----------------------------------------

TITLE: HINCRBYFLOAT Python Usage Example
DESCRIPTION: Illustrates how to use the `hincrbyfloat` method with a Redis client in Python to increment a specific field within a hash by a floating-point value.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/hash/hincrbyfloat.mdx

LANGUAGE: Python
CODE:
```
redis.hset("myhash", "field1", 5.5)

assert redis.hincrbyfloat("myhash", "field1", 10.1) - 15.6 < 0.0001
```

----------------------------------------

TITLE: Create Lambda API Handler Directory
DESCRIPTION: Creates a new directory `lib/api` to house the Lambda function's source code and dependencies.
SOURCE: https://upstash.com/docs/redis/quickstarts/python-aws-lambda.mdx

LANGUAGE: shell
CODE:
```
mkdir lib/api
```

----------------------------------------

TITLE: Define Python Dependencies for Lambda Function
DESCRIPTION: Specifies the Python packages required by the Lambda function. The `upstash-redis` library is listed as a dependency.
SOURCE: https://upstash.com/docs/redis/quickstarts/python-aws-lambda.mdx

LANGUAGE: txt
CODE:
```
upstash-redis
```

----------------------------------------

TITLE: EXPIREAT Command API Reference
DESCRIPTION: Detailed API documentation for the EXPIREAT command, outlining its required arguments, their types, and the structure of the expected response.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/generic/expireat.mdx

LANGUAGE: APIDOC
CODE:
```
EXPIREAT Command:
  Arguments:
    key:
      type: string
      required: true
      description: The key to set the timeout on.
    unix:
      type: integer
      description: A unix timestamp in seconds at which point the key will expire.
  Response:
    type: integer
    required: true
    description: '1' if the timeout was set, '0' otherwise
```

----------------------------------------

TITLE: GETBIT Command API Reference
DESCRIPTION: Comprehensive API documentation for the GETBIT command, outlining its required parameters (key and offset) and the expected integer response, representing the bit value at the specified offset.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/bitmap/getbit.mdx

LANGUAGE: APIDOC
CODE:
```
GETBIT Command:
  Arguments:
    key: string (required)
      The key of the bitset.
    offset: integer (required)
      Specify the offset at which to get the bit.
  Response:
    integer (required)
      The bit value stored at offset.
```

----------------------------------------

TITLE: Initialize AWS CDK Project
DESCRIPTION: Initializes a new AWS CDK application within the current directory, setting up the basic project structure with TypeScript as the chosen language.
SOURCE: https://upstash.com/docs/redis/tutorials/pythonapi.mdx

LANGUAGE: shell
CODE:
```
cdk init app --language typescript
```

----------------------------------------

TITLE: JSON.MGET API Reference
DESCRIPTION: Detailed API documentation for the JSON.MGET command, outlining its required arguments and the structure of the returned response.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/json/mget.mdx

LANGUAGE: APIDOC
CODE:
```
Arguments:
  keys:
    type: List[str]
    required: true
    description: One or more keys of JSON documents.
  path:
    type: str
    required: true
    description: The path to get from the JSON document.

Response:
  type: List[List[TValue]]
  required: true
  description: The values at the specified path or null if the path does not exist.
```

----------------------------------------

TITLE: Run Node.js Application in Development Mode
DESCRIPTION: This bash command executes the `dev` script defined in `package.json`, starting the Node.js application in debug mode. This allows for local testing and debugging of the application.
SOURCE: https://upstash.com/docs/redis/quickstarts/koyeb.mdx

LANGUAGE: bash
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Phoenix Home Page HTML Template
DESCRIPTION: This HTML template defines the structure for the Phoenix application's home page. It includes a form for user input (location), displays flash messages, and conditionally renders weather information based on parameters passed from the controller. It's designed to show dynamic content.
SOURCE: https://upstash.com/docs/redis/quickstarts/elixir.mdx

LANGUAGE: HTML
CODE:
```
<.flash_group flash={@flash} />
<div class="container mx-auto px-4">
  <h1 class="text-3xl font-bold mb-4">Redix Demo</h1>

  <form action="/" method="get" class="w-full flex items-center mb-4">
    <input type="text" name="text" placeholder="Location" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500">
    <button type="submit" class="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Submit</button>
  </form>

  <%= if @text do %>
    <%= @text %>
  <% end %>

  <%= if @weather do %>
    <div class=" text-lg bg-gray-100 rounded-lg p-4">

      <%= if @location do %>
        <strong>
          Location:
        </strong>
        <%= @location %>
      <% end %>

      <p>
        <strong>
          Weather:
        </strong>
        <%= @weather %> °C
      </p>

    </div>
  <% end %>
</div>
```

----------------------------------------

TITLE: Python Example for HPTTL Usage
DESCRIPTION: Illustrates how to set a hash field, apply a millisecond expiration to it, and then retrieve its remaining TTL using the `hpttl` command in Python.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/hash/hpttl.mdx

LANGUAGE: python
CODE:
```
redis.hset(hash_name, field, value)
redis.hpexpire(hash_name, field, 1000)

assert redis.hpttl(hash_name, field) == [950]
```

----------------------------------------

TITLE: Slackbot with AWS Chalice and Upstash Redis
DESCRIPTION: Guides on building a Slackbot using AWS Chalice and Upstash Redis. This example demonstrates creating serverless applications that interact with Slack and Redis.
SOURCE: https://upstash.com/docs/redis/examples.mdx

LANGUAGE: jsx
CODE:
```
<TagFilters.Item
    externalLink
    type="Article"
    tags={["AWS Chalice", "Slackbot"]
    url="https://blog.upstash.com/chalice-event-reminder-slackbot">
    Slackbot with AWS Chalice and Upstash Redis
  </TagFilters.Item>
```

----------------------------------------

TITLE: Fullstack Serverless App with Flutter and Upstash Redis
DESCRIPTION: Develop a fullstack serverless application using Flutter, Serverless Framework, and Upstash Redis. This tutorial, part 1, covers the initial setup and architecture.
SOURCE: https://upstash.com/docs/redis/examples.mdx

LANGUAGE: Flutter
CODE:
```
// This is a placeholder for Flutter code.
```

----------------------------------------

TITLE: Store Weather Data in Redis Cache (Elixir)
DESCRIPTION: Implements the `cache_weather_response` function, which is responsible for storing weather data in Upstash Redis. It uses the Redix `SET` command with an expiration time (EX) of 8 hours (28800 seconds) to ensure the cached data remains fresh. The function returns `:ok` on successful caching or an error tuple if the operation fails.
SOURCE: https://upstash.com/docs/redis/quickstarts/elixir.mdx

LANGUAGE: Elixir
CODE:
```
  defp cache_weather_response(location, weather_data) do
    case Redix.command(:redix, ["SET", "weather:#{location}", weather_data, "EX", 8 * 60 * 60]) do
      {:ok, _} ->
        :ok
      {:error, _reason} ->
        {:error, "Failed to cache weather data."}
    end
  end
```

----------------------------------------

TITLE: SDIFFSTORE Command API Reference
DESCRIPTION: Detailed documentation for the SDIFFSTORE command, outlining its required arguments and the structure of its response.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/set/sdiffstore.mdx

LANGUAGE: APIDOC
CODE:
```
SDIFFSTORE Command:
  Description: Write the difference between sets to a new set

  Arguments:
    destination:
      Type: string
      Required: true
      Description: The key of the set to store the resulting set in.
    keys:
      Type: ...string[]
      Required: true
      Description: The keys of the sets to perform the difference operation on.

  Response:
    Type: TValue[]
    Required: true
    Description: The members of the resulting set.
```

----------------------------------------

TITLE: Copy .env file for Supabase Function
DESCRIPTION: Copies the example environment file to the active .env file for the Supabase function, preparing it for configuration with Redis credentials.
SOURCE: https://upstash.com/docs/redis/quickstarts/supabase.mdx

LANGUAGE: shell
CODE:
```
cp supabase/functions/upstash-redis-counter/.env.example supabase/functions/upstash-redis-counter/.env
```

----------------------------------------

TITLE: Test Leaderboard API: Retrieve Leaderboard via cURL
DESCRIPTION: cURL command to send a GET request to the local Cloudflare Worker endpoint, retrieving the current leaderboard and measuring request latency.
SOURCE: https://upstash.com/docs/redis/tutorials/edge_leaderboard.mdx

LANGUAGE: shell
CODE:
```
curl -w '\n Latency: %{time_total}s\n' http://127.0.0.1:8787
```

----------------------------------------

TITLE: Python ZADD Command Usage Examples
DESCRIPTION: Illustrative Python examples demonstrating how to use the ZADD command with various options like adding new elements, preventing additions with 'nx', preventing updates with 'xx', and conditional updates with 'gt'.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/zset/zadd.mdx

LANGUAGE: python
CODE:
```
# Add three elements
assert redis.zadd("myset", {
    "one": 1,
    "two": 2,
    "three": 3
}) == 3

# No element is added since "one" and "two" already exist
assert redis.zadd("myset", {
    "one": 1,
    "two": 2
}, nx=True) == 0

# New element is not added since it does not exist
assert redis.zadd("myset", {
    "new-element": 1
}, xx=True) == 0

# Only "three" is updated since new score was greater
assert redis.zadd("myset", {
    "three": 10, "two": 0
}, gt=True) == 1

# Only "three" is updated since new score was greater
assert redis.zadd("myset", {
    "three": 10,
    "two": 0
}, gt=True) == 1
```

----------------------------------------

TITLE: Express Application with Redis Session Store
DESCRIPTION: This JavaScript code defines an Express.js application that utilizes 'connect-redis' to persist session data in a Redis database. It initializes a Redis client, configures the session middleware with a Redis store, and sets up routes to demonstrate session-based view counting for different paths.
SOURCE: https://upstash.com/docs/redis/tutorials/express_session.mdx

LANGUAGE: javascript
CODE:
```
var express = require("express");
var parseurl = require("parseurl");
var session = require("express-session");
const redis = require("redis");

var RedisStore = require("connect-redis")(session);
var client = redis.createClient({
  // REPLACE HERE
});

var app = express();

app.use(
  session({
    store: new RedisStore({ client: client }),
    secret: "forest squirrel",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(function (req, res, next) {
  if (!req.session.views) {
    req.session.views = {};
  }

  // get the url pathname
  var pathname = parseurl(req).pathname;

  // count the views
  req.session.views[pathname] = (req.session.views[pathname] || 0) + 1;
  next();
});

app.get("/foo", function (req, res, next) {
  res.send("you viewed this page " + req.session.views["/foo"] + " times");
});

app.get("/bar", function (req, res, next) {
  res.send("you viewed this page " + req.session.views["/bar"] + " times");
});

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
```

----------------------------------------

TITLE: ZRANGE Command API Reference
DESCRIPTION: Detailed API documentation for the ZRANGE command, including its arguments, their types, descriptions, and the structure of the command's response.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/zset/zrange.mdx

LANGUAGE: APIDOC
CODE:
```
ZRANGE Command:
  Description: Returns the specified range of elements in the sorted set stored at key.

  Arguments:
    key: string (required)
      Description: The key to get.
    min: number | string (required)
      Description: The lower bound of the range.
    max: number | string (required)
      Description: The upper bound of the range.
    options: object (optional)
      Description: Additional options for the ZRANGE command.
      Properties:
        withScores: boolean
          Description: Whether to include the scores in the response.
        rev: boolean
          Description: Whether to reverse the order of the response.
        byScore: boolean
          Description: Whether to use the score as the sort order.
        byLex: boolean
          Description: Whether to use lexicographical ordering.
        offset: number
          Description: The offset to start from.
        count: number
          Description: The number of elements to return.

  Response:
    Type: TMember[]
    Description: The values in the specified range.
      If `withScores` is true, the response will have interleaved members and scores: `[TMember, number, TMember, number, ...]`
```

----------------------------------------

TITLE: Backend API: List Features (Next.js, ioredis)
DESCRIPTION: This Next.js API endpoint (`/api/list`) retrieves feature requests from an Upstash Redis Sorted Set named 'roadmap'. It fetches features ordered by their vote scores and returns them as a JSON array. The API uses `ioredis` for Redis connectivity.
SOURCE: https://upstash.com/docs/redis/tutorials/roadmapvotingapp.mdx

LANGUAGE: javascript
CODE:
```
import { fixUrl } from "./utils";
import Redis from "ioredis";

module.exports = async (req, res) => {
  let redis = new Redis(fixUrl(process.env.REDIS_URL));
  let n = await redis.zrevrange("roadmap", 0, 100, "WITHSCORES");
  let result = [];
  for (let i = 0; i < n.length - 1; i += 2) {
    let item = {};
    item["title"] = n[i];
    item["score"] = n[i + 1];
    result.push(item);
  }

  redis.quit();

  res.json({
    body: result,
  });
};
```

----------------------------------------

TITLE: Python Example for JSON.DEL
DESCRIPTION: Demonstrates how to use the `redis.json.del` method in Python to delete a specific path within a JSON document stored in Redis.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/json/del.mdx

LANGUAGE: py
CODE:
```
redis.json.del("key", "$.path.to.value")
```

----------------------------------------

TITLE: SREM Command API Reference
DESCRIPTION: Defines the arguments and response structure for the Redis SREM command, used to remove members from a set.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/set/srem.mdx

LANGUAGE: APIDOC
CODE:
```
SREM Command:
  Arguments:
    key: str (required)
      Description: The key of the set to remove the member from.
    members: List[str] (required)
      Description: One or more members to remove from the set.
  Response:
    Type: int (required)
      Description: How many members were removed
```

----------------------------------------

TITLE: RENAME Command API Specification
DESCRIPTION: Defines the RENAME command's arguments and its expected return value. It requires a source key and a destination key, both as strings, and returns 'OK' upon successful execution.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/generic/rename.mdx

LANGUAGE: APIDOC
CODE:
```
RENAME Command:
  Arguments:
    source: string (required) - The original key.
    destination: string (required) - A new name for the key.
  Response:
    string (required) - `OK`
```

----------------------------------------

TITLE: Initialize Node.js Project and Install ioredis
DESCRIPTION: Commands to initialize a new Node.js project using 'npm init' and install the 'ioredis' client library, which is used for interacting with Redis.
SOURCE: https://upstash.com/docs/redis/tutorials/auto_complete_with_serverless_redis.mdx

LANGUAGE: text
CODE:
```
npm init

npm install ioredis
```

----------------------------------------

TITLE: JSON.ARRLEN Command API Reference
DESCRIPTION: Detailed API documentation for the `JSON.ARRLEN` command, outlining its required arguments, their types, default values, and the expected response structure.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/json/arrlen.mdx

LANGUAGE: APIDOC
CODE:
```
JSON.ARRLEN:
  description: Report the length of the JSON array at `path` in `key`.
  arguments:
    key:
      type: string
      required: true
      description: The key of the json entry.
    path:
      type: string
      default: $
      description: The path of the array.
  response:
    type: integer[]
    required: true
    description: The length of the array.
```

----------------------------------------

TITLE: Express Session with Serverless Redis
DESCRIPTION: Manage user sessions in Express.js applications using Upstash Redis. This tutorial is suitable for Node.js environments and focuses on session management.
SOURCE: https://upstash.com/docs/redis/examples.mdx

LANGUAGE: Node.js
CODE:
```
console.log('This is a placeholder for Node.js code related to Express Session.');
```

----------------------------------------

TITLE: XRANGE Command
DESCRIPTION: Return a range of elements in a stream, with IDs matching the specified IDs interval.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/overview.mdx

LANGUAGE: Redis
CODE:
```
XRANGE
```

----------------------------------------

TITLE: Connect to Upstash Redis using jedis (Java)
DESCRIPTION: This example demonstrates connecting to an Upstash Redis database using the `jedis` library in Java. It creates a Jedis instance with the endpoint, port, and SSL enabled, authenticates with the password, and then sets and retrieves a string value.
SOURCE: https://upstash.com/docs/redis/howto/connectclient.mdx

LANGUAGE: java
CODE:
```
Jedis jedis = new Jedis("YOUR_ENDPOINT", "YOUR_PORT", true);
jedis.auth("YOUR_PASSWORD");
jedis.set("foo", "bar");
String value = jedis.get("foo");
System.out.println(value);
```

----------------------------------------

TITLE: TypeScript Example for JSON.DEL
DESCRIPTION: Illustrates how to use the `redis.json.del` method in TypeScript to delete a specific path within a JSON document stored in Upstash Redis.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/json/del.mdx

LANGUAGE: ts
CODE:
```
await redis.json.del("key", "$.path.to.value");
```

----------------------------------------

TITLE: Add Jedis Dependency to pom.xml
DESCRIPTION: Adds the Jedis client library as a dependency to the Maven 'pom.xml' file. Jedis is used for interacting with Redis from Java applications.
SOURCE: https://upstash.com/docs/redis/tutorials/serverless_java_redis.mdx

LANGUAGE: xml
CODE:
```
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>3.6.0</version>
</dependency>
```

----------------------------------------

TITLE: Invoke Serverless Function Locally
DESCRIPTION: Executes the 'query' function locally using the Serverless Framework, allowing for testing without deploying to AWS. It simulates an API call with specific query parameters.
SOURCE: https://upstash.com/docs/redis/tutorials/auto_complete_with_serverless_redis.mdx

LANGUAGE: shell
CODE:
```
serverless invoke local -f query -d '{ "queryStringParameters": {"term":"ca"}}'
```

----------------------------------------

TITLE: SRANDMEMBER API Reference
DESCRIPTION: Detailed documentation for the SRANDMEMBER command, outlining its arguments, their types, default values, and the structure of the command's response.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/set/srandmember.mdx

LANGUAGE: APIDOC
CODE:
```
SRANDMEMBER:
  Description: Returns one or more random members from a set.
  Arguments:
    key:
      Type: string
      Required: true
      Description: The key of the set.
    count:
      Type: number
      Default: 1
      Description: How many members to return.
  Response:
    Type: TMember | TMember[]
    Required: true
    Description: The random member. If `count` is specified, an array of members is returned.
```

----------------------------------------

TITLE: Redis SET Command API Reference
DESCRIPTION: Detailed API documentation for the Redis SET command, outlining all supported arguments, their types, descriptions, and the command's expected response.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/string/set.mdx

LANGUAGE: APIDOC
CODE:
```
Command: SET
Description: Set a key to hold a string value.

Arguments:
  key (str, required): The key
  value (TValue, required): The value, if this is not a string, we will use `JSON.stringify` to convert it
  get (bool, optional): Instead of returning `True`, this will cause the command to return the old value stored at key, or `None` when key did not exist.
  ex (int, optional): Sets an expiration (in seconds) to the key.
  px (int, optional): Sets an expiration (in milliseconds) to the key.
  exat (int, optional): Set the UNIX timestamp in seconds until the key expires.
  pxat (int, optional): Set the UNIX timestamp in milliseconds until the key expires.
  keepttl (bool, optional): Keeps the old expiration if the key already exists.
  nx (bool, optional): Only set the key if it does not already exist.
  xx (bool, optional): Only set the key if it already exists.

Response:
  (bool/TValue): `True` if the key was set. If `get` is specified, this will return the old value stored at key, or `None` when the key did not exist.
```

----------------------------------------

TITLE: TypeScript Example for SMEMBERS Command Usage
DESCRIPTION: Illustrates how to interact with the `SMEMBERS` command using an Upstash Redis client in TypeScript. It shows adding elements to a set and then fetching all members.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/set/smembers.mdx

LANGUAGE: ts
CODE:
```
await redis.sadd("set", "a", "b", "c"); 
const members =  await redis.smembers("set");
console.log(members); // ["a", "b", "c"]
```

----------------------------------------

TITLE: Import Upstash Redis with Fetch Polyfill for Node.js v17-
DESCRIPTION: Provides the alternative import path for Upstash Redis when running on Node.js v17 and earlier, where the `fetch` API is not natively supported. This import ensures compatibility by including a polyfill, which is useful for bare Node.js environments.
SOURCE: https://upstash.com/docs/redis/sdks/ts/deployment.mdx

LANGUAGE: ts
CODE:
```
import { Redis } from "@upstash/redis/with-fetch";
```

----------------------------------------

TITLE: Python Example for DECRBY Command
DESCRIPTION: Illustrates how to use the DECRBY command with a Python Redis client. This example sets an initial value for a key and then decrements it, asserting the final result.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/string/decrby.mdx

LANGUAGE: Python
CODE:
```
redis.set("key", 6)

assert redis.decrby("key", 4) == 2
```

----------------------------------------

TITLE: MGET Command
DESCRIPTION: Get the values of all the given keys.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/overview.mdx

LANGUAGE: Redis
CODE:
```
MGET
```

----------------------------------------

TITLE: TypeScript Example for JSON.ARRINSERT
DESCRIPTION: This TypeScript code snippet demonstrates how to use the `redis.json.arrinsert` method to insert multiple values into a JSON array at a specified path and index within a Redis key. It shows how to capture the returned array length.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/json/arrinsert.mdx

LANGUAGE: ts
CODE:
```
const length = await redis.json.arrinsert("key", "$.path.to.array", 2, "a", "b");
```

----------------------------------------

TITLE: Execute Redis SET Command via cURL with Authorization Header
DESCRIPTION: Demonstrates how to send a `SET` command to the Upstash REST API using `curl`. It includes the `Authorization: Bearer $TOKEN` header for authentication.
SOURCE: https://upstash.com/docs/redis/features/restapi.mdx

LANGUAGE: shell
CODE:
```
curl https://us1-merry-cat-32748.upstash.io/set/foo/bar \
 -H "Authorization: Bearer 2553feg6a2d9842h2a0gcdb5f8efe9934"
```

----------------------------------------

TITLE: JSON.CLEAR Command API Reference
DESCRIPTION: Detailed API documentation for the `JSON.CLEAR` command, including its parameters and expected response. This command is used to clear container values (arrays/objects) and set numeric values to 0 within a JSON document stored in Redis.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/json/clear.mdx

LANGUAGE: APIDOC
CODE:
```
JSON.CLEAR:
  Arguments:
    key:
      type: str
      required: true
      description: The key of the json entry.
    path:
      type: str
      default: $
      description: The path to clear
  Response:
    type: List[int]
    required: true
    description: How many keys cleared from the objects.
```

----------------------------------------

TITLE: Session Management on Google Cloud Run with Serverless Redis
DESCRIPTION: Details session management on Google Cloud Run using Upstash Redis. This example focuses on implementing robust session handling for applications deployed on Google Cloud.
SOURCE: https://upstash.com/docs/redis/examples.mdx

LANGUAGE: jsx
CODE:
```
<TagFilters.Item
    externalLink
    type="Article"
    tags={["Google Cloud"]
    url="https://docs.upstash.com/redis/tutorials/cloud_run_sessions">
    Session Management on Google Cloud Run with Serverless Redis
  </TagFilters.Item>
```

----------------------------------------

TITLE: Next.js with Redis
DESCRIPTION: Integrate Upstash Redis into your Next.js applications. This tutorial covers common use cases and best practices for using Redis with Next.js.
SOURCE: https://upstash.com/docs/redis/examples.mdx

LANGUAGE: Next.js
CODE:
```
console.log('This is a placeholder for Next.js code.');
```

----------------------------------------

TITLE: TypeScript Example for LREM Usage
DESCRIPTION: A TypeScript code example demonstrating how to use the LREM command with an Upstash Redis client. It shows pushing multiple elements to a list and then removing specific occurrences of an element, logging the count of removed items.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/list/lrem.mdx

LANGUAGE: ts
CODE:
```
await redis.lpush("key", "a", "a", "b", "b", "c");
const removed = await redis.lrem("key", 4, "b");
console.log(removed) // 2
```

----------------------------------------

TITLE: Configure Upstash Redis Environment Variables
DESCRIPTION: These commands export the Upstash Redis REST URL and Token to your environment, which are required for the application to connect to the Redis database. Alternatively, `python-dotenv` can be used to load variables from a `.env` file.
SOURCE: https://upstash.com/docs/redis/tutorials/python_rate_limiting.mdx

LANGUAGE: shell
CODE:
```
export UPSTASH_REDIS_REST_URL=<YOUR_URL>
export UPSTASH_REDIS_REST_TOKEN=<YOUR_TOKEN>
```

----------------------------------------

TITLE: Run Express Application
DESCRIPTION: Executes the 'index.js' file using Node.js to start the Express server, making the application accessible on the configured port (e.g., 3000).
SOURCE: https://upstash.com/docs/redis/tutorials/express_session.mdx

LANGUAGE: bash
CODE:
```
node index.js
```

----------------------------------------

TITLE: Configure Upstash MCP SSE Server with Proxy
DESCRIPTION: JSON configuration for setting up the Upstash MCP server in `sse` mode, designed for server deployments. This setup uses a `supergateway` proxy to bridge the connection, acting as a `stdio` server locally for clients like Claude, Cursor, and Copilot. Ensure you replace placeholders with your Upstash email and API key.
SOURCE: https://upstash.com/docs/redis/integrations/mcp.mdx

LANGUAGE: json
CODE:
```
{
  "mcpServers": {
    "upstash": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://mcp.upstash.io/sse",
        "--oauth2Bearer",
        "<UPSTASH_EMAIL>:<UPSTASH_API_KEY>"
      ]
    }
  }
}
```

LANGUAGE: json
CODE:
```
{
  "servers": {
    "upstash": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://mcp.upstash.io/sse",
        "--oauth2Bearer",
        "<UPSTASH_EMAIL>:<UPSTASH_API_KEY>"
      ]
    }
  }
}
```

----------------------------------------

TITLE: API Documentation for JSON.STRAPPEND Command
DESCRIPTION: Comprehensive documentation for the `JSON.STRAPPEND` command, outlining its required parameters, their types, and the expected response structure.
SOURCE: https://upstash.com/docs/redis/sdks/py/commands/json/strappend.mdx

LANGUAGE: APIDOC
CODE:
```
JSON.STRAPPEND:
  description: Append the json-string values to the string at path.
  Arguments:
    key:
      type: str
      required: true
      description: The key of the json entry.
    path:
      type: str
      required: true
      description: The path of the string.
    value:
      type: str
      required: true
      description: The value to append to the existing string.
  Response:
    type: List[int]
    required: true
    description: The length of the string after the appending.
```

----------------------------------------

TITLE: Authenticate REST API with URL Parameter
DESCRIPTION: Shows an alternative method to authenticate an Upstash Redis REST API request by passing the token as a '_token' query parameter in the URL. This method might be used in scenarios where HTTP headers are less convenient, but care should be taken as tokens can appear in server logs.
SOURCE: https://upstash.com/docs/redis/features/restapi.mdx

LANGUAGE: shell
CODE:
```
curl -X POST https://us1-merry-cat-32748.upstash.io/info?_token=2553feg6a2d9842h2a0gcdb5f8efe9934
```

----------------------------------------

TITLE: ioredis TLS-disabled Redis Connection URL Format
DESCRIPTION: This snippet demonstrates the correct URL format for connecting to a Redis instance with ioredis when TLS (SSL) encryption is disabled. It shows the 'redis://' scheme and the necessity of a colon before the password.
SOURCE: https://upstash.com/docs/redis/troubleshooting/no_auth.mdx

LANGUAGE: URL
CODE:
```
redis://:YOUR_PASSWORD@YOUR_ENDPOINT:YOUR_PORT
```

----------------------------------------

TITLE: ZINCRBY Command API Reference
DESCRIPTION: Detailed API documentation for the ZINCRBY command, outlining its required arguments (key, increment, member) and the integer response representing the new score.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/zset/zincrby.mdx

LANGUAGE: APIDOC
CODE:
```
ZINCRBY:
  Arguments:
    key:
      type: string
      required: true
      description: The key of the sorted set.
    increment:
      type: integer
      required: true
      description: The increment to add to the score.
    member:
      type: TMember
      required: true
      description: The member to increment.
  Response:
    type: integer
    required: true
    description: The new score of `member` after the increment operation.
```

----------------------------------------

TITLE: Install and Initialize Cloudflare Workers Project
DESCRIPTION: Commands to install Wrangler CLI, authenticate with Cloudflare, and generate a new Cloudflare Workers project.
SOURCE: https://upstash.com/docs/redis/tutorials/edge_leaderboard.mdx

LANGUAGE: shell
CODE:
```
npm install -g @cloudflare/wrangler
```

LANGUAGE: shell
CODE:
```
wrangler login
```

LANGUAGE: shell
CODE:
```
wrangler generate edge-leaderboard
```

----------------------------------------

TITLE: Install Go Redis Client Library
DESCRIPTION: Installs the `go-redis/redis/v8` client library, which is the sole dependency for interacting with Redis from the Go application. This command fetches the package and adds it to your Go module dependencies.
SOURCE: https://upstash.com/docs/redis/tutorials/goapi.mdx

LANGUAGE: Shell
CODE:
```
go get github.com/go-redis/redis/v8
```

----------------------------------------

TITLE: DECR Command API Reference
DESCRIPTION: API documentation for the Redis DECR command, detailing its arguments and expected response.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/string/decr.mdx

LANGUAGE: APIDOC
CODE:
```
Command: DECR
Description: Decrement the integer value of a key by one. If a key does not exist, it is initialized as 0 before performing the operation. An error is returned if the key contains a value of the wrong type or contains a string that can not be represented as integer.
Arguments:
  key:
    Type: string
    Required: true
    Description: The key to decrement.
Response:
  Type: integer
  Required: true
  Description: The value at the key after the decrementing.
```

----------------------------------------

TITLE: Configure Upstash Redis Environment Variables (.env)
DESCRIPTION: This snippet illustrates the content of a `.env` file, which is used by the `python-dotenv` library to load Redis connection credentials, specifically `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, into the application's environment at runtime.
SOURCE: https://upstash.com/docs/redis/tutorials/python_url_shortener.mdx

LANGUAGE: text
CODE:
```
UPSTASH_REDIS_REST_URL=<YOUR_URL>
UPSTASH_REDIS_REST_TOKEN=<YOUR_TOKEN>
```

----------------------------------------

TITLE: SCRIPT EXISTS Command API Documentation
DESCRIPTION: Detailed API documentation for the SCRIPT EXISTS command, including its purpose, required arguments, and expected response format.
SOURCE: https://upstash.com/docs/redis/sdks/ts/commands/scripts/script_exists.mdx

LANGUAGE: APIDOC
CODE:
```
SCRIPT EXISTS:
  Description: Check if scripts exist in the script cache.
  Arguments:
    hashes:
      Type: string[]
      Required: true
      Description: The sha1 of the scripts to check.
  Response:
    Type: number[]
    Required: true
    Description: An array of numbers. 1 if the script exists, otherwise 0.
```