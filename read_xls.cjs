const xlsx = require("xlsx");
const wb = xlsx.readFile("config.xlsx");
console.log(wb.SheetNames);
for (let sheet of wb.SheetNames) {
  console.log("Sheet:", sheet);
  console.log(xlsx.utils.sheet_to_json(wb.Sheets[sheet]).slice(0, 5));
}
