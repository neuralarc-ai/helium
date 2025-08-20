/**
 * Constructs a preview URL for HTML files in the sandbox environment.
 * Properly handles URL encoding of file paths by encoding each path segment individually.
 *
 * @param sandboxUrl - The base URL of the sandbox
 * @param filePath - The path to the HTML file (can include /workspace/ prefix)
 * @returns The properly encoded preview URL, or undefined if inputs are invalid
 */
export function constructHtmlPreviewUrl(
  sandboxUrl: string | undefined,
  filePath: string | undefined,
): string | undefined {
  if (!sandboxUrl || !filePath) {
    return undefined;
  }

  // Remove /workspace/ prefix if present
  const processedPath = filePath.replace(/^\/workspace\//, '');

  // Split the path into segments and encode each segment individually
  const pathSegments = processedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment));

  // Join the segments back together with forward slashes
  const encodedPath = pathSegments.join('/');

  // Build base URL safely and canonicalize Daytona proxy domain to 8080/https
  let base = sandboxUrl;
  try {
    const u = new URL(sandboxUrl);
    const host = u.hostname;
    const m = host.match(/^(\d+)-(.*\.proxy\.daytona\.works)$/);
    if (m) {
      // Force 8080 subdomain and https scheme for consistency across UI
      u.hostname = `8080-${m[2]}`;
      u.protocol = 'https:';
      u.port = '';
      base = u.toString().replace(/\/$/, '');
    }
  } catch {
    // leave base as-is if it's not a standard URL
  }

  // Ensure directory-like paths end with index.html
  const needsIndex = !encodedPath.match(/\.[^/.]+$/); // no file extension
  const pathWithIndex = needsIndex
    ? (encodedPath.endsWith('/') ? `${encodedPath}index.html` : `${encodedPath}/index.html`)
    : encodedPath;

  return `${base}/${pathWithIndex}`;
}
