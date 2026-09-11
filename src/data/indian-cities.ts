export type IndianCity = { city: string; pincode: string };

// Representative central PIN codes for search suggestions. Users can still type any city or PIN code.
export const indianCities: IndianCity[] = [
  ["Agartala", "799001"], ["Agra", "282001"], ["Ahmedabad", "380001"], ["Aizawl", "796001"], ["Ajmer", "305001"], ["Aligarh", "202001"], ["Amritsar", "143001"], ["Anand", "388001"], ["Aurangabad", "431001"],
  ["Bangalore", "560001"], ["Bareilly", "243001"], ["Belagavi", "590001"], ["Bhagalpur", "812001"], ["Bharatpur", "321001"], ["Bharuch", "392001"], ["Bhavnagar", "364001"], ["Bhilai", "490006"], ["Bhopal", "462001"], ["Bhubaneswar", "751001"], ["Bikaner", "334001"], ["Bilaspur", "495001"], ["Bokaro", "827001"],
  ["Chandigarh", "160017"], ["Chennai", "600001"], ["Coimbatore", "641001"], ["Cuttack", "753001"],
  ["Darbhanga", "846004"], ["Darjeeling", "734101"], ["Dehradun", "248001"], ["Delhi", "110001"], ["Dhanbad", "826001"], ["Dibrugarh", "786001"], ["Durgapur", "713201"],
  ["Faridabad", "121001"], ["Gandhinagar", "382010"], ["Gangtok", "737101"], ["Gaya", "823001"], ["Ghaziabad", "201001"], ["Gorakhpur", "273001"], ["Greater Noida", "201310"], ["Guntur", "522002"], ["Gurugram", "122001"], ["Guwahati", "781001"], ["Gwalior", "474001"],
  ["Haridwar", "249401"], ["Hisar", "125001"], ["Hubballi", "580020"], ["Hyderabad", "500001"],
  ["Imphal", "795001"], ["Indore", "452001"], ["Itanagar", "791111"],
  ["Jabalpur", "482001"], ["Jaipur", "302001"], ["Jalandhar", "144001"], ["Jammu", "180001"], ["Jamnagar", "361001"], ["Jamshedpur", "831001"], ["Jodhpur", "342001"],
  ["Kakinada", "533001"], ["Kanpur", "208001"], ["Kochi", "682001"], ["Kolhapur", "416003"], ["Kolkata", "700001"], ["Kota", "324001"], ["Kozhikode", "673001"], ["Kurnool", "518001"],
  ["Leh", "194101"], ["Lucknow", "226001"], ["Ludhiana", "141001"],
  ["Madurai", "625001"], ["Mangaluru", "575001"], ["Meerut", "250001"], ["Mohali", "160055"], ["Moradabad", "244001"], ["Mumbai", "400001"], ["Mysuru", "570001"],
  ["Nagpur", "440001"], ["Nashik", "422001"], ["Navi Mumbai", "400703"], ["Nellore", "524001"], ["Noida", "201301"],
  ["Panaji", "403001"], ["Patiala", "147001"], ["Patna", "800001"], ["Pimpri-Chinchwad", "411018"], ["Pondicherry", "605001"], ["Port Blair", "744101"], ["Prayagraj", "211001"], ["Pune", "411001"], ["Puri", "752001"],
  ["Raipur", "492001"], ["Rajahmundry", "533101"], ["Rajkot", "360001"], ["Ranchi", "834001"], ["Rohtak", "124001"], ["Rourkela", "769001"],
  ["Saharanpur", "247001"], ["Salem", "636001"], ["Shillong", "793001"], ["Shimla", "171001"], ["Siliguri", "734001"], ["Srinagar", "190001"], ["Surat", "395003"],
  ["Thane", "400601"], ["Thiruvananthapuram", "695001"], ["Thrissur", "680001"], ["Tiruchirappalli", "620001"], ["Tirupati", "517501"], ["Udaipur", "313001"], ["Udupi", "576101"], ["Ujjain", "456001"], ["Vadodara", "390001"], ["Varanasi", "221001"], ["Vellore", "632001"], ["Vijayawada", "520001"], ["Visakhapatnam", "530001"], ["Warangal", "506002"],
].map(([city, pincode]) => ({ city, pincode }));

export type IndianLocality = { area: string; city: string };

// Popular neighborhoods and residential societies used for finer-grained location suggestions.
export const indianLocalities: IndianLocality[] = [
  ["Gaur City 1", "Greater Noida West"], ["Gaur City 2", "Greater Noida West"], ["Gaur City 4th Avenue", "Greater Noida West"], ["Gaur City Center", "Greater Noida West"],
  ["Sector 18", "Noida"], ["Sector 62", "Noida"], ["Sector 63", "Noida"], ["Sector 137", "Noida"], ["Sector 150", "Noida"],
  ["Indirapuram", "Ghaziabad"], ["Vaishali", "Ghaziabad"], ["Raj Nagar Extension", "Ghaziabad"],
  ["DLF Phase 1", "Gurugram"], ["DLF Phase 2", "Gurugram"], ["Sushant Lok", "Gurugram"], ["Sector 56", "Gurugram"], ["Golf Course Road", "Gurugram"],
  ["Dwarka", "Delhi"], ["Rohini", "Delhi"], ["Lajpat Nagar", "Delhi"], ["Saket", "Delhi"],
  ["HSR Layout", "Bangalore"], ["Koramangala", "Bangalore"], ["Whitefield", "Bangalore"], ["Electronic City", "Bangalore"], ["Indiranagar", "Bangalore"], ["BTM Layout", "Bangalore"], ["Marathahalli", "Bangalore"],
  ["Hinjewadi", "Pune"], ["Kharadi", "Pune"], ["Baner", "Pune"], ["Wakad", "Pune"], ["Viman Nagar", "Pune"],
  ["Andheri", "Mumbai"], ["Powai", "Mumbai"], ["Malad", "Mumbai"], ["Bandra", "Mumbai"], ["Thane West", "Thane"],
  ["Gachibowli", "Hyderabad"], ["Hitech City", "Hyderabad"], ["Kondapur", "Hyderabad"], ["Madhapur", "Hyderabad"], ["Banjara Hills", "Hyderabad"],
].map(([area, city]) => ({ area, city }));

export type LocationSuggestion = { label: string; hint: string };

/** Matches both localities (e.g. "Gaur City 1") and cities/PIN codes for a single location search box. */
export function searchLocations(query: string, limit = 8): LocationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const localityMatches = indianLocalities.filter(({ area }) => area.toLowerCase().includes(q)).map(({ area, city }) => ({ label: area, hint: city }));
  const cityMatches = indianCities.filter(({ city, pincode }) => city.toLowerCase().includes(q) || pincode.startsWith(q)).map(({ city, pincode }) => ({ label: city, hint: `PIN ${pincode}` }));
  return [...localityMatches, ...cityMatches].slice(0, limit);
}
