const { withWhopAppConfig } = require("@whop/react/next.config");

/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	env: {
		WHOP_API_KEY: process.env.WHOP_API_KEY,
		NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
	},
};

module.exports = withWhopAppConfig(nextConfig);
