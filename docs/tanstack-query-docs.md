TITLE: Implementing Optimistic Updates with Rollback via Cache (TSX)
DESCRIPTION: This comprehensive snippet demonstrates an optimistic update strategy using React Query's `onMutate` handler for cache manipulation and rollback. It cancels pending queries, snapshots the current cache data, optimistically updates the 'todos' list, and provides a `previousTodos` context for `onError` to revert the cache if the mutation fails. Finally, `onSettled` ensures query invalidation.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/optimistic-updates.md#_snippet_4

LANGUAGE: tsx
CODE:
```
const queryClient = useQueryClient()

useMutation({
  mutationFn: updateTodo,
  // When mutate is called:
  onMutate: async (newTodo) => {
    // Cancel any outgoing refetches
    // (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    // Snapshot the previous value
    const previousTodos = queryClient.getQueryData(['todos'])

    // Optimistically update to the new value
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo])

    // Return a context object with the snapshotted value
    return { previousTodos }
  },
  // If the mutation fails,
  // use the context returned from onMutate to roll back
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos)
  },
  // Always refetch after error or success:
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})
```

----------------------------------------

TITLE: Defining Simple Query Keys in TanStack Query
DESCRIPTION: Demonstrates the simplest form of query keys, using an array of constant values. This pattern is suitable for generic list resources or non-hierarchical data, providing a basic identifier for cached data.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/query-keys.md#_snippet_0

LANGUAGE: tsx
CODE:
```
// A list of todos
useQuery({ queryKey: ['todos'], ... })

// Something else, whatever!
useQuery({ queryKey: ['something', 'special'], ... })
```

----------------------------------------

TITLE: Persisting and Resuming TanStack Query Mutations with Hydration
DESCRIPTION: This snippet demonstrates how to define, persist, dehydrate, hydrate, and resume mutations in TanStack Query. It includes `setMutationDefaults` for optimistic updates, error handling, and the use of `dehydrate` and `hydrate` functions to save and restore mutation states, enabling offline capabilities.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/mutations.md#_snippet_9

LANGUAGE: tsx
CODE:
```
const queryClient = new QueryClient()

// Define the "addTodo" mutation
queryClient.setMutationDefaults(['addTodo'], {
  mutationFn: addTodo,
  onMutate: async (variables) => {
    // Cancel current queries for the todos list
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    // Create optimistic todo
    const optimisticTodo = { id: uuid(), title: variables.title }

    // Add optimistic todo to todos list
    queryClient.setQueryData(['todos'], (old) => [...old, optimisticTodo])

    // Return context with the optimistic todo
    return { optimisticTodo }
  },
  onSuccess: (result, variables, context) => {
    // Replace optimistic todo in the todos list with the result
    queryClient.setQueryData(['todos'], (old) =>
      old.map((todo) =>
        todo.id === context.optimisticTodo.id ? result : todo,
      ),
    )
  },
  onError: (error, variables, context) => {
    // Remove optimistic todo from the todos list
    queryClient.setQueryData(['todos'], (old) =>
      old.filter((todo) => todo.id !== context.optimisticTodo.id),
    )
  },
  retry: 3,
})

// Start mutation in some component:
const mutation = useMutation({ mutationKey: ['addTodo'] })
mutation.mutate({ title: 'title' })

// If the mutation has been paused because the device is for example offline,
// Then the paused mutation can be dehydrated when the application quits:
const state = dehydrate(queryClient)

// The mutation can then be hydrated again when the application is started:
hydrate(queryClient, state)

// Resume the paused mutations:
queryClient.resumePausedMutations()
```

----------------------------------------

TITLE: Subscribing to a Query with useQuery in React
DESCRIPTION: This snippet demonstrates the basic usage of the `useQuery` hook from `@tanstack/react-query` to subscribe to a query. It requires a `queryKey` (a unique identifier for caching and refetching) and a `queryFn` (an asynchronous function that returns a Promise resolving the data). The `info` variable will hold the query's state and data.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/queries.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { useQuery } from '@tanstack/react-query'

function App() {
  const info = useQuery({ queryKey: ['todos'], queryFn: fetchTodoList })
}
```

----------------------------------------

TITLE: Creating Query Options with `queryOptions` (TypeScript/TSX)
DESCRIPTION: The `queryOptions` utility function generates a configuration object for queries, requiring a `queryKey` and accepting additional `options`. It supports most options from `useQuery`, though some may not apply when used with functions like `queryClient.prefetchQuery`. Key options include `queryKey` (required) and `experimental_prefetchInRender` (optional, defaults to `false`, enabling prefetching during render and `useQuery().promise` functionality).
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/reference/queryOptions.md#_snippet_0

LANGUAGE: tsx
CODE:
```
queryOptions({
  queryKey,
  ...options,
})
```

----------------------------------------

TITLE: Incorrectly Using useMutation Result in React Hook Dependency Array (TypeScript)
DESCRIPTION: This example demonstrates the incorrect usage where the entire `mutation` object returned by `useMutation` is placed directly into the `useCallback` dependency array. Because the `mutation` object is not referentially stable, this leads to unnecessary re-creations of the `callback` function, violating the ESLint rule.
SOURCE: https://github.com/tanstack/query/blob/main/docs/eslint/no-unstable-deps.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
/* eslint "@tanstack/query/no-unstable-deps": "warn" */
import { useCallback } from 'React'
import { useMutation } from '@tanstack/react-query'

function Component() {
  const mutation = useMutation({ mutationFn: (value: string) => value })
  const callback = useCallback(() => {
    mutation.mutate('hello')
  }, [mutation])
  return null
}
```

----------------------------------------

TITLE: Basic TanStack Query Usage for GitHub Repository Data
DESCRIPTION: This example demonstrates the most basic usage of TanStack Query to fetch and display GitHub repository statistics for the TanStack Query project. It uses `QueryClientProvider` to provide the query client to the application and `useQuery` to manage the asynchronous data fetching, showing loading, error, and data states.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/overview.md#_snippet_0

LANGUAGE: tsx
CODE:
```
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}

function Example() {
  const { isPending, error, data } = useQuery({
    queryKey: ['repoData'],
    queryFn: () =>
      fetch('https://api.github.com/repos/TanStack/query').then((res) =>
        res.json(),
      ),
  })

  if (isPending) return 'Loading...'

  if (error) return 'An error has occurred: ' + error.message

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
      <strong>👀 {data.subscribers_count}</strong>{' '}
      <strong>✨ {data.stargazers_count}</strong>{' '}
      <strong>🍴 {data.forks_count}</strong>
    </div>
  )
}
```

----------------------------------------

TITLE: Defining and Using queryOptions Helper in TanStack Query (TypeScript)
DESCRIPTION: This snippet demonstrates how to define reusable query options using the `queryOptions` helper in TanStack Query. It shows how to encapsulate `queryKey`, `queryFn`, and other options like `staleTime` within a function, making them easily shareable across various query hooks and client methods such as `useQuery`, `useSuspenseQuery`, `useQueries`, `prefetchQuery`, and `setQueryData`. This approach centralizes query configuration and improves type safety.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/query-options.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { queryOptions } from '@tanstack/react-query'

function groupOptions(id: number) {
  return queryOptions({
    queryKey: ['groups', id],
    queryFn: () => fetchGroups(id),
    staleTime: 5 * 1000,
  })
}

// usage:

useQuery(groupOptions(1))
useSuspenseQuery(groupOptions(5))
useQueries({
  queries: [groupOptions(1), groupOptions(2)],
})
queryClient.prefetchQuery(groupOptions(23))
queryClient.setQueryData(groupOptions(42).queryKey, newGroups)
```

----------------------------------------

TITLE: Basic Data Fetching with useQuery in TypeScript
DESCRIPTION: This snippet demonstrates the most basic usage of `useQuery` from `@tanstack/vue-query` to fetch data. It defines a query with a `queryKey` for caching and a `queryFn` to execute the actual data fetching logic, storing the result in a `result` constant. This is the foundational pattern for all data fetching with TanStack Query.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/vue/guides/queries.md#_snippet_0

LANGUAGE: ts
CODE:
```
import { useQuery } from '@tanstack/vue-query'

const result = useQuery({ queryKey: ['todos'], queryFn: fetchTodoList })
```

----------------------------------------

TITLE: Initialize TanStack Query in Angular Application
DESCRIPTION: Demonstrates how to set up TanStack Query in an Angular application. This can be done by adding `provideTanStackQuery` to the application's providers for standalone components or within an NgModule-based setup, requiring Angular 16 or higher.
SOURCE: https://github.com/tanstack/query/blob/main/packages/angular-query-experimental/README.md#_snippet_1

LANGUAGE: typescript
CODE:
```
import { provideTanStackQuery } from '@tanstack/angular-query-experimental'
import { QueryClient } from '@tanstack/angular-query-experimental'

bootstrapApplication(AppComponent, {
  providers: [provideTanStackQuery(new QueryClient())],
})
```

LANGUAGE: typescript
CODE:
```
import { provideHttpClient } from '@angular/common/http'
import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental'

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [provideTanStackQuery(new QueryClient())],
  bootstrap: [AppComponent],
})
```

----------------------------------------

TITLE: Fetching GitHub Repository Stats with Solid Query (TSX)
DESCRIPTION: This snippet demonstrates the basic setup for fetching data using Solid Query in a SolidJS application. It utilizes `useQuery` to define a query for GitHub repository statistics, configures a `staleTime` for caching, and integrates with SolidJS's `Suspense` for loading states and `ErrorBoundary` for error handling. The `QueryClientProvider` wraps the application to make the query client available.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/solid/overview.md#_snippet_1

LANGUAGE: tsx
CODE:
```
import { ErrorBoundary, Suspense } from 'solid-js'
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/solid-query'

function App() {
  const repositoryQuery = useQuery(() => ({
    queryKey: ['TanStack Query'],
    queryFn: async () => {
      const result = await fetch('https://api.github.com/repos/TanStack/query')
      if (!result.ok) throw new Error('Failed to fetch data')
      return result.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    throwOnError: true, // Throw an error if the query fails
  }))

  return (
    <div>
      <div>Static Content</div>
      {/* An error while fetching will be caught by the ErrorBoundary */}
      <ErrorBoundary fallback={<div>Something went wrong!</div>}>
        {/* Suspense will trigger a loading state while the data is being fetched */}
        <Suspense fallback={<div>Loading...</div>}>
          {/* 
            The `data` property on a query is a SolidJS resource  
            so it will work with Suspense and transitions out of the box! 
          */}
          <div>{repositoryQuery.data?.updated_at}</div>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

const root = document.getElementById('root')
const client = new QueryClient()

render(
  () => (
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  ),
  root!,
)
```

----------------------------------------

TITLE: Using TanStack Query's useQuery Hook
DESCRIPTION: This snippet demonstrates the basic usage of the `useQuery` hook in TanStack Query, showing the various properties returned by the hook, such as `data`, `error`, `isLoading`, and `refetch`, along with the common configuration options passed to it.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/reference/useQuery.md#_snippet_0

LANGUAGE: tsx
CODE:
```
const {
  data,
  dataUpdatedAt,
  error,
  errorUpdatedAt,
  failureCount,
  failureReason,
  fetchStatus,
  isError,
  isFetched,
  isFetchedAfterMount,
  isFetching,
  isInitialLoading,
  isLoading,
  isLoadingError,
  isPaused,
  isPending,
  isPlaceholderData,
  isRefetchError,
  isRefetching,
  isStale,
  isSuccess,
  promise,
  refetch,
  status,
} = useQuery(
  {
    queryKey,
    queryFn,
    gcTime,
    enabled,
    networkMode,
    initialData,
    initialDataUpdatedAt,
    meta,
    notifyOnChangeProps,
    placeholderData,
    queryKeyHashFn,
    refetchInterval,
    refetchIntervalInBackground,
    refetchOnMount,
    refetchOnReconnect,
    refetchOnWindowFocus,
    retry,
    retryOnMount,
    retryDelay,
    select,
    staleTime,
    structuralSharing,
    subscribed,
    throwOnError,
  },
  queryClient,
)
```

----------------------------------------

TITLE: Destructuring useQuery Hook in Tanstack Solid Query
DESCRIPTION: This snippet illustrates the comprehensive set of properties returned by the `useQuery` hook, providing detailed status, data, and error information. It also outlines the various configuration options available for customizing query behavior, including caching, refetching, and error handling strategies.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/solid/reference/useQuery.md#_snippet_0

LANGUAGE: tsx
CODE:
```
const {
  data,
  dataUpdatedAt,
  error,
  errorUpdatedAt,
  failureCount,
  failureReason,
  fetchStatus,
  isError,
  isFetched,
  isFetchedAfterMount,
  isFetching,
  isInitialLoading,
  isLoading,
  isLoadingError,
  isPaused,
  isPending,
  isPlaceholderData,
  isRefetchError,
  isRefetching,
  isStale,
  isSuccess,
  refetch,
  status,
} = useQuery(
  () => ({
    queryKey,
    queryFn,
    enabled,
    select,
    placeholderData,
    deferStream,
    reconcile,
    gcTime,
    networkMode,
    initialData,
    initialDataUpdatedAt,
    meta,
    queryKeyHashFn,
    refetchInterval,
    refetchIntervalInBackground,
    refetchOnMount,
    refetchOnReconnect,
    refetchOnWindowFocus,
    retry,
    retryOnMount,
    retryDelay,
    staleTime,
    throwOnError,
  }),
  () => queryClient,
)
```

----------------------------------------

TITLE: Using useQuery Hook for Data Fetching in Vue
DESCRIPTION: This example shows how to use the `useQuery` hook within a Vue component's `setup` function to fetch data. It defines a `queryKey` for caching and a `queryFn` to execute the data fetching logic, returning the query state for template access.
SOURCE: https://github.com/tanstack/query/blob/main/packages/vue-query/README.md#_snippet_5

LANGUAGE: typescript
CODE:
```
import { defineComponent } from 'vue'
import { useQuery } from '@tanstack/vue-query'

export default defineComponent({
  name: 'MyComponent',
  setup() {
    const query = useQuery({ queryKey: ['todos'], queryFn: getTodos })

    return {
      query,
    }
  },
})
```

----------------------------------------

TITLE: Updating TanStack Query Hooks to Object Signature (v5)
DESCRIPTION: This snippet illustrates the migration of TanStack Query hooks (`useQuery`, `useInfiniteQuery`, `useMutation`, `useIsFetching`, `useIsMutating`) from multiple parameter overloads to a single object-based signature in v5. The previous positional arguments are now consolidated into a single object containing named properties like `queryKey`, `queryFn`, and `mutationFn`.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/migrating-to-v5.md#_snippet_0

LANGUAGE: tsx
CODE:
```
useQuery(key, fn, options) // [!code --]
useQuery({ queryKey, queryFn, ...options }) // [!code ++]
useInfiniteQuery(key, fn, options) // [!code --]
useInfiniteQuery({ queryKey, queryFn, ...options }) // [!code ++]
useMutation(fn, options) // [!code --]
useMutation({ mutationFn, ...options }) // [!code ++]
useIsFetching(key, filters) // [!code --]
useIsFetching({ queryKey, ...filters }) // [!code ++]
useIsMutating(key, filters) // [!code --]
useIsMutating({ mutationKey, ...filters }) // [!code ++]
```

----------------------------------------

TITLE: Implementing TanStack Query Core Concepts in React/TypeScript
DESCRIPTION: This snippet demonstrates the fundamental usage of TanStack Query within a React application. It covers initializing the QueryClientProvider, fetching data using useQuery, performing data modifications with useMutation, and invalidating cached queries using queryClient.invalidateQueries to trigger refetches. It relies on hypothetical 'getTodos' and 'postTodo' API functions.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/quick-start.md#_snippet_0

LANGUAGE: tsx
CODE:
```
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { getTodos, postTodo } from '../my-api'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <Todos />
    </QueryClientProvider>
  )
}

function Todos() {
  // Access the client
  const queryClient = useQueryClient()

  // Queries
  const query = useQuery({ queryKey: ['todos'], queryFn: getTodos })

  // Mutations
  const mutation = useMutation({
    mutationFn: postTodo,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <div>
      <ul>{query.data?.map((todo) => <li key={todo.id}>{todo.title}</li>)}</ul>

      <button
        onClick={() => {
          mutation.mutate({
            id: Date.now(),
            title: 'Do Laundry',
          })
        }}
      >
        Add Todo
      </button>
    </div>
  )
}

render(<App />, document.getElementById('root'))
```

----------------------------------------

TITLE: Server-Side Prefetching of Dependent Queries
DESCRIPTION: This example illustrates how to prefetch dependent queries on the server within a Remix `loader` (or Next.js `getServerSideProps`). It involves fetching the initial query (`user`) and then, based on its result, conditionally prefetching the dependent query (`projects`) before dehydrating the `QueryClient` state for client hydration.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/ssr.md#_snippet_11

LANGUAGE: tsx
CODE:
```
// For Remix, rename this to loader instead
export async function getServerSideProps() {
  const queryClient = new QueryClient()

  const user = await queryClient.fetchQuery({
    queryKey: ['user', email],
    queryFn: getUserByEmail,
  })

  if (user?.userId) {
    await queryClient.prefetchQuery({
      queryKey: ['projects', userId],
      queryFn: getProjectsByUser,
    })
  }

  // For Remix:
  // return json({ dehydratedState: dehydrate(queryClient) })
  return { props: { dehydratedState: dehydrate(queryClient) } }
}
```

----------------------------------------

TITLE: Using `useQuery` with Dynamic `queryKey` in React
DESCRIPTION: This snippet illustrates how to use the `useQuery` hook from TanStack Query to fetch data, passing dynamic variables (`status`, `page`) via the `queryKey`. The `queryFn`, `fetchTodoList`, then destructures the `queryKey` to access these variables, enabling conditional data fetching based on the current state or parameters. It's crucial for creating reusable and context-aware data fetching logic.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/vue/guides/query-functions.md#_snippet_0

LANGUAGE: JavaScript
CODE:
```
const result = useQuery({
  queryKey: ['todos', { status, page }],
  queryFn: fetchTodoList,
})

// Access the key, status and page variables in your query function!
function fetchTodoList({ queryKey }) {
  const [_key, { status, page }] = queryKey
  return new Promise()
}
```

----------------------------------------

TITLE: Handling Mutation Errors with Retry Option in UI (TSX)
DESCRIPTION: This snippet shows how to handle a failed optimistic update by displaying an error message and a retry button. If `isError` is true, it renders a red-colored list item using the `variables` from the failed mutation and provides a button to re-trigger the `mutate` function with the same variables.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/optimistic-updates.md#_snippet_2

LANGUAGE: tsx
CODE:
```
{
  isError && (
    <li style={{ color: 'red' }}>
      {variables}
      <button onClick={() => mutate(variables)}>Retry</button>
    </li>
  )
}
```

----------------------------------------

TITLE: Implementing Dependent Queries with TanStack Query (TSX)
DESCRIPTION: This snippet demonstrates a dependent query pattern where fetching user projects relies on the `userId` obtained from a prior user query. The `enabled` option ensures the second query only executes once `userId` is available, preventing unnecessary fetches.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/request-waterfalls.md#_snippet_0

LANGUAGE: tsx
CODE:
```
// Get the user
const { data: user } = useQuery({
  queryKey: ['user', email],
  queryFn: getUserByEmail,
})

const userId = user?.id

// Then get the user's projects
const {
  status,
  fetchStatus,
  data: projects,
} = useQuery({
  queryKey: ['projects', userId],
  queryFn: getProjectsByUser,
  // The query will not execute until the userId exists
  enabled: !!userId,
})
```

----------------------------------------

TITLE: Narrowing Data Type with isSuccess Flag in TypeScript
DESCRIPTION: This example demonstrates type narrowing using React Query's `isSuccess` status flag. When `isSuccess` is true, TypeScript's discriminated union type feature narrows the `data` type from `number | undefined` to `number`, ensuring type safety when accessing `data`.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/typescript.md#_snippet_3

LANGUAGE: TSX
CODE:
```
const { data, isSuccess } = useQuery({
  queryKey: ['test'],
  queryFn: () => Promise.resolve(5),
})

if (isSuccess) {
  data
  //  ^? const data: number
}
```

----------------------------------------

TITLE: Conditionally Displaying Post Data with Tanstack Query in Angular Template
DESCRIPTION: This snippet demonstrates how to conditionally render UI elements based on the state of a 'postQuery' from Tanstack Query within an Angular template. It covers displaying a loading message, an error message, the actual post data (title and body), and a background updating indicator when data is being refetched. It relies on the 'isPending()', 'isError()', 'error()', 'data()', and 'isFetching()' methods of the query object.
SOURCE: https://github.com/tanstack/query/blob/main/examples/angular/basic-persister/src/app/components/post.component.html#_snippet_0

LANGUAGE: Angular Template
CODE:
```
[Back](#)

@if (postQuery.isPending()) { Loading... } @else if (postQuery.isError()) { Error: {{ postQuery.error().message }} } @if (postQuery.data(); as post) {

{{ post.title }}
================

{{ post.body }}

@if (postQuery.isFetching()) { Background Updating... } }
```

----------------------------------------

TITLE: Prefetching Data in Next.js App Router Server Component with TanStack Query
DESCRIPTION: This snippet illustrates how to prefetch data within a Next.js App Router Server Component. It initializes a `QueryClient`, prefetches data using `queryClient.prefetchQuery`, and then dehydrates the client state. The dehydrated state is passed as a prop to a `HydrationBoundary` Client Component, enabling seamless data hydration on the client.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/advanced-ssr.md#_snippet_3

LANGUAGE: tsx
CODE:
```
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import Posts from './posts'

export default async function PostsPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  return (
    // Neat! Serialization is now as easy as passing props.
    // HydrationBoundary is a Client Component, so hydration will happen there.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
    </HydrationBoundary>
  )
}
```

----------------------------------------

TITLE: Defining and Using Typed Mutation Options with `mutationOptions` in Angular
DESCRIPTION: This snippet demonstrates how to define type-safe mutation options using `mutationOptions` within an Angular service. It shows how to define `mutationFn`, `mutationKey`, and `onSuccess` callbacks, ensuring that the `newPost` parameter in `onSuccess` is correctly typed (`Post`).
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/angular/typescript.md#_snippet_11

LANGUAGE: TypeScript
CODE:
```
export class QueriesService {
  private http = inject(HttpClient)

  updatePost(id: number) {
    return mutationOptions({
      mutationFn: (post: Post) => Promise.resolve(post),
      mutationKey: ['updatePost', id],
      onSuccess: (newPost) => {
        //           ^? newPost: Post
        this.queryClient.setQueryData(['posts', id], newPost)
      },
    })
  }
}
```

----------------------------------------

TITLE: Fetching Data with useQuery in TanStack Solid Query
DESCRIPTION: This snippet demonstrates how to set up TanStack Query in a SolidJS application. It initializes a `QueryClient` and wraps the application with `QueryClientProvider`. The `Example` component uses `useQuery` to fetch 'todos' and conditionally renders UI based on the query's `isPending`, `isError`, and `isSuccess` states, displaying loading, error messages, or fetched data respectively. A `fetchTodos` function is assumed as a prerequisite for `queryFn`.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/solid/quick-start.md#_snippet_0

LANGUAGE: tsx
CODE:
```
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/solid-query'
import { Switch, Match, For } from 'solid-js'

const queryClient = new QueryClient()

function Example() {
  const query = useQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  }))

  return (
    <div>
      <Switch>
        <Match when={query.isPending}>
          <p>Loading...</p>
        </Match>
        <Match when={query.isError}>
          <p>Error: {query.error.message}</p>
        </Match>
        <Match when={query.isSuccess}>
          <For each={query.data}>{(todo) => <p>{todo.title}</p>}</For>
        </Match>
      </Switch>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example />
    </QueryClientProvider>
  )
}
```

----------------------------------------

TITLE: Defining Query Keys for a Custom Hook in React Query
DESCRIPTION: This snippet demonstrates how to define a query key for a custom React Query hook (`useTodos`). It uses an array `['todos', todoId]` as the `queryKey`, which allows for unique caching and invalidation based on the `todoId`. The `queryFn` fetches a todo by its ID, requiring `todoId.value` as a parameter.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/vue/guides/query-keys.md#_snippet_0

LANGUAGE: javascript
CODE:
```
function useTodos(todoId) {
  const queryKey = ['todos', todoId]
  return useQuery({
    queryKey,
    queryFn: () => fetchTodoById(todoId.value),
  })
}
```

----------------------------------------

TITLE: Initializing TanStack Query in Angular Standalone Application (TypeScript)
DESCRIPTION: Demonstrates how to initialize TanStack Query in an Angular standalone application using `bootstrapApplication`. It imports `provideTanStackQuery` and `QueryClient`, then provides a new `QueryClient` instance to the application's providers.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/angular/reference/functions/providetanstackquery.md#_snippet_1

LANGUAGE: ts
CODE:
```
import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental'

bootstrapApplication(AppComponent, {
  providers: [provideTanStackQuery(new QueryClient())],
})
```

----------------------------------------

TITLE: Using `useSuspenseQuery` for Type-Safe Data Fetching in TanStack Query
DESCRIPTION: Demonstrates the usage of the new `useSuspenseQuery` hook in TanStack Query v5. This hook ensures that the `data` returned is never `undefined` at the type level, providing a more robust and type-safe way to handle fetched data in suspense-enabled components. It requires a `queryKey` to uniquely identify the query and a `queryFn` to perform the data fetching operation.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/migrating-to-v5.md#_snippet_22

LANGUAGE: JavaScript
CODE:
```
const { data: post } = useSuspenseQuery({
  // ^? const post: Post
  queryKey: ['post', postId],
  queryFn: () => fetchPost(postId)
})
```

----------------------------------------

TITLE: Defining Basic Query Keys for Lists - TypeScript
DESCRIPTION: This snippet demonstrates how to define simple `queryKey` arrays for fetching lists of data, such as a list of todos or other general data. It shows basic string literal keys for identifying different data collections.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/angular/guides/query-keys.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
// A list of todos
injectQuery(() => ({ queryKey: ['todos'], ... }))

// Something else, whatever!
injectQuery(() => ({ queryKey: ['something', 'special'], ... }))
```

----------------------------------------

TITLE: Correctly Using useMutation Result in React Hook Dependency Array (TypeScript)
DESCRIPTION: This example illustrates the correct approach: destructuring the `mutate` function directly from the `useMutation` hook's return value and using only `mutate` in the `useCallback` dependency array. Since `mutate` is referentially stable, this prevents unnecessary re-creations of the `callback` function, adhering to the ESLint rule.
SOURCE: https://github.com/tanstack/query/blob/main/docs/eslint/no-unstable-deps.md#_snippet_1

LANGUAGE: TypeScript
CODE:
```
/* eslint "@tanstack/query/no-unstable-deps": "warn" */
import { useCallback } from 'React'
import { useMutation } from '@tanstack/react-query'

function Component() {
  const { mutate } = useMutation({ mutationFn: (value: string) => value })
  const callback = useCallback(() => {
    mutate('hello')
  }, [mutate])
  return null
}
```

----------------------------------------

TITLE: Checking Query Success Status with TanStack Query in TypeScript
DESCRIPTION: This property is a type predicate within the `BaseQueryNarrowing` interface that checks if a `CreateBaseQueryResult` instance is currently in a 'success' state. It takes `this` (the query result) as a parameter and returns `true` if the query has successfully completed, narrowing its type to reflect the success status.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/angular/reference/interfaces/basequerynarrowing.md#_snippet_2

LANGUAGE: TypeScript
CODE:
```
isSuccess: (this) => this is CreateBaseQueryResult<TData, TError, CreateStatusBasedQueryResult<"success", TData, TError>>;
```

----------------------------------------

TITLE: Correct: Instantiating TanStack QueryClient in Module Scope (TypeScript)
DESCRIPTION: This snippet illustrates another correct approach where the `QueryClient` is instantiated outside the component, at the module level. This guarantees that a single `QueryClient` instance is created once when the module is loaded, making it available globally to components and ensuring stability.
SOURCE: https://github.com/tanstack/query/blob/main/docs/eslint/stable-query-client.md#_snippet_2

LANGUAGE: TypeScript
CODE:
```
const queryClient = new QueryClient()
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>
  )
}
```

----------------------------------------

TITLE: Implementing Infinite Queries with Vue and TanStack Query
DESCRIPTION: This snippet demonstrates how to use `useInfiniteQuery` from `@tanstack/vue-query` to fetch paginated data. It defines a `fetchProjects` function that accepts a `pageParam` for cursor-based pagination and configures `getNextPageParam` to extract the next cursor from the last fetched page. The template then renders the paginated data and provides a 'Load More' button to trigger `fetchNextPage`, managing various loading and error states.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/vue/guides/infinite-queries.md#_snippet_0

LANGUAGE: Vue
CODE:
```
<script setup>\nimport { useInfiniteQuery } from '@tanstack/vue-query'\n\nconst fetchProjects = async ({ pageParam = 0 }) => {\n  const res = await fetch('/api/projects?cursor=' + pageParam)\n  return res.json()\n}\n\nconst {\n  data,\n  error,\n  fetchNextPage,\n  hasNextPage,\n  isFetching,\n  isFetchingNextPage,\n  isPending,\n  isError,\n} = useInfiniteQuery({\n  queryKey: ['projects'],\n  queryFn: fetchProjects,\n  getNextPageParam: (lastPage, pages) => lastPage.nextCursor,\n})\n</script>\n\n<template>\n  <span v-if="isPending">Loading...</span>\n  <span v-else-if="isError">Error: {{ error.message }}</span>\n  <div v-else-if="data">\n    <span v-if="isFetching && !isFetchingNextPage">Fetching...</span>\n    <ul v-for="(group, index) in data.pages" :key="index">\n      <li v-for="project in group.projects" :key="project.id">\n        {{ project.name }}\n      </li>\n    </ul>\n    <button\n      @click="() => fetchNextPage()"\n      :disabled="!hasNextPage || isFetchingNextPage"\n    >\n      <span v-if="isFetchingNextPage">Loading more...</span>\n      <span v-else-if="hasNextPage">Load More</span>\n      <span v-else>Nothing more to load</span>\n    </button>\n  </div>\n</template>
```

----------------------------------------

TITLE: Updating Single Todo with Optimistic UI and Rollback using Tanstack Query
DESCRIPTION: This snippet demonstrates how to perform an optimistic update for a single todo using `useMutation`. It cancels pending refetches, snapshots the previous data, optimistically updates the cache, and provides a rollback mechanism via `onError` if the mutation fails. The `onSettled` callback ensures data is refetched after the mutation completes, regardless of success or failure.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/optimistic-updates.md#_snippet_5

LANGUAGE: tsx
CODE:
```
useMutation({
  mutationFn: updateTodo,
  // When mutate is called:
  onMutate: async (newTodo) => {
    // Cancel any outgoing refetches
    // (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] })

    // Snapshot the previous value
    const previousTodo = queryClient.getQueryData(['todos', newTodo.id])

    // Optimistically update to the new value
    queryClient.setQueryData(['todos', newTodo.id], newTodo)

    // Return a context with the previous and new todo
    return { previousTodo, newTodo }
  },
  // If the mutation fails, use the context we returned above
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(
      ['todos', context.newTodo.id],
      context.previousTodo,
    )
  },
  // Always refetch after error or success:
  onSettled: (newTodo) =>
    queryClient.invalidateQueries({ queryKey: ['todos', newTodo.id] }),
})
```

----------------------------------------

TITLE: Implementing Optimistic Update for a Single Item (TypeScript)
DESCRIPTION: Similar to the previous snippet, this one demonstrates an optimistic update but specifically for a single item identified by its ID. `onMutate` cancels and snapshots the specific item's data, then optimistically updates it. `onError` rolls back the single item, and `onSettled` invalidates the specific item's query.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/angular/guides/optimistic-updates.md#_snippet_5

LANGUAGE: ts
CODE:
```
queryClient = inject(QueryClient)

updateTodo = injectMutation(() => ({
  mutationFn: updateTodo,
  // When mutate is called:
  onMutate: async (newTodo) => {
    // Cancel any outgoing refetches
    // (so they don't overwrite our optimistic update)
    await this.queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] })

    // Snapshot the previous value
    const previousTodo = this.queryClient.getQueryData(['todos', newTodo.id])

    // Optimistically update to the new value
    this.queryClient.setQueryData(['todos', newTodo.id], newTodo)

    // Return a context with the previous and new todo
    return { previousTodo, newTodo }
  },
  // If the mutation fails, use the context we returned above
  onError: (err, newTodo, context) => {
    this.queryClient.setQueryData(
      ['todos', context.newTodo.id],
      context.previousTodo,
    )
  },
  // Always refetch after error or success:
  onSettled: (newTodo) => {
    this.queryClient.invalidateQueries({ queryKey: ['todos', newTodo.id] })
  },
}))
```

----------------------------------------

TITLE: Defining a Mutation with useMutation for UI Optimistic Updates (TSX)
DESCRIPTION: This snippet defines an `addTodoMutation` using React Query's `useMutation` hook. It specifies the `mutationFn` for posting new todo data and an `onSettled` callback to invalidate the 'todos' query, ensuring the UI reflects the latest state after the mutation. It also destructures key states like `isPending`, `variables`, and `isError` for UI consumption.
SOURCE: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/optimistic-updates.md#_snippet_0

LANGUAGE: tsx
CODE:
```
const addTodoMutation = useMutation({
  mutationFn: (newTodo: string) => axios.post('/api/data', { text: newTodo }),
  // make sure to _return_ the Promise from the query invalidation
  // so that the mutation stays in `pending` state until the refetch is finished
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})

const { isPending, submittedAt, variables, mutate, isError } = addTodoMutation
```