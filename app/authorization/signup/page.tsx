'use client';

import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { EmailInput } from './EmailInput';

export default function Signup() {
  return (
    <div className="flex justify-center mt-10">
      <Card className="p-5">
        <CardHeader>
          <h2 className="mb-5 text-2xl md:text-4xl font-bold">
            Send confirmation link
          </h2>
        </CardHeader>
        <CardBody>
          <EmailInput />
        </CardBody>
      </Card>
    </div>
  );
}
