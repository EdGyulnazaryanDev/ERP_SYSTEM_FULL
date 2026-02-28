import { Tabs } from 'antd';
import ChannelsTab from './ChannelsTab';
import MessagesTab from './MessagesTab';
import NotificationsTab from './NotificationsTab';

export default function CommunicationPage() {
  const items = [
    { key: 'channels', label: 'Channels', children: <ChannelsTab /> },
    { key: 'messages', label: 'Messages', children: <MessagesTab /> },
    { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Communication</h1>
      <Tabs items={items} />
    </div>
  );
}
