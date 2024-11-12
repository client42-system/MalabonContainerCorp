// Default prices if not set in database
const DEFAULT_PRICES = {
  'Plain': 117,
  'Lithograph': 315,
  'Class C': 115
};

// Calculate total amount for an order based on type and quantity
export const calculateOrderAmount = async (type, quantity) => {
  const price = DEFAULT_PRICES[type] || DEFAULT_PRICES['Plain']; // Default to Plain price if type not found
  return price * quantity;
};

// Export prices for use in other components
export const PRICES = DEFAULT_PRICES; 