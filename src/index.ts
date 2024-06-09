import "dotenv/config"
import { DuneClient, DuneQuery } from "@duneanalytics/client-sdk"
import { input } from "@inquirer/prompts"
import { TimeoutError } from "puppeteer"
import { scrapeQueriesFromDashboard } from "./scraper"
import { writeQueriesToFileSystem } from "./persistence"
import { printWelcomeMessage } from "./utils"

const client = new DuneClient(process.env.DUNE_API_KEY ?? "")
const queryStore: Map<number, DuneQuery> = new Map()

/**
 * Fetches a query and all of its child queries recursively. Stores the queries in a map in global scope.
 */
const fetchQueryWithChildQueries = async (queryId: number) => {
	if (queryStore.has(queryId)) return

	console.info(`Fetching query ${queryId}...`)

	const query = await client.query.readQuery(queryId).catch((err) => {
		console.error(`Failed to fetch query ${queryId}: ${err.message}`)
		return null
	})
	if (!query) return // Skip if query is null (.e.g. query does not exist, private query, etc.)

	queryStore.set(queryId, query)

	const childQueryIds =
		query.query_sql
			.match(/query_(?<queryId>\d+)/g)
			?.map((match) => Number(match.match(/\d+/)?.[0])) ?? []

	if (childQueryIds.length > 0) {
		console.info(`Found ${childQueryIds.length} child queries for query ${queryId}.`)

		for (const childQueryId of childQueryIds) {
			if (!queryStore.has(childQueryId)) await fetchQueryWithChildQueries(childQueryId)
		}
	}
}

;(async () => {
	printWelcomeMessage()

	const dashboardURL = await input({ message: "Enter dashboard URL" })

	const queryIds = await scrapeQueriesFromDashboard(dashboardURL).catch((error) => {
		// TODO: If timeout error occurs, ask user to retry
		if (error instanceof TimeoutError) {
			console.error("Timeout, please try again.")
			console.error(error.message)
		} else console.error(error)

		process.exit(1)
	})
	console.info(`Found ${queryIds.length} queries on the dashboard.`)

	for (const queryId of queryIds) {
		await fetchQueryWithChildQueries(queryId)
	}

	await writeQueriesToFileSystem(dashboardURL, Array.from(queryStore.values()))
})().finally(() => process.exit(0))
