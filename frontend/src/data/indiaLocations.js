/** India location masters for enterprise company address forms. */

export const COUNTRIES = [
  { value: "India", label: "India" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Singapore", label: "Singapore" },
  { value: "Other", label: "Other" },
];

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/** GST state codes (2-digit). */
export const INDIAN_STATE_CODES = {
  "Andaman and Nicobar Islands": "35",
  "Andhra Pradesh": "37",
  "Arunachal Pradesh": "12",
  Assam: "18",
  Bihar: "10",
  Chandigarh: "04",
  Chhattisgarh: "22",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  Delhi: "07",
  Goa: "30",
  Gujarat: "24",
  Haryana: "06",
  "Himachal Pradesh": "02",
  "Jammu and Kashmir": "01",
  Jharkhand: "20",
  Karnataka: "29",
  Kerala: "32",
  Ladakh: "38",
  Lakshadweep: "31",
  "Madhya Pradesh": "23",
  Maharashtra: "27",
  Manipur: "14",
  Meghalaya: "17",
  Mizoram: "15",
  Nagaland: "13",
  Odisha: "21",
  Puducherry: "34",
  Punjab: "03",
  Rajasthan: "08",
  Sikkim: "11",
  "Tamil Nadu": "33",
  Telangana: "36",
  Tripura: "16",
  "Uttar Pradesh": "09",
  Uttarakhand: "05",
  "West Bengal": "19",
};

/** Major cities keyed by state (searchable dropdown options). */
export const CITIES_BY_STATE = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kakinada", "Rajahmundry", "Anantapur"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar", "Ramagundam", "Secunderabad"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Ballari", "Davangere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur", "Kolhapur", "Navi Mumbai"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bhilwara"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad", "Prayagraj", "Meerut"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali", "Bathinda"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rishikesh"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  Chandigarh: ["Chandigarh"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  Ladakh: ["Leh", "Kargil"],
  Manipur: ["Imphal"],
  Meghalaya: ["Shillong"],
  Mizoram: ["Aizawl"],
  Nagaland: ["Kohima", "Dimapur"],
  Sikkim: ["Gangtok"],
  Tripura: ["Agartala"],
  "Arunachal Pradesh": ["Itanagar"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Lakshadweep: ["Kavaratti"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
};

/**
 * PIN prefix (first 3 digits) → { state, city } for common Indian PIN ranges.
 * Used for auto-fill when a valid 6-digit PIN is entered.
 */
export const PIN_PREFIX_LOOKUP = {
  110: { state: "Delhi", city: "New Delhi" },
  121: { state: "Haryana", city: "Faridabad" },
  122: { state: "Haryana", city: "Gurugram" },
  140: { state: "Punjab", city: "Mohali" },
  141: { state: "Punjab", city: "Ludhiana" },
  143: { state: "Punjab", city: "Amritsar" },
  160: { state: "Chandigarh", city: "Chandigarh" },
  201: { state: "Uttar Pradesh", city: "Noida" },
  208: { state: "Uttar Pradesh", city: "Kanpur" },
  226: { state: "Uttar Pradesh", city: "Lucknow" },
  221: { state: "Uttar Pradesh", city: "Varanasi" },
  282: { state: "Uttar Pradesh", city: "Agra" },
  302: { state: "Rajasthan", city: "Jaipur" },
  342: { state: "Rajasthan", city: "Jodhpur" },
  313: { state: "Rajasthan", city: "Udaipur" },
  380: { state: "Gujarat", city: "Ahmedabad" },
  395: { state: "Gujarat", city: "Surat" },
  390: { state: "Gujarat", city: "Vadodara" },
  400: { state: "Maharashtra", city: "Mumbai" },
  401: { state: "Maharashtra", city: "Thane" },
  411: { state: "Maharashtra", city: "Pune" },
  440: { state: "Maharashtra", city: "Nagpur" },
  500: { state: "Telangana", city: "Hyderabad" },
  501: { state: "Telangana", city: "Hyderabad" },
  506: { state: "Telangana", city: "Warangal" },
  520: { state: "Andhra Pradesh", city: "Vijayawada" },
  530: { state: "Andhra Pradesh", city: "Visakhapatnam" },
  560: { state: "Karnataka", city: "Bengaluru" },
  570: { state: "Karnataka", city: "Mysuru" },
  575: { state: "Karnataka", city: "Mangaluru" },
  600: { state: "Tamil Nadu", city: "Chennai" },
  641: { state: "Tamil Nadu", city: "Coimbatore" },
  625: { state: "Tamil Nadu", city: "Madurai" },
  682: { state: "Kerala", city: "Kochi" },
  695: { state: "Kerala", city: "Thiruvananthapuram" },
  700: { state: "West Bengal", city: "Kolkata" },
  751: { state: "Odisha", city: "Bhubaneswar" },
  800: { state: "Bihar", city: "Patna" },
  834: { state: "Jharkhand", city: "Ranchi" },
  462: { state: "Madhya Pradesh", city: "Bhopal" },
  452: { state: "Madhya Pradesh", city: "Indore" },
  492: { state: "Chhattisgarh", city: "Raipur" },
  781: { state: "Assam", city: "Guwahati" },
  248: { state: "Uttarakhand", city: "Dehradun" },
  403: { state: "Goa", city: "Panaji" },
};

export function validateIndianPin(value) {
  const rawValue = String(value || "");
  const digits = rawValue.replace(/\D/g, "");
  
  if (!digits) return "PIN Code is required.";
  
  // Check for non-numeric characters
  if (rawValue !== digits) return "PIN Code must contain only numeric digits.";
  
  if (digits.length !== 6) return "PIN Code must be exactly 6 digits.";
  if (digits[0] === "0") return "PIN Code cannot start with 0.";
  return "";
}

export function lookupPin(pin) {
  const digits = String(pin || "").replace(/\D/g, "");
  if (digits.length < 3) return null;
  return PIN_PREFIX_LOOKUP[digits.slice(0, 3)] || null;
}

export function citiesForState(state) {
  if (!state) return [];
  return CITIES_BY_STATE[state] || [];
}

export function stateCodeFor(state) {
  return INDIAN_STATE_CODES[state] || "";
}
