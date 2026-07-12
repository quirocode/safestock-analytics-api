class CsvReportExporter{export(rows){const headers=['id','fecha','estado','subtotal','igv','total','cajero'];const escape=value=>`"${String(value??'').replaceAll('"','""')}"`;return Buffer.from([headers.join(','),...rows.map(row=>headers.map(h=>escape(row[h])).join(','))].join('\n'),'utf8');}}
module.exports=CsvReportExporter;
