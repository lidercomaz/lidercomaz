import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Trailing slashes as in DLE (/gundem/); post urls end in .html and are left untouched.
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  outputFileTracingExcludes: { '*': ['.data/**'] },
}

export default nextConfig
