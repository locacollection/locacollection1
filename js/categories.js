window.LOCA = window.LOCA || {};

LOCA.CATEGORY_TAXONOMY = [
  {
    id: "All",
    label: "All",
    subcategories: []
  },
  {
    id: "Women",
    label: "Women",
    subcategories: [
      { id: "Women - Pret & Kurtas", label: "Pret & Kurtas" },
      { id: "Women - 3-Piece & Unstitched", label: "3-Piece & Unstitched" },
      { id: "Women - Formal & Festive", label: "Formal & Festive" },
      { id: "Women - Trousers & Bottoms", label: "Trousers & Bottoms" },
      { id: "Women - Co-Ords & Dresses", label: "Co-Ords & Western" }
    ]
  },
  {
    id: "Men",
    label: "Men",
    subcategories: [
      { id: "Men - Kurta & Shalwar Kameez", label: "Kurta & Shalwar Kameez" },
      { id: "Men - Waistcoats & Formal", label: "Waistcoats & Formal" },
      { id: "Men - Casual Shirts & Tees", label: "Casual Shirts & Tees" },
      { id: "Men - Jackets & Overshirts", label: "Jackets & Overshirts" },
      { id: "Men - Trousers & Pants", label: "Trousers & Pants" }
    ]
  },
  {
    id: "Footwear",
    label: "Footwear",
    subcategories: [
      { id: "Footwear - Women", label: "Women's Footwear" },
      { id: "Footwear - Men", label: "Men's Footwear" },
      { id: "Footwear - Khussa & Traditional", label: "Traditional Khussa & Chappal" },
      { id: "Footwear - Slides & Sandals", label: "Slides & Casual Sandals" },
      { id: "Footwear - Formal Shoes", label: "Formal & Loafers" }
    ]
  },
  {
    id: "Accessories",
    label: "Accessories",
    subcategories: [
      { id: "Accessories - Women", label: "Women's Accessories" },
      { id: "Accessories - Men", label: "Men's Accessories" },
      { id: "Accessories - Bags & Clutches", label: "Bags & Clutches" },
      { id: "Accessories - Scarves & Shawls", label: "Scarves & Shawls" },
      { id: "Accessories - Jewelry & Watches", label: "Jewelry & Accents" },
      { id: "Accessories - Wallets & Belts", label: "Wallets & Belts" }
    ]
  },
  {
    id: "Fragrance",
    label: "Fragrance & Beauty",
    subcategories: [
      { id: "Fragrance - Attar & Oudh", label: "Traditional Attar & Oudh" },
      { id: "Fragrance - Perfumes & EDP", label: "Perfumes & EDP" },
      { id: "Fragrance - Body Mists & Gift Sets", label: "Body Mists & Gift Sets" }
    ]
  },
  {
    id: "Kids",
    label: "Kids & Teens",
    subcategories: [
      { id: "Kids - Girls Festive", label: "Girls Festive & Kurtis" },
      { id: "Kids - Boys Kurta & Waistcoat", label: "Boys Kurta & Waistcoat" },
      { id: "Kids - Casual & Everyday", label: "Casual & Everyday" }
    ]
  }
];

// Helper flat list of all selectable category names for datalists & options
LOCA.getAllCategoriesList = function() {
  const result = [];
  LOCA.CATEGORY_TAXONOMY.forEach(cat => {
    if (cat.id === "All") return;
    result.push(cat.id);
    if (cat.subcategories && cat.subcategories.length) {
      cat.subcategories.forEach(sub => {
        result.push(sub.id);
      });
    }
  });
  return result;
};
