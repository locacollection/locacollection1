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

// Comprehensive Pakistani Fashion Catalog (32 Curated Products across all categories)
LOCA.CATALOG_PRODUCTS = [
  // --- WOMEN'S ETHNIC & FESTIVE (IDs 1, 3, 4, 6, 12, 13, 14, 15) ---
  {
    id: 1,
    name: "Noor Embroidered Lawn Kurta",
    category: "Women - Pret & Kurtas",
    price: 5490,
    old_price: 6490,
    active: true,
    is_new: false,
    description: "Premium breathable 80-count combed cotton lawn kurta featuring delicate pastel resham threadwork across the neckline, sleeves, and hemline. Finished with handcrafted lace edging.",
    image_url: "assets/images/lawn_pret_woman_1789929194577.jpg"
  },
  {
    id: 3,
    name: "Gul-e-Rana 3-Piece Luxury Unstitched",
    category: "Women - 3-Piece & Unstitched",
    price: 11990,
    old_price: 13990,
    active: true,
    is_new: true,
    description: "Festive unstitched ensemble featuring an embroidered chiffon dupatta with heavy pallu borders, digital-printed swiss lawn front and back, and dyed luxury cambric trousers with organza border patches.",
    image_url: "assets/images/hero_pakistani_fashion_1789929181786.jpg"
  },
  {
    id: 4,
    name: "Safa Jacquard Wide-Leg Trouser",
    category: "Women - Trousers & Bottoms",
    price: 3890,
    old_price: null,
    active: true,
    is_new: false,
    description: "Self-woven gold zari jacquard trouser with a flattering wide-leg silhouette. Finished with scallop cutwork and pearl drop detailing at the hem. Perfect to pair with any festive kurta.",
    image_url: "assets/images/lawn_pret_woman_1789929194577.jpg"
  },
  {
    id: 6,
    name: "Luna Block-Print Linen Co-Ord Set",
    category: "Women - Co-Ords & Dresses",
    price: 9490,
    old_price: null,
    active: true,
    is_new: false,
    description: "Contemporary 2-piece pure linen co-ord set featuring authentic Multani wooden block print motifs in earthy indigo and terracotta, tailored with a clean relaxed band collar.",
    image_url: "assets/images/lawn_pret_woman_1789929194577.jpg"
  },
  {
    id: 12,
    name: "Mehrunissa Velvet Festive Anarkali",
    category: "Women - Formal & Festive",
    price: 18500,
    old_price: 21000,
    active: true,
    is_new: true,
    description: "Royal maroon micro-velvet kalidar frock heavily embellished with hand-crafted tilla, sitara, zardozi work and gotta kinari. Accompanied by a banarsi zari dupatta and churidar.",
    image_url: "assets/images/pakistani_festive_suit_1789929273591.jpg"
  },
  {
    id: 13,
    name: "Bahaar Chikankari Ready-to-Wear Shirt",
    category: "Women - Pret & Kurtas",
    price: 6990,
    old_price: null,
    active: true,
    is_new: true,
    description: "Pristine ivory pure cotton kurta featuring intricate shadow-work chikankari hand-embroidery with schiffli cutwork sleeves and pearl button detailing on the front placket.",
    image_url: "assets/images/lawn_pret_woman_1789929194577.jpg"
  },
  {
    id: 14,
    name: "Zarmeen Organza Angrakha Wrap Kurti",
    category: "Women - Co-Ords & Dresses",
    price: 9890,
    old_price: 11490,
    active: true,
    is_new: true,
    description: "Sheer silk organza traditional angrakha silhouette with foil mirror embroidery, handcrafted resham latkan tassels, and a raw silk slip lining. Paired with straight cropped trousers.",
    image_url: "assets/images/pakistani_festive_suit_1789929273591.jpg"
  },
  {
    id: 15,
    name: "Afreen Embroidered Lawn 3-Piece",
    category: "Women - 3-Piece & Unstitched",
    price: 8490,
    old_price: null,
    active: true,
    is_new: false,
    description: "Pastel lilac lawn front with floral kashmiri thread embroidery, printed jacquard lawn back, matching chiffon dupatta, and dyed plain cotton trousers.",
    image_url: "assets/images/hero_pakistani_fashion_1789929181786.jpg"
  },

  // --- MEN'S TRADITIONAL & FESTIVE (IDs 2, 5, 7, 11, 16, 17, 18) ---
  {
    id: 2,
    name: "Aariz Premium Egyptian Cotton Kurta",
    category: "Men - Kurta & Shalwar Kameez",
    price: 6490,
    old_price: null,
    active: true,
    is_new: false,
    description: "Woven from 100% long-staple Egyptian cotton with a silken soft hand-feel. Features a classic Pakistani band collar, bespoke metal crest buttons, and tailored single cuffs.",
    image_url: "assets/images/mens_kurta_shalwar_1789929208321.jpg"
  },
  {
    id: 5,
    name: "Rayan Raw Silk Shalwar Kameez",
    category: "Men - Kurta & Shalwar Kameez",
    price: 12490,
    old_price: 14500,
    active: true,
    is_new: false,
    description: "Handloom raw silk kameez shalwar set in deep emerald. Subtle tonal thread stitchwork along the collar, placket, and cuff seams. Includes traditional full-pleated shalwar.",
    image_url: "assets/images/pakistani_mens_sherwani_1789929286276.jpg"
  },
  {
    id: 7,
    name: "Naveed Jamawar Festive Waistcoat",
    category: "Men - Waistcoats & Formal",
    price: 10990,
    old_price: 12990,
    active: true,
    is_new: false,
    description: "Rich self-embossed gold and charcoal jamawar brocade waistcoat. Tailored with structured canvas interlining, double welt front pockets, and handcrafted antique brass buttons.",
    image_url: "assets/images/mens_kurta_shalwar_1789929208321.jpg"
  },
  {
    id: 11,
    name: "Hadi Classic Off-White Boski Kurta",
    category: "Men - Kurta & Shalwar Kameez",
    price: 8490,
    old_price: null,
    active: true,
    is_new: true,
    description: "Original pure weight silk-finish boski fabric kurta in iconic off-white. Breathable, fluid drape with traditional Pakistani round hem and hidden side pockets.",
    image_url: "assets/images/pakistani_mens_sherwani_1789929286276.jpg"
  },
  {
    id: 16,
    name: "Sheroz Italian Wool Prince Coat",
    category: "Men - Waistcoats & Formal",
    price: 19990,
    old_price: 23500,
    active: true,
    is_new: true,
    description: "Formal midnight navy prince coat tailored in imported tropical wool-blend. Features a standup mandarin collar, tonal satin piped accents, and antique silver heraldic buttons.",
    image_url: "assets/images/mens_kurta_shalwar_1789929208321.jpg"
  },
  {
    id: 17,
    name: "Zulqarnain Slub Linen Casual Kurta",
    category: "Men - Casual Shirts & Tees",
    price: 4490,
    old_price: null,
    active: true,
    is_new: false,
    description: "Breathable natural slub linen in olive sage. Styled with roll-up sleeve tabs, horn button closures, and a casual soft band collar for relaxed everyday wear.",
    image_url: "assets/images/mens_kurta_shalwar_1789929208321.jpg"
  },
  {
    id: 18,
    name: "Qasim Traditional Handloom Khaddar Suit",
    category: "Men - Kurta & Shalwar Kameez",
    price: 7990,
    old_price: null,
    active: true,
    is_new: false,
    description: "Authentic Kamalia handloom khaddar 2-piece shalwar kameez in warm earthen beige. Sturdy, crease-resistant texture with traditional contrast stitch threadwork.",
    image_url: "assets/images/pakistani_mens_sherwani_1789929286276.jpg"
  },

  // --- FOOTWEAR: KHUSSAS & PESHAWARI CHAPPALS (IDs 19, 20, 21, 22, 23, 24) ---
  {
    id: 19,
    name: "Shahzadi Velvet Tilla Embroidered Khussa",
    category: "Footwear - Women",
    price: 4490,
    old_price: 5200,
    active: true,
    is_new: true,
    description: "Artisan-crafted women's khussa with pure royal blue & maroon velvet upper, intricately embroidered in authentic golden tilla and dabka. Features double-padded genuine leather cushion sole.",
    image_url: "assets/images/pakistani_khussa_shoes_1789929225401.jpg"
  },
  {
    id: 20,
    name: "Charsadda Double-Gear Kaptaan Chappal",
    category: "Footwear - Men",
    price: 5990,
    old_price: 6990,
    active: true,
    is_new: true,
    description: "Legendary Charsadda Kaptaan cut Peshawari chappal. Handcrafted from premium mustard-tan cowhide leather with a high-durability recycled tyre tread double sole.",
    image_url: "assets/images/peshawari_chappal_men_1789929236310.jpg"
  },
  {
    id: 21,
    name: "Multani Handcrafted Mirror-Work Khussa",
    category: "Footwear - Khussa & Traditional",
    price: 3990,
    old_price: null,
    active: true,
    is_new: false,
    description: "Traditional Multani jutti featuring real glass mirror embroidery on raw silk base, vegetable tanned leather sole, and soft heel padding to avoid shoe bite.",
    image_url: "assets/images/pakistani_khussa_shoes_1789929225401.jpg"
  },
  {
    id: 22,
    name: "Balochi Norozi Leather Chappal",
    category: "Footwear - Men",
    price: 6490,
    old_price: null,
    active: true,
    is_new: false,
    description: "Authentic Quetta Norozi chappal featuring heavy welt stitching, distinctive pointed toe silhouette, and deep oxblood hand-dyed leather.",
    image_url: "assets/images/peshawari_chappal_men_1789929236310.jpg"
  },
  {
    id: 23,
    name: "Gulzar Kolhapuri Leather Slides",
    category: "Footwear - Slides & Sandals",
    price: 3290,
    old_price: null,
    active: true,
    is_new: false,
    description: "Hand-braided vegetable-tanned genuine leather flat slides with traditional tassel accents and flexible rubber-grip outsoles.",
    image_url: "assets/images/pakistani_khussa_shoes_1789929225401.jpg"
  },
  {
    id: 24,
    name: "Shehnai Raw Silk Festive Block Heels",
    category: "Footwear - Women",
    price: 5490,
    old_price: 6200,
    active: true,
    is_new: true,
    description: "Golden embroidered block heel pumps wrapped in raw silk with pearl bead border trimming and padded memory foam footbeds for festive comfort.",
    image_url: "assets/images/pakistani_khussa_shoes_1789929225401.jpg"
  },

  // --- ACCESSORIES: BAGS, SHAWLS, JEWELRY & LEATHER (IDs 8, 9, 10, 25, 26, 27, 28) ---
  {
    id: 8,
    name: "Mina Embellished Potli Clutch",
    category: "Accessories - Women",
    price: 4990,
    old_price: 5990,
    active: true,
    is_new: false,
    description: "Luxe golden zardozi drawstring potli bag accented with hanging pearl droplets, intricate embroidery, and a detachable golden chain strap.",
    image_url: "assets/images/pakistani_potli_jewelry_1789929247732.jpg"
  },
  {
    id: 9,
    name: "Kashmir Pure Wool Embroidered Shawl",
    category: "Accessories - Scarves & Shawls",
    price: 14500,
    old_price: 16990,
    active: true,
    is_new: true,
    description: "Pure velvet and fine wool shawl featuring authentic Pakistani and Kashmiri aari embroidery along all four borders. Exceptionally warm, soft, and heirloom quality.",
    image_url: "assets/images/pakistani_velvet_shawl_1789929298856.jpg"
  },
  {
    id: 10,
    name: "Ayla Artisanal Leather Shopper Tote",
    category: "Accessories - Bags & Clutches",
    price: 6990,
    old_price: null,
    active: true,
    is_new: false,
    description: "Handcrafted full-grain saddle brown leather tote bag with solid brass hardware, zipped inner security pocket, and block-printed cotton lining.",
    image_url: "assets/images/pakistani_potli_jewelry_1789929247732.jpg"
  },
  {
    id: 25,
    name: "Champa Kundan & Pearl Jhumkas",
    category: "Accessories - Jewelry & Watches",
    price: 3990,
    old_price: null,
    active: true,
    is_new: true,
    description: "Traditional 22k gold-micron plated jhumkas studded with hand-set kundan glass stones, emerald green accents, and natural seed pearl drops.",
    image_url: "assets/images/pakistani_potli_jewelry_1789929247732.jpg"
  },
  {
    id: 26,
    name: "Dastkaar Handwoven Silk Zari Dupatta",
    category: "Accessories - Scarves & Shawls",
    price: 4990,
    old_price: null,
    active: true,
    is_new: false,
    description: "Pure chanderi silk dupatta with woven gold zari borders and delicate hand-knotted fringe. An instant upgrade for any simple solid kurta.",
    image_url: "assets/images/pakistani_velvet_shawl_1789929298856.jpg"
  },
  {
    id: 27,
    name: "Sardar Bifold Leather Wallet & Belt Gift Set",
    category: "Accessories - Men",
    price: 5490,
    old_price: 6200,
    active: true,
    is_new: false,
    description: "Top-grain cowhide leather bifold wallet with RFID protection and matching reversible black/brown formal dress belt in an embossed gift box.",
    image_url: "assets/images/pakistani_potli_jewelry_1789929247732.jpg"
  },

  // --- FRAGRANCE & ATTAR (IDs 28, 29, 30) ---
  {
    id: 28,
    name: "Royal Oudh Al-Mubarak Concentrated Attar",
    category: "Fragrance - Attar & Oudh",
    price: 4990,
    old_price: 5990,
    active: true,
    is_new: true,
    description: "Pure 100% alcohol-free concentrated attar oil distilled from aged Cambodian agarwood, amber, and damascus rose. 12ml flacon with glass wand applicator.",
    image_url: "assets/images/pakistani_perfume_oudh_1789929310888.jpg"
  },
  {
    id: 29,
    name: "Raat Ki Rani (Night Blooming Jasmine) EDP",
    category: "Fragrance - Perfumes & EDP",
    price: 6490,
    old_price: null,
    active: true,
    is_new: true,
    description: "Artisanal 100ml Eau De Parfum capturing the intoxicating sweetness of Lahore's midnight jasmine, paired with white musk and creamy mysore sandalwood.",
    image_url: "assets/images/pakistani_perfume_oudh_1789929310888.jpg"
  },
  {
    id: 30,
    name: "Dehan Al-Ward Rose Body Mist & Eau De Parfum Set",
    category: "Fragrance - Body Mists & Gift Sets",
    price: 7990,
    old_price: 8990,
    active: true,
    is_new: false,
    description: "Luxury fragrance gift set featuring an all-over Taif rose shimmer body mist and matching 50ml EDP spray in an emerald velvet presentation case.",
    image_url: "assets/images/pakistani_perfume_oudh_1789929310888.jpg"
  },

  // --- KIDS & TEENS ETHNIC FESTIVE (IDs 31, 32) ---
  {
    id: 31,
    name: "Noor-e-Chasham Girls Festive Gharara Set",
    category: "Kids - Girls Festive",
    price: 6990,
    old_price: 7990,
    active: true,
    is_new: true,
    description: "3-piece festive girls set featuring a crinkle chiffon peplum with gotta kinari border work, woven jacquard flared gharara pants, and a soft net dupatta.",
    image_url: "assets/images/pakistani_kids_festive_1789929322455.jpg"
  },
  {
    id: 32,
    name: "Mirza Boys Kurta Pajama & Jamawar Waistcoat",
    category: "Kids - Boys Kurta & Waistcoat",
    price: 6490,
    old_price: null,
    active: true,
    is_new: true,
    description: "Pure cotton white kurta pajama set paired with a royal blue self-print brocade waistcoat with antique gold buttons. Perfect for Eid and family weddings.",
    image_url: "assets/images/pakistani_kids_festive_1789929322455.jpg"
  }
];
