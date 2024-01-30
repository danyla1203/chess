async function req(url: string, method: string, token: string): Promise<any>;
async function req(url: string, method: string, body: any): Promise<any>;
async function req(
  url: string,
  method = 'GET',
  tokenOrBody?: string | any,
): Promise<any> {
  const base: any = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (typeof tokenOrBody === 'string') {
    base.headers.Authorization = 'Bearer ' + tokenOrBody;
  } else {
    base.body = JSON.stringify({ ...tokenOrBody });
  }

  const result = await fetch(url, {
    method,
    ...base,
  });
  return result.json();
}

export { req };
