// Netlify serverless function — proxies OpenWeather so the API key never
// ships to the browser (it was previously visible in page source on the
// lobby display).
//
// SETUP (one time, in the Netlify dashboard for this site):
//   Site settings > Environment variables > Add variable
//     Key:   OPENWEATHER_API_KEY
//     Value: <your key>
//   Redeploy after adding it.
//
// Then, on OpenWeather's side, regenerate/rotate the old key that was
// exposed in the old page source — it's been publicly visible via
// view-source on the TV's network and should be treated as compromised.
//
// The display calls this at /.netlify/functions/weather instead of
// calling OpenWeather directly.

exports.handler = async (event) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OPENWEATHER_API_KEY is not set in Netlify environment variables' }),
    };
  }

  const city = event.queryStringParameters?.city || 'Galena,OH,US';
  const units = event.queryStringParameters?.units || 'imperial';

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${encodeURIComponent(units)}&appid=${apiKey}`;
    const r = await fetch(url);
    const d = await r.json();

    if (!d || !d.main) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Unexpected response from weather provider' }) };
    }

    // Only pass through what the display needs — never echo the key or
    // the raw upstream payload.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({
        temp: d.main.temp,
        description: d.weather?.[0]?.description ?? null,
        main: d.weather?.[0]?.main ?? null,
      }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Weather fetch failed' }) };
  }
};
