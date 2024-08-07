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
      case 'amount':
        return <Chip>{cellValue}</Chip>;
      case 'date':
        return <div className="flex justify-center">{cellValue}</div>;
      default:
        return cellValue;
    }
  };
  return (
    <Table topContent={<h1>Invoices</h1>}>
      <TableHeader className="border-0">
        <TableColumn key="id">ID</TableColumn>
        <TableColumn key="amount">Top up amount</TableColumn>
        <TableColumn key="date">date</TableColumn>
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
