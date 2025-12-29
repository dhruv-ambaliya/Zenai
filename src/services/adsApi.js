// Simulated delay to mimic network request
const simulateNetworkDelay = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const fetchVideoAds = async () => {
    try {
        await simulateNetworkDelay(300);

        // Fetch from unified adsData.json
        const response = await fetch('/src/data/adsData.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allAds = await response.json();

        // Filter only ads that have videos
        const videoAds = allAds.filter(ad => ad.hasVideo === true);

        return {
            success: true,
            data: videoAds,
            count: videoAds.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching video ads:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
};


export const fetchVideoAdById = async (id) => {
    try {
        await simulateNetworkDelay(200);

        const response = await fetch('/src/data/adsData.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allAds = await response.json();
        const ad = allAds.find(ad => ad.id === id && ad.hasVideo === true);

        if (!ad) {
            throw new Error(`Video ad with ID ${id} not found`);
        }

        return {
            success: true,
            data: ad,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error fetching video ad ${id}:`, error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
};
