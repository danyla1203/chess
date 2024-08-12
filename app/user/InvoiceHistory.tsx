import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@nextui-org/react';
import { Invoice, Profile } from '../lib/context/UserContext';

export default function InvoiceHistory({ profile }: { profile: Profile }) {
  const renderCells = (invoice: Invoice, columnKey: string) => {
    const cellValue = invoice[columnKey];
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
        const date = new Date(cellValue);
        const day = date.getDay() < 10 ? `0${date.getDay()}` : date.getDay();
        const month =
          date.getMonth() < 10 ? `0${date.getMonth()}` : date.getMonth();
        return (
          <div className="flex justify-center">
            {date.getUTCHours()}:{date.getMinutes()} - {day}.{month}.
            {date.getFullYear()}
          </div>
        );
      default:
        return cellValue;
    }
  };
  return (
    <Table topContent={<h1>Invoices</h1>} className="mt-5">
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
      <TableBody items={profile.invoices} emptyContent={'No invoices.'}>
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
