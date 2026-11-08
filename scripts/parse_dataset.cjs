const fs = require('fs');

const content = fs.readFileSync('public/assets/aistudio/listings_fea0baa7.csv', 'utf8');

function parseAllCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.length > 1) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += c;
    }
  }
  if (currentVal || currentRow.length) {
    currentRow.push(currentVal);
    if (currentRow.length > 1) rows.push(currentRow);
  }
  return rows;
}

console.log('Reading and parsing CSV...');
const rows = parseAllCSV(content);
console.log('Total parsed rows:', rows.length);

const header = rows[0];
const colMap = {};
header.forEach((h, i) => (colMap[h.trim()] = i));

console.log('Columns sample:', {
  room_type: colMap['room_type'],
  bedrooms: colMap['bedrooms'],
  neighbourhood_cleansed: colMap['neighbourhood_cleansed'],
  price: colMap['price']
});


let valid1Br = [];
const neighborhoods = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 50) continue;

  const roomType = row[colMap['room_type']];
  const bedrooms = row[colMap['bedrooms']];
  // notice spelling in inside airbnb: neighbourhood_cleansed or neighborhood_cleansed
  const neighborhood = row[colMap['neighbourhood_cleansed']] || row[colMap['neighborhood_cleansed']];
  const propertyType = row[colMap['property_type']];

  // 1-bedroom condos / entire homes/apartments
  const isEntire = roomType === 'Entire home/apt';
  const is1Bed = bedrooms === '1' || bedrooms === '1.0' || bedrooms === 1;

  if (isEntire && is1Bed && neighborhood) {
    let priceRaw = row[colMap['price']] || row[colMap['price_quote_price_per_night']];
    let priceNum = 0;
    if (priceRaw) {
      priceNum = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));
    }

    let minNights = parseInt(row[colMap['minimum_nights']], 10) || 1;
    let reviews = parseInt(row[colMap['number_of_reviews']], 10) || 0;
    let availability = parseInt(row[colMap['availability_365']], 10) || 0;

    if (priceNum > 25 && priceNum < 2000) {
      neighborhoods[neighborhood] = (neighborhoods[neighborhood] || 0) + 1;
      valid1Br.push({
        id: row[colMap['id']] || `DC-${valid1Br.length + 1}`,
        neighborhood_cleansed: neighborhood,
        price: Math.round(priceNum),
        minimum_nights: minNights,
        number_of_reviews: reviews,
        availability_365: availability,
        property_type: propertyType || 'Entire Condo/Apartment',
      });
    }
  }
}

console.log('Total extracted 1-BR Entire Home/Condos:', valid1Br.length);
console.log(
  'Top neighborhoods count:',
  Object.entries(neighborhoods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
);

// Write clean CSV (with personal identifiers stripped out!)
const outHeader = 'id,neighborhood_cleansed,price,minimum_nights,number_of_reviews,availability_365,property_type\n';
const outRows = valid1Br
  .map(
    (r) =>
      `${r.id},"${r.neighborhood_cleansed.replace(/"/g, '""')}",${r.price},${r.minimum_nights},${r.number_of_reviews},${r.availability_365},"${r.property_type.replace(/"/g, '""')}"`
  )
  .join('\n');

fs.writeFileSync('public/dc_1br_cleaned.csv', outHeader + outRows);
console.log('Saved public/dc_1br_cleaned.csv with size:', fs.statSync('public/dc_1br_cleaned.csv').size, 'bytes');

