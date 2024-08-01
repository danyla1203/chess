import { Button, Link } from '@nextui-org/react';

export function Failed() {
  return (
    <div className="bg-zinc-300 p-10 mx-auto mb-20">
      <svg
        viewBox="0 0 77 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-16 h-16 mx-auto my-6"
      >
        <path
          d="M96 49.8701C96 77.4126 74.5097 99.7403 48 99.7403C21.4903 99.7403 0 77.4126 0 49.8701C0 22.3276 21.4903 0 48 0C74.5097 0 96 22.3276 96 49.8701Z"
          fill="#BB1111"
        />
        <line
          x1="23.7071"
          y1="24.2929"
          x2="73.7071"
          y2="74.2929"
          stroke="#FF0000"
          stroke-width="2"
        />
        <line
          x1="23.2929"
          y1="73.2929"
          x2="72.2929"
          y2="24.2929"
          stroke="#FF0000"
          stroke-width="2"
        />
      </svg>

      <div className="text-center">
        <h3 className="md:text-3xl text-base text-gray-900 font-semibold text-center">
          Something went wrong with the payment
        </h3>
        <p className="text-gray-600 my-2 md:text-xl">
          Try to contact with the moderators
        </p>
        <Button
          href="http://localhost:3000/user"
          as={Link}
          color="primary"
          size="lg"
          variant="solid"
          className="mt-4"
        >
          To Profile page
        </Button>
      </div>
    </div>
  );
}
