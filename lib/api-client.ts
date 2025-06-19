export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  let url = endpoint;

  if (!/^https?:\/\//i.test(endpoint)) {
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_APP_URL is not defined. Please set it in your environment variables.');
      return { data: null, error: 'Application URL not configured.' };
    }
    // Ensure no double slashes
    url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }

  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
  };

  if (options.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (response.ok) {
      // Handle cases where response is OK but no content (e.g., 204)
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return { data: null, error: null };
      }
      // Try to parse JSON, handle if not JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return { data, error: null };
      } else {
        // If response is OK but not JSON, return text or handle as appropriate
        // For now, returning null data and a message, or consider response.text()
        return { data: null, error: "Response was not JSON." }; 
      }
    } else {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Failed to parse error response as JSON, stick with statusText
      }
      return { data: null, error: errorMessage };
    }
  } catch (error) {
    let networkErrorMessage = "A network error occurred.";
    if (error instanceof Error) {
      networkErrorMessage = error.message;
    }
    return { data: null, error: networkErrorMessage };
  }
} 