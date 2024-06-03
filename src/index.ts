import { Hono } from "hono";

type Bindings = {
  [key in keyof CloudflareBindings]: CloudflareBindings[key];
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/.well-known/assetlinks.json", (c) => {
  type PermissionConfig = {
    relation: string[];
    target: {
      namespace: string;
      package_name: string;
      sha256_cert_fingerprints: string[];
    };
  };

  const permissions: PermissionConfig[] = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "org.gcaguilar.kmmbeers",
        sha256_cert_fingerprints: [
          "8D:0A:32:E1:AE:45:DB:B4:BF:D5:6D:B5:4D:8C:DC:56:41:0F:F6:7A:CA:68:99:24:AB:FE:2B:21:5B:EE:EA:BF",
        ],
      },
    },
  ];

  return c.json(permissions);
});

app.get("/login", (c) => {
  const formatedUrl = `${c.env.LOGIN_URL}`
    .replace("CLIENTID", `${c.env.CLIENT_ID}`)
    .replace("REDIRECT_URL", `${c.env.REDIRECT_URL}`);
  return c.json({ loginUrl: formatedUrl });
});

app.post("/authorize", async (c) => {
  interface SuccessAuthorization {
    meta: {
      http_code: number;
    };
    response: {
      access_token: string;
    };
  }

  const body = await c.req.json();

  if (!body) {
    return c.status(500);
  }

  const { code } = body;

  if (!code) {
    console.error("Invalid parameters");
    return c.status(500);
  }

  const formatedUrl = `${c.env.AUTHORIZE_URL}`
    .replace("CLIENTID", `${c.env.CLIENT_ID}`)
    .replace("CLIENTSECRET", `${c.env.CLIENT_SECRET}`)
    .replace("REDIRECT_URL", `${c.env.REDIRECT_URL}`)
    .replace("CODE", `${code}`);

  return fetch(formatedUrl, {
    headers: {
      "User-Agent": `${c.env.APP_NAME} ${c.env.CLIENT_ID}`,
    },
  })
    .then(async (res) => {
      const json: SuccessAuthorization = await res.json();
      console.log(json);
      return c.json({ access_token: `${json.response.access_token}` });
    })
    .catch((error) => {
      console.error("Error during authorization:", error);
      return c.status(500);
    });
});

export default app;
