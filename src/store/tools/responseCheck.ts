type ServerError = {
  code: Response['status'];
  error: Response['statusText'];
  err: boolean;
  data?: any;
};
type OkResponse<T> = {
  code: Response['status'];
  data: T;
  err: false;
};

export const responseCheck = async <T>(
  res: Response,
): Promise<OkResponse<T> | ServerError> => {
  if (res.status >= 200 && res.status < 300) {
    return { err: false, code: res.status, data: await res.json() };
  }
  return { err: true, code: res.status, error: res.statusText };
};
