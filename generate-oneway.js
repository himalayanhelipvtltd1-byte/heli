const fs = require('fs');
const path = require('path');

const root = __dirname;

const pairs = [
  { twoWay: 8, oneWay: 7, price: 3043 },
  { twoWay: 10, oneWay: 9, price: 6077 },
  { twoWay: 12, oneWay: 11, price: 4840 },
  { twoWay: 4, oneWay: 3, price: 11250 },
];

const returnDateBlock = /\s*<div class="form-panel screen-form-panel">\s*<h2>Return Date<\/h2>[\s\S]*?<\/div>\s*<div class="form-panel screen-form-panel">\s*<h2>Select Return Time Slot<\/h2>[\s\S]*?<\/div>\s*/;

for (const { twoWay, oneWay, price } of pairs) {
  const src = path.join(root, `booking_package_id_${twoWay}.html`);
  let html = fs.readFileSync(src, 'utf8');

  html = html.replace(/ - Two Way<\/h1>/, ' - One Way</h1>');
  html = html.replace(
    new RegExp(`(<input type="hidden" name="package_id" value=")${twoWay}(")`),
    `$1${oneWay}$2`,
  );
  html = html.replace(
    /(<select data-package-switch required>[\s\S]*?<\/select>)/,
    (select) => {
      let block = select.replace(new RegExp(`(<option value="${twoWay}") selected`, 'g'), '$1');
      block = block.replace(
        new RegExp(`(<option value="${oneWay}")(\\s*>)`, 'g'),
        '$1 selected$2',
      );
      return block;
    },
  );
  html = html.replace(returnDateBlock, '\n        \n        \n        ');
  html = html.replace(
    /<!-- <strong data-price="\d+"[^>]*>[^<]*<\/strong> -->/,
    `<!-- <strong data-price="${price}" data-price-label="Final Amount">Final Amount: ₹${price.toLocaleString('en-IN')} (₹${price.toLocaleString('en-IN')} x 1 passenger)</strong> -->`,
  );

  fs.writeFileSync(path.join(root, `booking_package_id_${oneWay}.html`), html);
  console.log('created booking_package_id_' + oneWay + '.html');
}
