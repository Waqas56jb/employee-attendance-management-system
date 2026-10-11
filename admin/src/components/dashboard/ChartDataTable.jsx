/**
 * Screen-reader table view of a chart's data, so no value is reachable only
 * by hovering. columns: [{ key, header, value: (row) => string }]
 */
export function ChartDataTable({ caption, columns, rows, getRowId = (row, i) => row.key ?? row.id ?? i }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col">
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={getRowId(row, i)}>
            {columns.map((c) => (
              <td key={c.key}>{c.value(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
