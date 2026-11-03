import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import type { Key } from 'react';
import moment from 'moment';
import { type Invoice, type Profile } from '@/app/lib/types';

export default function InvoiceHistory({ profile }: { profile: Profile }) {
  const renderCells = (invoice: Invoice, columnKey: Key) => {
    const cellValue = (invoice as Record<string, any>)[String(columnKey)];
    switch (columnKey) {
      case 'id':
        return <div className="flex justify-center">{cellValue}</div>;
      case 'topUpAmount':
        return (
          <div className="flex justify-center">
            <Chip>{cellValue / 100} $</Chip>
          </div>
        );
      case 'date':
        return (
          <div className="flex justify-center">
            {moment(cellValue).format('MMM Do YYYY, h:mm:ss a')}
          </div>
        );
      default:
        return cellValue;
    }
  };
  return (
    <Table topContent={<h1>Invoices</h1>} className="mt-5 2xl:mt-0 2xl:ml-4">
      <TableHeader className="border-0">
        <TableColumn className="text-center" key="id">
          ID
        </TableColumn>
        <TableColumn className="text-center" key="topUpAmount">
          Top up amount
        </TableColumn>
        <TableColumn className="text-center" key="date">
          date
        </TableColumn>
      </TableHeader>
      <TableBody items={profile.invoices} emptyContent="No invoices.">
        {(item: Invoice) => (
          <TableRow key={item.key}>
            {(columnKey) => (
              <TableCell>{renderCells(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
