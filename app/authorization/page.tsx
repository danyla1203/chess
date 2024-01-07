import * as React from 'react';
import Link from 'next/link';
import { Login } from '@/ui';

export default function LoginPage() {
  return (
    <div className="w-full max-w-xs bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <Login />
      <div>
        <a
          className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          href="#"
        >
          Forgot Password?
        </a>
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="button"
        >
          <Link href={`/authorization/signup`}>Create account</Link>
        </button>
      </div>
    </div>
  );
}
