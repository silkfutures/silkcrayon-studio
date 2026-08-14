/** @type {import('next').NextConfig} */
const nextConfig={poweredByHeader:false,async redirects(){return [{source:'/studio',destination:'/booking',permanent:true},{source:'/starthere',destination:'/booking',permanent:true},{source:'/canton',destination:'/cardiff-bay',permanent:true},{source:'/service-page/:path*',destination:'/booking',permanent:true}]}};
export default nextConfig;
