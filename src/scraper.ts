import "dotenv/config"
import puppeteer from "puppeteer"

export const scrapeQueriesFromDashboard = async (dashboardURL: string) => {
	const browser = await puppeteer.launch({ headless: false })
	const page = await browser.newPage()

	console.info("Opening dashboard...")
	await page.goto(dashboardURL)
	await page.setViewport({ width: 1080, height: 1024 })

	// Wait for the page to load
	await page.waitForSelector(".react-grid-item")

	// Find all anchor elements that contain query URLs
	const queryAnchorUrls = await page.evaluate(() =>
		Array.from(document.querySelectorAll('a[href^="/queries"]'), (a) => a.getAttribute("href")),
	)

	await browser.close()

	const queryIds = queryAnchorUrls
		.map((url) => {
			if (!url) return null
			const match = url.match(/^\/queries\/(?<queryId>\d+)/)
			return match?.groups?.queryId ?? null
		})
		.filter(Boolean)
		.map(Number)

	const uniqueQueryIds = [...new Set(queryIds)]

	return uniqueQueryIds
}
