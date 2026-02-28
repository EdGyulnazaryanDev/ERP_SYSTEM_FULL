import { Tabs } from 'antd';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import JournalEntriesTab from './JournalEntriesTab';
import AccountsPayableTab from './AccountsPayableTab';
import AccountsReceivableTab from './AccountsReceivableTab';
import BankAccountsTab from './BankAccountsTab';

export default function AccountingPage() {
  const items = [
    {
      key: 'chart-of-accounts',
      label: 'Chart of Accounts',
      children: <ChartOfAccountsTab />,
    },
    {
      key: 'journal-entries',
      label: 'Journal Entries',
      children: <JournalEntriesTab />,
    },
    {
      key: 'accounts-payable',
      label: 'Accounts Payable',
      children: <AccountsPayableTab />,
    },
    {
      key: 'accounts-receivable',
      label: 'Accounts Receivable',
      children: <AccountsReceivableTab />,
    },
    {
      key: 'bank-accounts',
      label: 'Bank Accounts',
      children: <BankAccountsTab />,
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Accounting</h1>
      <Tabs items={items} />
    </div>
  );
}
