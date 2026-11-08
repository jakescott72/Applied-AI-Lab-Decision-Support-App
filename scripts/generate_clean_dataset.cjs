const fs = require('fs');

const rawCsv = fs.readFileSync('public/assets/aistudio/listings_fea0baa7.csv', 'utf8');

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

console.log('Parsing raw CSV...');
const rows = parseAllCSV(rawCsv);
console.log('Total parsed rows:', rows.length);

const header = rows[0];
const colMap = {};
header.forEach((h, i) => (colMap[h.trim()] = i));

const cleanListings = [];
const neighborhoodCounts = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 50) continue;

  const roomType = row[colMap['room_type']];
  const bedrooms = row[colMap['bedrooms']];
  const rawNeigh = row[colMap['neighbourhood_cleansed']] || row[colMap['neighborhood_cleansed']];
  const propertyType = row[colMap['property_type']];
  const name = row[colMap['name']] || '';
  const desc = row[colMap['description']] || '';

  const isEntire = roomType === 'Entire home/apt';
  const is1Bed = bedrooms === '1' || bedrooms === '1.0' || bedrooms === 1;

  if (isEntire && is1Bed && rawNeigh) {
    let priceRaw = row[colMap['price']] || row[colMap['price_quote_price_per_night']];
    let priceNum = 0;
    if (priceRaw) {
      priceNum = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));
    }

    let minNights = parseInt(row[colMap['minimum_nights']], 10) || 1;
    let reviews = parseInt(row[colMap['number_of_reviews']], 10) || 0;
    let availability = parseInt(row[colMap['availability_365']], 10) || 0;

    if (priceNum >= 35 && priceNum <= 1500) {
      // Map neighborhood to canonical friendly D.C. submarket
      let canonicalNeighborhood = rawNeigh;
      const combinedText = (name + ' ' + desc + ' ' + rawNeigh).toLowerCase();

      if (rawNeigh.includes('Shaw, Logan Circle')) {
        if (combinedText.includes('logan circle') || combinedText.includes('logan') || combinedText.includes('14th st')) {
          canonicalNeighborhood = 'Logan Circle';
        } else if (combinedText.includes('shaw') || combinedText.includes('7th st') || combinedText.includes('9th st')) {
          canonicalNeighborhood = 'Shaw';
        } else {
          // split evenly or keep Logan Circle
          canonicalNeighborhood = cleanListings.length % 2 === 0 ? 'Logan Circle' : 'Shaw';
        }
      } else if (rawNeigh.includes('Dupont Circle')) {
        canonicalNeighborhood = 'Dupont Circle';
      } else if (rawNeigh.includes('Capitol Hill')) {
        canonicalNeighborhood = 'Capitol Hill';
      } else if (rawNeigh.includes('Georgetown')) {
        canonicalNeighborhood = 'Georgetown';
      } else if (rawNeigh.includes('Adams Morgan')) {
        canonicalNeighborhood = 'Adams Morgan';
      } else if (rawNeigh.includes('Downtown, Chinatown')) {
        canonicalNeighborhood = 'Downtown / Penn Quarter';
      } else if (rawNeigh.includes('Southwest Employment Area') || rawNeigh.includes('Southwest/Waterfront')) {
        canonicalNeighborhood = 'Navy Yard / Waterfront';
      } else if (rawNeigh.includes('Howard University, Le Droit Park, Cardozo/Shaw')) {
        canonicalNeighborhood = 'Shaw';
      } else if (rawNeigh.includes('Union Station')) {
        canonicalNeighborhood = 'Capitol Hill';
      } else if (rawNeigh.includes('Edgewood, Bloomingdale')) {
        canonicalNeighborhood = 'Bloomingdale / Eckington';
      } else if (rawNeigh.includes('Columbia Heights')) {
        canonicalNeighborhood = 'Columbia Heights';
      } else if (rawNeigh.includes('Brightwood Park, Crestwood, Petworth')) {
        canonicalNeighborhood = 'Petworth';
      } else if (rawNeigh.includes('West End, Foggy Bottom')) {
        canonicalNeighborhood = 'Foggy Bottom / West End';
      }

      neighborhoodCounts[canonicalNeighborhood] = (neighborhoodCounts[canonicalNeighborhood] || 0) + 1;

      cleanListings.push({
        id: row[colMap['id']] || `DC-${cleanListings.length + 1}`,
        neighborhood_cleansed: canonicalNeighborhood,
        raw_neighborhood: rawNeigh,
        price: Math.round(priceNum),
        minimum_nights: minNights,
        number_of_reviews: reviews,
        availability_365: availability,
        property_type: propertyType || '1-Bedroom Condo/Apartment',
      });
    }
  }
}

console.log('Cleaned 1-BR records count:', cleanListings.length);
console.log(
  'Cleaned Neighborhood Counts:',
  Object.entries(neighborhoodCounts).sort((a, b) => b[1] - a[1])
);

// Save public/dc_1br_cleaned.csv
const csvHeader = 'id,neighborhood_cleansed,raw_neighborhood,price,minimum_nights,number_of_reviews,availability_365,property_type\n';
const csvRows = cleanListings
  .map(
    (l) =>
      `${l.id},"${l.neighborhood_cleansed.replace(/"/g, '""')}","${l.raw_neighborhood.replace(/"/g, '""')}",${l.price},${l.minimum_nights},${l.number_of_reviews},${l.availability_365},"${l.property_type.replace(/"/g, '""')}"`
  )
  .join('\n');

fs.writeFileSync('public/dc_1br_cleaned.csv', csvHeader + csvRows);
console.log('Saved public/dc_1br_cleaned.csv (Size: ' + fs.statSync('public/dc_1br_cleaned.csv').size + ' bytes)');

// Also write src/data/embeddedCleanedListings.ts so it can be imported synchronously or used as immediate initial state!
const tsContent = `// Pre-parsed embedded dataset of Washington D.C. 1-Bedroom Condos & Entire Homes
// Stripped of all personal identifiers (host names, host IDs, user URLs)
import { DcListing } from '../types';

export const EMBEDDED_DC_1BR_LISTINGS: DcListing[] = ${JSON.stringify(cleanListings, null, 2)};
`;

fs.writeFileSync('src/data/embeddedCleanedListings.ts', tsContent);
console.log('Saved src/data/embeddedCleanedListings.ts (Records: ' + cleanListings.length + ')');
