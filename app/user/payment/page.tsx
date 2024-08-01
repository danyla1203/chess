import { PaymentResultNotification } from './ResultNotification';

export default function Page() {
  return (
    <div className="bg-zinc-900 h-[calc(100vh-64px)] flex flex-col justify-center ">
      <PaymentResultNotification />
    </div>
  );
}
