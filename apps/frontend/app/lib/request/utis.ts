export type Failable<T> = T & { error?: string };

async function req<T = any>(url: string, method: string): Promise<Failable<T>>;
async function req<T = any>(
  url: string,
  method: string,
  token: string | null,
): Promise<Failable<T>>;
async function req<T = any>(
  url: string,
  method: string,
  body: object,
): Promise<Failable<T>>;
async function req(
  url: string,
  method = 'GET',
  tokenOrBody?: string | object | null,
): Promise<any> {
  const base: any = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (typeof tokenOrBody === 'string') {
    base.headers.Authorization = 'Bearer ' + tokenOrBody;
  } else if (!!tokenOrBody) {
    base.body = JSON.stringify({ ...tokenOrBody });
  }

  const result = await fetch(url, {
    method,
    ...base,
  });
  return result.json();
}

export { req };
