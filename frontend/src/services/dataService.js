import pako from 'pako';

const GEOJSON_URL = 'https://regieessencequebec.ca/stations.geojson.gz';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processData = (uint8Array) => {
  try {
    // Check if it's actually gzipped (magic bytes 1f 8b)
    if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      const decompressed = pako.ungzip(uint8Array, { to: 'string' });
      return JSON.parse(decompressed);
    } else {
      // If not gzipped, try parsing as raw JSON
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(uint8Array);
      return JSON.parse(text);
    }
  } catch (err) {
    throw new Error(`Failed to process data: ${err.message}`);
  }
};

export const fetchStations = async (retries = MAX_RETRIES) => {
  try {
    const response = await fetch(GEOJSON_URL);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const parsed = processData(uint8Array);
    return parsed;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    await delay(RETRY_DELAY_MS * (MAX_RETRIES - retries + 1));
    return fetchStations(retries - 1);
  }
};
