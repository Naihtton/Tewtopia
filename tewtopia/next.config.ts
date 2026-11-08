import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Find tutors moved out of the logged-in /main area. Done here (not in a page)
      // so the /main layout's login guard doesn't intercept guests first.
      { source: "/main/tutors", destination: "/tutors", permanent: false },
    ];
  },
};

export default nextConfig;
