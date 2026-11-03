export type NotificationType = 'error' | 'info';

export type NotificationData = {
  id: number;
  type: NotificationType;
  message: string;
};

export function NotificationItem({
  type,
  message,
}: {
  type: NotificationType;
  message: string;
}) {
  return (
    <div
      className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 relative"
      role="alert"
    >
      <p className="font-bold">{type}</p>
      <p>{message}</p>
    </div>
  );
}

export function NotificationStack({
  notifications,
}: {
  notifications: NotificationData[];
}) {
  return (
    <div className="absolute flex flex-col inset-y-0 right-0 z-40">
      {notifications.map((n) => (
        <NotificationItem key={n.id} type={n.type} message={n.message} />
      ))}
    </div>
  );
}
