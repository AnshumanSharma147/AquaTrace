import 'dotenv/config'

const response = await fetch(
  'https://gateway.api.globalfishingwatch.org/v3/vessels/search?query=7831410&datasets[0]=public-global-vessel-identity:latest',
  {
    headers: {
      Authorization: `Bearer ${process.env.GFW_API_TOKEN}`,
    },
  }
)

console.log('GFW API Status:', response.status)

const data = await response.json()

console.log(JSON.stringify(data, null, 2))
