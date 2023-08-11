export type ReqBody<M> = {
  method: M;
  headers: {
    accept: 'application/json';
    'Content-Type': 'application/json';
    Authorization?: string;
  };
  body?: string;
};

export const GetRequest = (token?: string): ReqBody<'GET'> => {
  const reqBody: any = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    reqBody.headers.Authorization = `Bearer ${token}`;
  }

  return reqBody;
};
export const PostRequest = (body: any, token?: string): ReqBody<'POST'> => {
  const reqBody: any = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    reqBody.headers.Authorization = `Bearer ${token}`;
  }
  if (body) reqBody.body = JSON.stringify(body);

  return reqBody;
};
export const PutRequest = (body: any, token?: string): ReqBody<'PUT'> => {
  const reqBody: any = {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    reqBody.headers.Authorization = `Bearer ${token}`;
  }
  if (body) reqBody.body = JSON.stringify(body);

  return reqBody;
};
export const DeleteRequest = (token?: string): ReqBody<'DELETE'> => {
  const reqBody: any = {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    reqBody.headers.Authorization = `Bearer ${token}`;
  }

  return reqBody;
};
export const PatchRequest = (body: any, token?: string): ReqBody<'PATCH'> => {
  const reqBody: any = {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    reqBody.headers.Authorization = `Bearer ${token}`;
  }
  if (body) reqBody.body = JSON.stringify(body);

  return reqBody;
};
