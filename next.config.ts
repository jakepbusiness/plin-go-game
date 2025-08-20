import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	env: {
		WHOP_API_KEY: process.env.WHOP_API_KEY,
	},
};

export default withWhopAppConfig(nextConfig);
