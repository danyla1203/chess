import { Spinner } from '@nextui-org/react';

export function Loader() {
  return (
    <Spinner
      label="Loading..."
      color="warning"
      className="absolute top-0 bottom-0 left-0 right-0 m-auto h-20 w-20"
      size="lg"
    />
  );
}
