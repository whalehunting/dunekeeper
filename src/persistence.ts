import fs from "fs/promises"
import { DuneQuery } from "@duneanalytics/client-sdk"

export const writeQueriesToFileSystem = async (dashboardUrl: string, queries: DuneQuery[]) => {
	const dashboardName = dashboardUrl.split("/").pop()
	const dashboardPath = `dashboards/${dashboardName}`

	console.info(`Writing ${queries.length} queries to ${dashboardPath}...`)

	// Create a directory for the dashboard
	await fs.mkdir(dashboardPath, { recursive: true })

	for (const query of queries) {
		const { query_id, name, query_sql } = query

		const cleanedName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase()
		await fs.writeFile(`${dashboardPath}/${query_id}_${cleanedName}.sql`, query_sql)
	}
}
