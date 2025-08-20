export default function DebugPage() {
	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">Environment Variables Debug</h1>
				
				<div className="bg-white p-6 rounded-lg shadow-md space-y-4">
					<div>
						<h2 className="text-lg font-semibold mb-2">Whop App Configuration</h2>
						<div className="space-y-2 text-sm">
							<div>
								<strong>WHOP_API_KEY:</strong> 
								<span className="ml-2 font-mono">
									{process.env.WHOP_API_KEY ? 'SET' : 'NOT SET'}
								</span>
							</div>
							<div>
								<strong>NEXT_PUBLIC_WHOP_APP_ID:</strong> 
								<span className="ml-2 font-mono">
									{process.env.NEXT_PUBLIC_WHOP_APP_ID || 'NOT SET'}
								</span>
							</div>
						</div>
					</div>
					
					<div className="border-t pt-4">
						<h3 className="text-md font-semibold mb-2">Status</h3>
						<div className="space-y-1">
							<div className={`inline-block px-2 py-1 rounded text-xs ${
								process.env.WHOP_API_KEY ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								API Key: {process.env.WHOP_API_KEY ? '✅ Valid' : '❌ Not Set'}
							</div>
							<div className={`inline-block px-2 py-1 rounded text-xs ${
								process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								App ID: {process.env.NEXT_PUBLIC_WHOP_APP_ID ? '✅ Valid' : '❌ Not Set'}
							</div>
						</div>
					</div>
				</div>
				
				<div className="mt-6 bg-blue-50 p-4 rounded-lg">
					<h3 className="font-semibold mb-2">Next Steps:</h3>
					<ol className="list-decimal list-inside space-y-1 text-sm">
						<li>Go to your <a href="https://whop.com/dashboard" target="_blank" rel="noopener" className="text-blue-600 underline">Whop Dashboard</a></li>
						<li>Navigate to Developer → Your App → Settings</li>
						<li>Copy the API Key and App ID</li>
						<li>Update your <code className="bg-gray-200 px-1 rounded">.env</code> file with these values</li>
						<li>Restart your development server</li>
					</ol>
				</div>
			</div>
		</div>
	);
}



