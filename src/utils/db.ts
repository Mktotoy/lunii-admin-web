const THUMBNAILS_STORAGE_ROOT = "https://storage.googleapis.com/lunii-data-prod";

type LuniiDbEntry = {
  uuid: string;
  thumbnailUrl?: string;
  localized_infos: {
    fr_FR: {
      description: string;
      title: string;
      image: {
        image_url: string;
      };
    };
  };
};

export async function getGuestToken() {
  const createResponse = await fetch(
    "https://corsproxy.io/?" +
    encodeURIComponent("https://server-auth-prod.lunii.com/guest/create"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );
  const createData = await createResponse.json();
  return createData.response.token.server;
}

export async function getLuniiStoreDb() {
  console.log("Fetching db from lunii store");

  const token = await getGuestToken();

  const dataResponse = await fetch(
    "https://corsproxy.io/?" +
    encodeURIComponent("https://server-data-prod.lunii.com/v2/packs"),
    {
      headers: {
        "X-AUTH-TOKEN": token,
      },
    }
  );

  const response = await dataResponse.json();
  const list: LuniiDbEntry[] = Object.values(response.response);

  // Map to include full thumbnail URLs via CORS proxy to fix COEP blocks
  const enrichedList = list.map((entry) => {
    if (entry.localized_infos?.fr_FR?.image?.image_url) {
      const originalUrl = THUMBNAILS_STORAGE_ROOT + entry.localized_infos.fr_FR.image.image_url;
      (entry as any).thumbnailUrl = "https://corsproxy.io/?" + encodeURIComponent(originalUrl);
    }
    return entry;
  });

  return enrichedList;
}
