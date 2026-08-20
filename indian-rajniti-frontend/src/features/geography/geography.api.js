/**
 * Every Indian state and union territory with its capital — demo data used
 * to register a /category/[slug] page (and an "Election in X" topic page)
 * for all 36, not just the dozen with full Chief Minister profiles in
 * politician.api.js. States without CM data still resolve fine there —
 * getCategoryInfo() just falls back to its generic description.
 */
const STATES = [
  { name: "Andhra Pradesh", capital: "Amaravati" },
  { name: "Arunachal Pradesh", capital: "Itanagar" },
  { name: "Assam", capital: "Dispur" },
  { name: "Bihar", capital: "Patna" },
  { name: "Chhattisgarh", capital: "Raipur" },
  { name: "Goa", capital: "Panaji" },
  { name: "Gujarat", capital: "Gandhinagar" },
  { name: "Haryana", capital: "Chandigarh" },
  { name: "Himachal Pradesh", capital: "Shimla" },
  { name: "Jharkhand", capital: "Ranchi" },
  { name: "Karnataka", capital: "Bangalore" },
  { name: "Kerala", capital: "Thiruvananthapuram" },
  { name: "Madhya Pradesh", capital: "Bhopal" },
  { name: "Maharashtra", capital: "Mumbai" },
  { name: "Manipur", capital: "Imphal" },
  { name: "Meghalaya", capital: "Shillong" },
  { name: "Mizoram", capital: "Aizawl" },
  { name: "Nagaland", capital: "Kohima" },
  { name: "Odisha", capital: "Bhubaneshwar" },
  { name: "Punjab", capital: "Chandigarh" },
  { name: "Rajasthan", capital: "Jaipur" },
  { name: "Sikkim", capital: "Gangtok" },
  { name: "Tamil Nadu", capital: "Chennai" },
  { name: "Telangana", capital: "Hyderabad" },
  { name: "Tripura", capital: "Agartala" },
  { name: "Uttarakhand", capital: "Dehradun" },
  { name: "Uttar Pradesh", capital: "Lucknow" },
  { name: "West Bengal", capital: "Kolkata" },
];

const UNION_TERRITORIES = [
  { name: "Andaman and Nicobar Islands", capital: "Port Blair" },
  { name: "Chandigarh", capital: "Chandigarh" },
  { name: "Dadra and Nagar Haveli and Daman & Diu", capital: "Daman" },
  { name: "Delhi", capital: "New Delhi" },
  { name: "Jammu & Kashmir", capital: "Srinagar / Jammu" },
  { name: "Ladakh", capital: "Leh" },
  { name: "Lakshadweep", capital: "Kavaratti" },
  { name: "Puducherry", capital: "Puducherry" },
];

export async function getStates() {
  return STATES;
}
export async function getUnionTerritories() {
  return UNION_TERRITORIES;
}
export async function getAllStatesAndUTs() {
  return [...STATES, ...UNION_TERRITORIES];
}
