import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, Search, Menu, X, MessageCircle, Phone, MapPin, Mail, Clock,
  Star, ChevronRight, ChevronDown, Plus, Minus, Trash2, Wrench, Smartphone,
  ShieldCheck, Truck, BadgeCheck, ArrowRight, Facebook, Instagram, Twitter,
  Filter, SlidersHorizontal, CheckCircle2, Battery, Zap, Cpu, Camera,
  Fingerprint, ScanFace, HardDrive, Mic, Volume2, Laptop, Tablet, Wifi,
  ImageOff, AlertTriangle, XCircle
} from "lucide-react";

/* ============================================================
   OMB STORES — SITE CONFIGURATION
   Everything an owner needs to edit lives in this block.
   Nothing here is invented — empty values render nothing rather
   than a fake placeholder.
============================================================ */
const WHATSAPP_NUMBER = "233544570533"; // OMB Stores WhatsApp number (digits only, no +)
const CONTACT_PHONE = "+233 20 139 0997";
const CONTACT_EMAIL = "ombstoresgh@gmail.com";
const BUSINESS_ADDRESS = "Kasoa Danchira, Mataheko Junction, Ghana";
const BUSINESS_NAME = "OMB Stores";

// Leave empty until the real domain is live — avoids publishing a fake canonical URL.
const SITE_URL = "";

// Only a rendered icon links out — leave blank until the account exists.
const SOCIAL_LINKS = {
  facebook: "",
  instagram: "",
  twitter: "",
  tiktok: "https://www.tiktok.com/@ombstoresgh",
};

// Used to build the embedded map and, later, JSON-LD. Update if the pin needs to move.
const GOOGLE_MAPS_QUERY = "5.6263057,-0.4005232";
const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/bDtkds2hDoZ9XFoA6?g_st=ac";

// Not published until confirmed by the business — kept null rather than guessed.
const OPENING_HOURS = [
  { day: "Monday–Saturday", opens: "08:00", closes: "19:00" },
  { day: "Sunday", opens: "10:00", closes: "17:00" },
];

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ============================================================
   WHATSAPP MESSAGE BUILDERS
   Every message is composed as a normal JS string with real
   newlines, then encoded exactly once by waLink(). No manual
   "%0A" splicing, no double-encoding.
============================================================ */
function buildProductEnquiryMessage(product, qty = 1) {
  const lines = [
    `Hi ${BUSINESS_NAME}, I'd like to ask about a product.`,
    "",
    `Product: ${product.name}`,
    `Quantity: ${qty}`,
    product.price == null ? "Price: On request" : `Price: GH₵${(product.price * qty).toLocaleString()}`,
  ];
  return lines.join("\n");
}

function buildOrderMessage({ name, phone, items, subtotal }) {
  const lines = [
    `Hi ${BUSINESS_NAME}, I'd like to place an order.`,
    "",
    "Customer:",
    `Name: ${name || "(not provided)"}`,
    `Phone: ${phone || "(not provided)"}`,
    "",
    "Items:",
  ];
  items.forEach((i) => {
    lines.push(`${i.product.name} × ${i.qty} — GH₵${(i.product.price * i.qty).toLocaleString()}`);
  });
  lines.push("", `Total: GH₵${subtotal.toLocaleString()}`, "", "Please confirm availability and delivery/pickup options.");
  return lines.join("\n");
}

function buildRepairMessage({ device, problem, date, name, phone }) {
  const lines = [
    `Hi ${BUSINESS_NAME}, I'd like to book a repair.`,
    "",
    `Device: ${device}`,
    `Problem: ${problem}`,
    `Preferred date/time: ${date || "Flexible"}`,
    `Name: ${name}`,
    `Phone/WhatsApp: ${phone}`,
  ];
  return lines.join("\n");
}

function buildInstallmentMessage(product) {
  const lines = [
    `Hi ${BUSINESS_NAME}, I'd like to enquire about installment payments.`,
    "",
    `Phone: ${product.name}`,
    product.price == null ? "Advertised price: On request" : `Advertised price: GH₵${product.price.toLocaleString()}`,
    "",
    "Please let me know the deposit amount, plan duration and eligibility.",
  ];
  return lines.join("\n");
}

function buildContactMessage({ name, email, message }) {
  const lines = [
    `Hi ${BUSINESS_NAME}, I sent this via the website contact form.`,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message,
  ];
  return lines.join("\n");
}

/* ============================================================
   DESIGN TOKENS
============================================================ */
const C = {
  ink: "#0A0F27",
  surface: "#11183A",
  surface2: "#182150",
  line: "#2A3566",
  gold: "#FFD23F",
  goldDim: "#8A6E1C",
  teal: "#3B8EF3",
  red: "#E8495C",
  amber: "#F5A524",
  text: "#F5F7FC",
  muted: "#9CA8D4",
  faint: "#5F6B99",
};

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');";

/* ============================================================
   PRODUCT CATALOG
   Structured so it can be swapped for a real API/database later:
   every product is a flat, serializable object with the same
   shape. `image`/`images` are real file paths to be supplied by
   the business — until then ProductImage renders a clean
   in-brand fallback instead of a broken-image icon.
   `stockQuantity` is left null (not invented) for existing
   items; set a real number per product when known and the UI
   will automatically show Low Stock / Out of Stock and cap
   cart quantity.
============================================================ */
const CATEGORIES = [
  "Smartphones", "Phone Cases", "Screen Protectors", "Chargers", "Cables",
  "Power Banks", "Earbuds", "Headsets", "Smartwatches", "Speakers",
  "Memory Cards", "Flash Drives",
];

const ACCESSORY_CATEGORIES = CATEGORIES.filter((c) => c !== "Smartphones");

const BRANDS = ["Apple", "Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Oppo", "Vivo"];

const ICONS = {
  Smartphones: Smartphone, "Phone Cases": ShieldCheck, "Screen Protectors": ShieldCheck,
  Chargers: Zap, Cables: Cpu, "Power Banks": Battery, Earbuds: Volume2, Headsets: Mic,
  Smartwatches: Clock, Speakers: Volume2, "Memory Cards": HardDrive, "Flash Drives": HardDrive,
};

let _id = 0;
const nid = () => `OMB${(++_id).toString().padStart(4, "0")}`;

const P = (o) => ({
  stock: "In Stock",
  stockQuantity: null, // set a real number per product when known; null = status shown as-is, no cart cap
  featured: false,
  previousPrice: null,
  installment: false,
  image: null,
  images: null,
  ...o,
  id: nid(),
});

const PRODUCTS = [
  P({ name: "iPhone 13", brand: "Apple", category: "Smartphones", price: 4200, previousPrice: 4800, featured: true, installment: true, description: "Reconditioned iPhone 13 with A15 Bionic chip, dual camera system and all-day battery life.", specs: ["128GB storage", "6.1\" Super Retina XDR", "Dual 12MP camera", "Face ID"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg"}),
  P({ name: "iPhone 5", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 5. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://appleroom.ua/wa-data/public/shop/products/81/06/681/images/1/1.750.jpg"}),
  P({ name: "iPhone 5s", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 5s. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://upload.wikimedia.org/wikipedia/commons/f/fd/IPhone_5S.jpg"}),
  P({ name: "iPhone 6", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 6. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://i5.walmartimages.com/asr/e628e15a-c710-4b4e-8f24-d324b023b9dd_1.f2763f1546fea51e4affefcb1be9d28a.jpeg?odnBg=FFFFFF&odnHeight=612&odnWidth=612"}),
  P({ name: "iPhone 6 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 6 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://zshop.vn/images/detailed/51/iphone6-silver-select-20141410333948540ffcfce6b40_bohe-id.jpg"}),
  P({ name: "iPhone 6s", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 6s. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://devicehd.com/img_dir/smartphones/apple-iphone-6s-2.png"}),
  P({ name: "iPhone 6s Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 6s Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://tuanphong.vn/pictures/full/2021/01/1610083277-318-dien-thoai-apple-iphone-6s-plus-2.png"}),
  P({ name: "iPhone 7", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 7. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://object.pscloud.io/cms/cms/Photo/img_0_77_6571_0_1_emjgAh.jpg"}),
  P({ name: "iPhone 7 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 7 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://product.hstatic.net/1000329106/product/iphone_7_plus_gold_1d0384ea741e4f4c957d65ca9b7fd4fd_master.jpg"}),
  P({ name: "iPhone 8", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 8. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-8.jpg"}),
  P({ name: "iPhone 8 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 8 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://files.tecnoblog.net/wp-content/uploads/2025/01/iphone-8-plus-dourado.png"}),
  P({ name: "iPhone X", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone X. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-x.jpg"}),
  P({ name: "iPhone XR", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone XR. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://assets.newatlas.com/dims4/default/b4e3052/2147483647/strip/true/crop/1543x1080%2B0%2B0/resize/1543x1080%21/format/webp/quality/90/?url=https%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Farchive%2Fiphonex-8.jpg"}),
  P({ name: "iPhone XS", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone XS. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://www.mobilebazaar.com.pk/image/cache/catalog/products/iphone/used/xs%20256%20gb/imageedit_2_9694717039-500x500.png"}),
  P({ name: "iPhone XS Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone XS Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://dbcstore.fr/cdn/shop/files/compare_iphoneXSmax_gold__bz8xhej5gauu_large_2x_0e0161c5-fc42-4483-88d3-1148c4992daf.jpg?v=1772817387&width=2048"}),
  P({ name: "iPhone 11", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 11. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11.jpg"}),
  P({ name: "iPhone 11 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 11 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11-pro-max-.jpg"}),
  P({ name: "iPhone 11 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 11 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11-pro.jpg"}),
  P({ name: "iPhone 12", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 12. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12.jpg"}),
  P({ name: "iPhone 12 mini", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 12 mini. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-mini.jpg"}),
  P({ name: "iPhone 12 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 12 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro--.jpg"}),
  P({ name: "iPhone 12 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 12 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro-max-.jpg"}),
  P({ name: "iPhone 13 mini", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 13 mini. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-mini.jpg"}),
  P({ name: "iPhone 13 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 13 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro.jpg"}),
  P({ name: "iPhone 13 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 13 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro-max.jpg"}),
  P({ name: "iPhone 14", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 14. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg"}),
  P({ name: "iPhone 14 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 14 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-plus.jpg"}),
  P({ name: "iPhone 14 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 14 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro.jpg"}),
  P({ name: "iPhone 14 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 14 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg"}),
  P({ name: "iPhone 15", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 15. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg"}),
  P({ name: "iPhone 15 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 15 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-plus.jpg"}),
  P({ name: "iPhone 15 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 15 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://www.apple.com/newsroom/images/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/tile/Apple-iPhone-15-Pro-lineup-hero-230912.jpg.og.jpg?202309270316"}),
  P({ name: "iPhone 15 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 15 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://www.apple.com/newsroom/images/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/tile/Apple-iPhone-15-Pro-lineup-hero-230912.jpg.og.jpg?202309270316"}),
  P({ name: "iPhone 16", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 16. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg"}),
  P({ name: "iPhone 16 Plus", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 16 Plus. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-plus.jpg"}),
  P({ name: "iPhone 16 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 16 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg"}),
  P({ name: "iPhone 16 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 16 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg"}),
  P({ name: "iPhone 17", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 17. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://www.istore.co.za/media/catalog/product/cache/2241381b38f9c5524d34c4c939d65433/i/p/iphone_17_lavender_pdp_image_position_1__wwen.jpg"}),
  P({ name: "iPhone 17 Air", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 17 Air. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://brother-mart.com/cdn/shop/files/Apple_iPhone_Air_shop_now_slim_lightweight_design_with_long_lasting_battery_life.png?v=1758989024"}),
  P({ name: "iPhone 17 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 17 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://g-store.com.ua/image/cache/catalog/productfoto/13338/apple-iphone-17-pro-1tb-deep-blue-2-1200x1200.jpg"}),
  P({ name: "iPhone 17 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 17 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://g-store.com.ua/image/cache/catalog/productfoto/13338/apple-iphone-17-pro-1tb-deep-blue-2-1200x1200.jpg"}),
  P({ name: "iPhone 18 Pro", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 18 Pro. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://c.dns-shop.ru/thumb/st1/fit/760/600/bc574eee86a51a514179a940024a0688/q93_7ed3daa372597b2acc5ed242b0c5be4811bf8e333fd550bbc0a23199931adcf3.jpg"}),
  P({ name: "iPhone 18 Pro Max", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone 18 Pro Max. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://static.iphoned.nl/orca/products/31301/apple-iphone-18-pro-max.png"}),
  P({ name: "iPhone Duo", brand: "Apple", category: "Smartphones", price: null, description: "Apple iPhone Duo. Price is on request.", specs: ["Catalog model", "Price on request"] , image: "https://www.apple.com/v/iphone-duo/b/images/overview/media-hero/hero_startframe__fcol1x2us8i2_large.jpg"}),
  P({ name: "Samsung Galaxy A54", brand: "Samsung", category: "Smartphones", price: 3600, featured: true, installment: true, description: "Vibrant AMOLED display, 50MP camera and long battery life for everyday use.", specs: ["128GB storage", "6.4\" Super AMOLED", "50MP triple camera", "5000mAh battery"] }),
  P({ name: "Tecno Camon 20", brand: "Tecno", category: "Smartphones", price: 2450, previousPrice: 2750, featured: true, installment: true, description: "Sharp 64MP camera and smooth performance built for Ghanaian creators.", specs: ["256GB storage", "6.67\" AMOLED", "64MP camera", "5000mAh battery"] }),
  P({ name: "Infinix Note 30", brand: "Infinix", category: "Smartphones", price: 2600, installment: true, description: "Fast charging flagship-grade display for a mid-range price.", specs: ["256GB storage", "6.78\" AMOLED", "108MP camera", "45W fast charge"] }),
  P({ name: "Itel A70", brand: "Itel", category: "Smartphones", price: 950, installment: true, description: "Reliable, affordable entry-level smartphone for everyday communication.", specs: ["64GB storage", "6.6\" HD+ display", "13MP camera", "5000mAh battery"] }),
  P({ name: "Xiaomi Redmi Note 13", brand: "Xiaomi", category: "Smartphones", price: 2900, featured: true, installment: true, description: "Crisp AMOLED display and a capable camera system in a premium build.", specs: ["256GB storage", "6.67\" AMOLED", "108MP camera", "33W fast charge"] }),
  P({ name: "Oppo A78", brand: "Oppo", category: "Smartphones", price: 2300, installment: true, description: "Slim design with a big battery for all-day use.", specs: ["128GB storage", "6.56\" LCD", "50MP camera", "5000mAh battery"] }),
  P({ name: "Vivo Y17s", brand: "Vivo", category: "Smartphones", price: 2100, installment: true, description: "Smooth everyday performance with a large, bright display.", specs: ["128GB storage", "6.56\" HD+ display", "13MP camera", "5000mAh battery"] }),

  P({ name: "Tempered Glass Screen Protector", brand: "OMB", category: "Screen Protectors", price: 35, featured: true, description: "9H hardness tempered glass, bubble-free application, edge-to-edge coverage.", specs: ["9H hardness", "Oleophobic coating", "Fits most models"] }),
  P({ name: "Privacy Screen Protector", brand: "OMB", category: "Screen Protectors", price: 55, description: "Anti-spy tempered glass that blocks side-angle viewing.", specs: ["Anti-spy filter", "9H hardness", "Fits most models"] }),
  P({ name: "Shockproof Silicone Case", brand: "OMB", category: "Phone Cases", price: 45, featured: true, description: "Reinforced corners with a soft-touch shockproof finish.", specs: ["Drop protection", "Slim profile", "Multiple colours"] }),
  P({ name: "Clear Hybrid Case", brand: "OMB", category: "Phone Cases", price: 40, description: "Transparent case that shows off your phone's original design.", specs: ["Anti-yellowing", "Raised bezel", "Precise cutouts"] }),
  P({ name: "Leather Wallet Case", brand: "OMB", category: "Phone Cases", price: 85, description: "PU leather case with card slots and a magnetic closure.", specs: ["Card slots", "Kickstand", "Premium finish"] }),

  P({ name: "20W Fast Charger", brand: "OMB", category: "Chargers", price: 60, featured: true, description: "Compact fast charger that safely powers up your phone in minutes.", specs: ["20W output", "Overcharge protection", "USB-C & USB-A"] }),
  P({ name: "Car Charger Dual Port", brand: "OMB", category: "Chargers", price: 50, description: "Charge two devices at once on the road.", specs: ["Dual USB port", "3.4A output", "LED indicator"] }),
  P({ name: "Laptop Charger (Universal)", brand: "OMB", category: "Chargers", price: 180, description: "Universal laptop charger with multiple connector tips.", specs: ["65W output", "Multi-tip", "Surge protected"] }),

  P({ name: "Type-C Cable 1m", brand: "OMB", category: "Cables", price: 25, featured: true, description: "Durable braided Type-C charging and data cable.", specs: ["Braided nylon", "Fast data transfer", "1 metre length"] }),
  P({ name: "Lightning Cable 1m", brand: "OMB", category: "Cables", price: 30, description: "MFi-style Lightning cable for iPhone and iPad charging.", specs: ["Reinforced connector", "Fast charging", "1 metre length"] }),
  P({ name: "Micro USB Cable 1m", brand: "OMB", category: "Cables", price: 20, description: "Reliable charging cable for older Android and feature phones.", specs: ["Durable jacket", "1 metre length"] }),

  P({ name: "10,000mAh Power Bank", brand: "OMB", category: "Power Banks", price: 140, featured: true, description: "Slim, high-capacity power bank for a full day of backup power.", specs: ["10,000mAh", "Dual output", "LED battery display"] }),
  P({ name: "20,000mAh Power Bank", brand: "OMB", category: "Power Banks", price: 220, description: "High-capacity power bank built for heavy daily use.", specs: ["20,000mAh", "Fast charge input/output", "Torch light"] }),

  P({ name: "Wireless Bluetooth Earbuds", brand: "OMB", category: "Earbuds", price: 150, previousPrice: 190, featured: true, description: "True wireless earbuds with a compact charging case.", specs: ["Bluetooth 5.1", "Touch controls", "20hr total playtime"] }),
  P({ name: "Wired Earphones", brand: "OMB", category: "Earbuds", price: 35, description: "Clear-sound wired earphones with an in-line microphone.", specs: ["3.5mm jack", "Built-in mic", "Tangle-free cable"] }),
  P({ name: "Over-Ear Headset", brand: "OMB", category: "Headsets", price: 190, description: "Comfortable over-ear headset for calls, music and gaming.", specs: ["Padded ear cups", "Noise isolation", "3.5mm & USB"] }),

  P({ name: "Smartwatch Fitness Band", brand: "OMB", category: "Smartwatches", price: 210, featured: true, description: "Track calls, notifications, heart rate and steps from your wrist.", specs: ["Heart rate monitor", "Call notifications", "7-day battery"] }),
  P({ name: "Bluetooth Speaker Mini", brand: "OMB", category: "Speakers", price: 120, description: "Portable speaker with rich sound for indoor or outdoor use.", specs: ["Bluetooth 5.0", "8hr playback", "Water-resistant"] }),

  P({ name: "64GB Memory Card", brand: "OMB", category: "Memory Cards", price: 75, description: "High-speed microSD card for photos, videos and apps.", specs: ["64GB capacity", "Class 10 speed", "Includes adapter"] }),
  P({ name: "128GB Flash Drive", brand: "OMB", category: "Flash Drives", price: 95, description: "Compact USB flash drive for fast file transfer and backup.", specs: ["128GB capacity", "USB 3.0", "Compact metal body"] }),
];

const REPAIR_SERVICES = [
  { name: "Screen Replacement", icon: Smartphone, desc: "Cracked or unresponsive screens replaced with quality parts." },
  { name: "Battery Replacement", icon: Battery, desc: "Restore your phone's battery life with a genuine-quality replacement." },
  { name: "Charging Port Repair", icon: Zap, desc: "Fix loose or faulty charging ports so your phone charges reliably." },
  { name: "Instant Flashing", icon: Cpu, desc: "Firmware flashing to resolve boot loops and software faults." },
  { name: "FRP Unlock", icon: ShieldCheck, desc: "Factory Reset Protection removal for locked Android devices." },
  { name: "Software Installation & Updates", icon: HardDrive, desc: "OS installs, updates and app troubleshooting." },
  { name: "Phone Unlocking", icon: ShieldCheck, desc: "Network unlocking so you can use any SIM." },
  { name: "Data Recovery", icon: HardDrive, desc: "Recover lost photos, contacts and files where possible." },
  { name: "Face ID Repair", icon: ScanFace, desc: "Diagnosis and repair of Face ID / facial recognition faults." },
  { name: "Fingerprint Repair", icon: Fingerprint, desc: "Fix unresponsive fingerprint sensors." },
  { name: "IC / Chip-Level Repair", icon: Cpu, desc: "Advanced board-level repair for complex hardware faults." },
  { name: "Camera Repair", icon: Camera, desc: "Front and rear camera diagnostics and replacement." },
  { name: "Speaker Repair", icon: Volume2, desc: "Restore clear call and media audio." },
  { name: "Microphone Repair", icon: Mic, desc: "Fix muffled or silent microphones." },
  { name: "Laptop Repair", icon: Laptop, desc: "General laptop hardware and software troubleshooting." },
  { name: "iPad Repair", icon: Tablet, desc: "Screen, battery and charging repairs for iPad." },
  { name: "Tablet Repair", icon: Tablet, desc: "Repairs for Android and Windows tablets." },
];

/* ============================================================
   STOCK HELPERS
============================================================ */
const LOW_STOCK_THRESHOLD = 3;

function getStockStatus(product) {
  if (typeof product.stockQuantity === "number") {
    if (product.stockQuantity <= 0) return "Out of Stock";
    if (product.stockQuantity <= LOW_STOCK_THRESHOLD) return "Low Stock";
    return "In Stock";
  }
  return product.stock || "In Stock";
}

function getStockColor(status) {
  if (status === "Out of Stock") return C.red;
  if (status === "Low Stock") return C.amber;
  return C.teal;
}

function getMaxOrderable(product) {
  if (typeof product.stockQuantity === "number") return Math.max(0, product.stockQuantity);
  return Infinity;
}

/* ============================================================
   LOCALSTORAGE HELPERS (safe read/write, corrupted-data proof)
============================================================ */
const STORAGE_KEYS = { cart: "omb_cart_v1" };

function safeReadStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(
      (item) => item && typeof item.id === "string" && Number.isFinite(item.qty) && item.qty > 0
    );
  } catch (err) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // storage unavailable/full — cart still works in-memory for this session
  }
}

function useCart() {
  const [cart, setCart] = useState(() => safeReadStorage(STORAGE_KEYS.cart, []));

  useEffect(() => {
    safeWriteStorage(STORAGE_KEYS.cart, cart);
  }, [cart]);

  const addToCart = useCallback((product, qty = 1) => {
    const max = getMaxOrderable(product);
    if (max <= 0) return { ok: false, reason: "out-of-stock" };
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      const currentQty = existing ? existing.qty : 0;
      const nextQty = Math.min(max, currentQty + qty);
      if (existing) {
        return prev.map((c) => (c.id === product.id ? { ...c, qty: nextQty } : c));
      }
      return [...prev, { id: product.id, qty: nextQty }];
    });
    return { ok: true };
  }, []);

  const updateQty = useCallback((id, qty, max = Infinity) => {
    const safeQty = Math.max(1, Math.min(max, Math.floor(Number(qty) || 1)));
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty: safeQty } : c)));
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  return { cart, addToCart, updateQty, removeItem, clearCart };
}

/* ============================================================
   LIGHTWEIGHT HASH ROUTER
   Keeps every page addressable by URL (#/shop, #/product/OMB0001)
   without adding a router dependency the sandbox may not have.
============================================================ */
const ROUTES = ["home", "shop", "phones", "accessories", "repairs", "installments", "about", "contact", "cart", "product", "privacy", "terms"];

function parseHash() {
  const raw = (window.location.hash || "#/").replace(/^#\/?/, "");
  const [page, param] = raw.split("/").filter(Boolean);
  if (page === "product" && param) return { page: "product", id: param };
  if (ROUTES.includes(page)) return { page };
  return { page: "home" };
}

function setHash(page, id) {
  const path = page === "product" && id ? `#/product/${id}` : `#/${page === "home" ? "" : page}`;
  if (window.location.hash !== path) window.location.hash = path;
}

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
function TripleBar({ size = 26 }) {
  const s = size;
  return (
    <svg width={s * 0.72} height={s} viewBox="0 0 36 50" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ombPhoneGrad" x1="0" y1="0" x2="36" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.teal} />
          <stop offset="1" stopColor="#6FB3FF" />
        </linearGradient>
      </defs>
      <path d="M2 16 L7 13.5 M2 24 L7 24" stroke={C.teal} strokeWidth="2" strokeLinecap="round" />
      <path d="M34 16 L29 13.5 M34 24 L29 24" stroke={C.teal} strokeWidth="2" strokeLinecap="round" />
      <rect x="8" y="1.5" width="20" height="47" rx="6" stroke="url(#ombPhoneGrad)" strokeWidth="2.6" fill="none" />
      <rect x="14" y="5.5" width="8" height="1.8" rx="0.9" fill={C.teal} />
      <path d="M13.5 20 h9 l1 15 h-11 z" fill={C.text} />
      <path d="M16 20 v-2 a2 2 0 0 1 4 0 v2" stroke={C.ink} strokeWidth="1.4" fill="none" />
      <circle cx="18" cy="29" r="4.6" fill={C.ink} />
      <text x="18" y="30.6" textAnchor="middle" fontSize="3.6" fontWeight="700" fontFamily="'Space Grotesk', sans-serif" fill={C.text}>OMB</text>
    </svg>
  );
}

function Logo({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label={`${BUSINESS_NAME} home`}>
      <TripleBar />
      <span className="flex flex-col items-start leading-none">
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-lg font-bold tracking-tight">
          <span style={{ color: C.text }}>OMB</span>
        </span>
        <span style={{ color: C.faint, fontFamily: "'JetBrains Mono', monospace" }} className="text-[9px] tracking-[0.2em]">PHONE &amp; ACCESSORIES</span>
      </span>
    </button>
  );
}

function Price({ price, previousPrice, size = "md" }) {
  const cls = size === "lg" ? "text-2xl" : "text-base";
  if (price == null) {
    return <div className="flex items-baseline gap-2 flex-wrap"><span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold }} className={`font-semibold ${cls}`}>Price on request</span></div>;
  }
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold }} className={`font-semibold ${cls}`}>
        GH₵{price.toLocaleString()}
      </span>
      {previousPrice && <span style={{ color: C.faint, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs line-through">GH₵{previousPrice.toLocaleString()}</span>}
    </div>
  );
}

function DiscountBadge({ price, previousPrice }) {
  if (!previousPrice) return null;
  const pct = Math.round(((previousPrice - price) / previousPrice) * 100);
  return (
    <span style={{ background: C.red, color: "#fff" }} className="absolute top-3 left-3 text-[11px] font-bold px-2 py-1 rounded-md">
      -{pct}%
    </span>
  );
}

function StockBadge({ status, className = "" }) {
  const Icon = status === "Out of Stock" ? XCircle : status === "Low Stock" ? AlertTriangle : CheckCircle2;
  return (
    <span style={{ color: getStockColor(status) }} className={`text-xs font-medium flex items-center gap-1 ${className}`}>
      <Icon size={13} /> {status}
    </span>
  );
}

function WaButton({ message, children, className = "", full = false, disabled = false, ariaLabel }) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`inline-flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-xl font-semibold cursor-not-allowed opacity-50 ${className}`}
        style={{ background: "#25D366", color: "#06210F" }}
      >
        <MessageCircle size={18} /> {children}
      </span>
    );
  }
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-xl font-semibold transition-transform active:scale-95 hover:opacity-90 ${className}`}
      style={{ background: "#25D366", color: "#06210F" }}
    >
      <MessageCircle size={18} /> {children}
    </a>
  );
}

function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled = false, ariaLabel }) {
  const styles = {
    primary: { background: C.gold, color: "#1C1400" },
    outline: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    ghost: { background: C.surface2, color: C.text },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={disabled ? { ...styles, opacity: 0.5, cursor: "not-allowed" } : styles}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm transition-all active:scale-95 hover:brightness-110 ${className}`}
    >
      {children}
    </button>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="flex items-center gap-2 mb-2">
          <span style={{ background: C.gold }} className="w-6 h-[2px] rounded-full" />
          <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs tracking-[0.2em] uppercase">{eyebrow}</span>
        </div>
      )}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-2xl sm:text-3xl font-bold">{title}</h2>
      {subtitle && <p style={{ color: C.muted }} className="mt-2 text-sm sm:text-base max-w-2xl">{subtitle}</p>}
    </div>
  );
}

/* ============================================================
   PRODUCT IMAGE SYSTEM
   Supports product.image (single) or product.images (gallery).
   Until real photos are supplied, shows a clean in-brand
   fallback — never a broken-image icon.
============================================================ */
function ProductImage({ src, icon: Icon = Smartphone, alt = "", className = "", eager = false }) {
  const [status, setStatus] = useState(src ? "loading" : "empty");

  useEffect(() => {
    setStatus(src ? "loading" : "empty");
  }, [src]);

  if (!src || status === "error") {
    return (
      <div
        role="img"
        aria-label={alt || "Product photo not yet available"}
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.surface})` }}
      >
        <Icon size={40} style={{ color: C.faint }} strokeWidth={1.3} />
        {status === "error" && (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[9px]" style={{ color: C.faint }}>
            <ImageOff size={10} /> image unavailable
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: C.surface2 }}>
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse" style={{ background: C.surface2 }} />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`w-full h-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

function ProductGallery({ product }) {
  const gallery = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
  const [active, setActive] = useState(0);
  const Icon = ICONS[product.category] || Smartphone;
  const current = gallery[active] || null;

  return (
    <div>
      <div className="relative">
        <ProductImage src={current} icon={Icon} alt={product.name} className="w-full h-72 sm:h-96 rounded-2xl" eager />
        <DiscountBadge price={product.price} previousPrice={product.previousPrice} />
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-2 mt-3" role="tablist" aria-label="Product images">
          {gallery.map((img, i) => (
            <button
              key={img + i}
              role="tab"
              aria-selected={active === i}
              aria-label={`View image ${i + 1} of ${product.name}`}
              onClick={() => setActive(i)}
              style={{ border: active === i ? `2px solid ${C.gold}` : `1px solid ${C.line}` }}
              className="rounded-lg overflow-hidden"
            >
              <ProductImage src={img} icon={Icon} alt="" className="w-14 h-14" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PRODUCT CARD
============================================================ */
function ProductCard({ product, onOpen, onAddToCart }) {
  const Icon = ICONS[product.category] || Smartphone;
  const status = getStockStatus(product);
  const outOfStock = status === "Out of Stock";
  const priceOnRequest = product.price == null;

  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.line}` }}
      className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
    >
      <button onClick={() => onOpen(product)} className="relative text-left" aria-label={`View ${product.name}`}>
        <ProductImage src={product.image} icon={Icon} alt={product.name} className="h-40 w-full transition-transform group-hover:scale-105" />
        <DiscountBadge price={product.price} previousPrice={product.previousPrice} />
        {product.featured && (
          <span style={{ background: C.gold, color: "#1C1400" }} className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-md">FEATURED</span>
        )}
      </button>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span style={{ color: C.faint }} className="text-[11px] uppercase tracking-wide">{product.brand} · {product.category}</span>
        <button onClick={() => onOpen(product)} className="text-left">
          <h3 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold leading-snug line-clamp-2">{product.name}</h3>
        </button>
        <Price price={product.price} previousPrice={product.previousPrice} />
        <StockBadge status={status} />
        <div className="mt-auto pt-2 flex gap-2">
          <Button
            variant="primary"
            onClick={() => onAddToCart(product)}
            disabled={outOfStock || priceOnRequest}
            ariaLabel={outOfStock ? `${product.name} is out of stock` : priceOnRequest ? `${product.name} price is on request` : `Add ${product.name} to cart`}
            className="flex-1 !px-3 !py-2 text-xs"
          >
            <ShoppingCart size={14} /> {outOfStock ? "Out of Stock" : priceOnRequest ? "Ask Price" : "Add"}
          </Button>
          <WaButton
            message={buildProductEnquiryMessage(product)}
            ariaLabel={`Ask about ${product.name} on WhatsApp`}
            className="flex-1 !px-3 !py-2 text-xs"
          >
            Ask
          </WaButton>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION
============================================================ */
const NAV_LINKS = [
  ["Home", "home"], ["Shop", "shop"], ["Phones", "phones"], ["Accessories", "accessories"],
  ["Repairs", "repairs"], ["Installments", "installments"], ["About", "about"], ["Contact", "contact"],
];

function Navbar({ page, go, cartCount, search, setSearch }) {
  const [open, setOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <header style={{ background: "rgba(10,13,18,0.92)", borderBottom: `1px solid ${C.line}`, backdropFilter: "blur(10px)" }} className="sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Logo onClick={() => go("home")} />
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {NAV_LINKS.map(([label, key]) => (
              <button
                key={key}
                onClick={() => go(key)}
                aria-current={page === key ? "page" : undefined}
                style={{ color: page === key ? C.gold : C.muted }}
                className="px-3 py-2 text-sm font-medium rounded-lg hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setShowSearch((s) => !s)} aria-label="Search products" aria-expanded={showSearch} style={{ color: C.muted }} className="p-2.5 rounded-lg hover:bg-white/5">
              <Search size={19} />
            </button>
            <button onClick={() => go("cart")} aria-label={`View cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} style={{ color: C.muted }} className="relative p-2.5 rounded-lg hover:bg-white/5">
              <ShoppingCart size={19} />
              {cartCount > 0 && (
                <span style={{ background: C.gold, color: "#1C1400" }} className="absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <a href={waLink(`Hi ${BUSINESS_NAME}, I have a question.`)} target="_blank" rel="noopener noreferrer" style={{ background: "#25D366", color: "#06210F" }} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold hover:opacity-90">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <button onClick={() => setOpen(true)} aria-label="Open menu" style={{ color: C.muted }} className="lg:hidden p-2.5 rounded-lg hover:bg-white/5">
              <Menu size={20} />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="border-t px-4 sm:px-6 py-3" style={{ borderColor: C.line, background: C.surface }}>
            <div className="max-w-7xl mx-auto flex items-center gap-2">
              <Search size={16} style={{ color: C.faint }} />
              <label htmlFor="omb-nav-search" className="sr-only">Search products</label>
              <input
                id="omb-nav-search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phones, accessories, repairs..."
                style={{ color: C.text }}
                className="bg-transparent outline-none flex-1 text-sm placeholder:text-[#5C6774]"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" style={{ color: C.faint }}><X size={16} /></button>
              )}
              <Button onClick={() => { go("shop"); setShowSearch(false); }} className="!px-3 !py-1.5 text-xs">Search</Button>
            </div>
          </div>
        )}
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div style={{ background: C.surface, borderLeft: `1px solid ${C.line}` }} className="absolute right-0 top-0 h-full w-72 p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-4">
              <Logo onClick={() => { go("home"); setOpen(false); }} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ color: C.muted }}><X size={20} /></button>
            </div>
            {NAV_LINKS.map(([label, key]) => (
              <button
                key={key}
                onClick={() => { go(key); setOpen(false); }}
                aria-current={page === key ? "page" : undefined}
                style={{ color: page === key ? C.gold : C.text, background: page === key ? C.surface2 : "transparent" }}
                className="text-left px-3 py-3 rounded-lg text-sm font-medium flex items-center justify-between"
              >
                {label} <ChevronRight size={15} style={{ color: C.faint }} />
              </button>
            ))}
            <a href={waLink(`Hi ${BUSINESS_NAME}, I have a question.`)} target="_blank" rel="noopener noreferrer" style={{ background: "#25D366", color: "#06210F" }} className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold">
              <MessageCircle size={17} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      )}

      <nav aria-label="Mobile" style={{ background: C.surface, borderTop: `1px solid ${C.line}` }} className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-2">
        {[
          ["home", "Home", Smartphone],
          ["shop", "Shop", ShoppingCart],
          ["repairs", "Repairs", Wrench],
          ["cart", "Cart", ShoppingCart],
        ].map(([key, label, Icon]) => (
          <button key={key} onClick={() => go(key)} aria-current={page === key ? "page" : undefined} className="flex flex-col items-center gap-0.5 px-3 py-1 relative" style={{ color: page === key ? C.gold : C.faint }}>
            <Icon size={19} />
            <span className="text-[10px] font-medium">{label}</span>
            {key === "cart" && cartCount > 0 && (
              <span style={{ background: C.gold, color: "#1C1400" }} className="absolute -top-0.5 right-1 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        ))}
        <a href={waLink(`Hi ${BUSINESS_NAME}, I have a question.`)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-0.5 px-3 py-1" style={{ color: "#25D366" }}>
          <MessageCircle size={19} />
          <span className="text-[10px] font-medium">Chat</span>
        </a>
      </nav>
    </>
  );
}

/* ============================================================
   FOOTER
============================================================ */
function Footer({ go }) {
  const socialIcons = [["facebook", Facebook], ["instagram", Instagram], ["twitter", Twitter]];
  const activeSocials = socialIcons.filter(([key]) => SOCIAL_LINKS[key]);

  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.line}` }} className="pt-14 pb-28 lg:pb-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Logo />
          <p style={{ color: C.muted }} className="text-sm mt-4 leading-relaxed">
            Quality phones, genuine accessories and professional repairs — all in one place in Kasoa, Ghana.
          </p>
          {activeSocials.length > 0 && (
            <div className="flex items-center gap-3 mt-5">
              {activeSocials.map(([key, Icon]) => (
                <a key={key} href={SOCIAL_LINKS[key]} target="_blank" rel="noopener noreferrer" aria-label={`${BUSINESS_NAME} on ${key}`} style={{ background: C.surface2, color: C.muted }} className="w-9 h-9 rounded-lg flex items-center justify-center hover:text-white">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          )}
          {SOCIAL_LINKS.tiktok && (
            <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" aria-label={`${BUSINESS_NAME} on TikTok`} style={{ background: C.surface2, color: C.muted }} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:text-white">
              TikTok @Ombstoresgh
            </a>
          )}
        </div>
        <div>
          <h4 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold mb-4 text-sm tracking-wide">Quick Links</h4>
          <ul className="space-y-2.5">
            {[["Shop", "shop"], ["Repairs", "repairs"], ["Installments", "installments"], ["About", "about"], ["Contact", "contact"]].map(([l, k]) => (
              <li key={k}><button onClick={() => go(k)} style={{ color: C.muted }} className="text-sm hover:text-white">{l}</button></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold mb-4 text-sm tracking-wide">Customer Support</h4>
          <ul className="space-y-2.5 text-sm" style={{ color: C.muted }}>
            <li className="flex items-center gap-2"><MessageCircle size={14} /> WhatsApp Chat</li>
            <li className="flex items-center gap-2"><Phone size={14} /> {CONTACT_PHONE}</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> {BUSINESS_ADDRESS}</li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold mb-4 text-sm tracking-wide">Legal</h4>
          <ul className="space-y-2.5">
            <li><button onClick={() => go("privacy")} style={{ color: C.muted }} className="text-sm hover:text-white">Privacy Policy</button></li>
            <li><button onClick={() => go("terms")} style={{ color: C.muted }} className="text-sm hover:text-white">Terms &amp; Conditions</button></li>
          </ul>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, color: C.faint }} className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 text-xs flex flex-col sm:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} {BUSINESS_NAME} — Only My Brothers. All rights reserved.</span>
        <span>{BUSINESS_ADDRESS}</span>
      </div>
    </footer>
  );
}

/* ============================================================
   HOME PAGE
============================================================ */
function Home({ go, openProduct, addToCart }) {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 8);
  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: `radial-gradient(circle at 80% 0%, ${C.surface2} 0%, ${C.ink} 55%)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
              <TripleBar size={14} />
              <span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] tracking-wide">KASOA · MATAHEKO JUNCTION</span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Your Phone.<br />Your Tech.<br /><span style={{ color: C.gold }}>Your OMB.</span>
            </h1>
            <p style={{ color: C.muted }} className="mt-6 text-base sm:text-lg max-w-md leading-relaxed">
              Quality phones, accessories and professional repairs — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button onClick={() => go("shop")}>Shop Now <ArrowRight size={16} /></Button>
              <Button variant="outline" onClick={() => go("repairs")}><Wrench size={16} /> Book a Repair</Button>
            </div>
            <div className="flex items-center gap-2.5 mt-8 flex-wrap" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {["Repair", "Buy", "Upgrade", "Protect"].map((w, i, arr) => (
                <React.Fragment key={w}>
                  <span style={{ color: C.gold }} className="text-xs font-bold tracking-wide">{w.toUpperCase()}</span>
                  {i < arr.length - 1 && <span style={{ background: C.teal }} className="w-1.5 h-1.5 rounded-full" />}
                </React.Fragment>
              ))}
            </div>
            <div style={{ border: `1px solid ${C.line}` }} className="inline-block mt-3 px-4 py-2 rounded-xl">
              <span style={{ color: C.text }} className="text-xs font-semibold">Everything you need, </span>
              <span style={{ color: C.gold }} className="text-xs font-bold">all in one place!</span>
            </div>
            <div className="flex items-center gap-6 mt-8 flex-wrap">
              {[["Genuine Parts", ShieldCheck], ["Fast Turnaround", Zap], ["Flexible Installments", Clock]].map(([label, Icon]) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={16} style={{ color: C.teal }} />
                  <span style={{ color: C.muted }} className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-80 sm:h-96 lg:h-[26rem]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ background: `linear-gradient(160deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.line}` }} className="w-44 sm:w-52 h-full rounded-[2.2rem] shadow-2xl flex flex-col items-center justify-center gap-3">
                <Smartphone size={64} style={{ color: C.gold }} strokeWidth={1.1} />
                <TripleBar size={20} />
              </div>
            </div>
            {[
              { Icon: Battery, top: "6%", left: "2%", label: "Fast Charge" },
              { Icon: Volume2, top: "62%", left: "0%", label: "Earbuds" },
              { Icon: Wrench, top: "10%", right: "0%", label: "Repairs" },
              { Icon: ShieldCheck, top: "68%", right: "2%", label: "Genuine" },
            ].map((f, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.line}`, top: f.top, left: f.left, right: f.right }} className="absolute px-3 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-[float_5s_ease-in-out_infinite]">
                <f.Icon size={16} style={{ color: C.teal }} />
                <span style={{ color: C.text }} className="text-xs font-semibold">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            [ShieldCheck, "Genuine Accessories", "Quality parts you can trust"],
            [BadgeCheck, "Certified Repairs", "Skilled technicians, real care"],
            [Truck, "Convenient Location", "Kasoa Danchira, Mataheko Junction"],
            [Clock, "Flexible Installments", "Own your next phone your way"],
          ].map(([Icon, t, s], i) => (
            <div key={i} className="flex items-start gap-3">
              <div style={{ background: C.surface2 }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} style={{ color: C.gold }} />
              </div>
              <div>
                <p style={{ color: C.text }} className="text-sm font-semibold">{t}</p>
                <p style={{ color: C.faint }} className="text-xs mt-0.5">{s}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionHeading eyebrow="Browse" title="Shop by Category" subtitle="Everything you need for your phone, in one place." />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = ICONS[cat] || Smartphone;
            return (
              <button
                key={cat}
                onClick={() => go("shop", { category: cat })}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:-translate-y-0.5 transition-transform"
              >
                <Icon size={22} style={{ color: C.teal }} />
                <span style={{ color: C.text }} className="text-[11px] font-medium text-center leading-tight">{cat}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <SectionHeading eyebrow="Featured" title="Popular Right Now" />
          <button onClick={() => go("shop")} style={{ color: C.gold }} className="text-sm font-semibold flex items-center gap-1 -mt-8">
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {featured.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} onAddToCart={addToCart} />)}
        </div>
      </section>

      <section style={{ background: C.surface, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }} className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p style={{ color: C.faint, fontFamily: "'JetBrains Mono', monospace" }} className="text-center text-xs tracking-[0.2em] uppercase mb-6">Brands We Stock</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {BRANDS.map((b) => (
              <span key={b} style={{ color: C.muted, fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-semibold opacity-80 hover:opacity-100 transition-opacity">{b}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <SectionHeading eyebrow="Repairs" title="Professional Phone & Device Repairs" subtitle="From cracked screens to chip-level faults — our technicians handle it with care and transparency." />
          <ul className="grid grid-cols-2 gap-3 mb-8">
            {REPAIR_SERVICES.slice(0, 6).map((s) => (
              <li key={s.name} className="flex items-center gap-2">
                <s.icon size={14} style={{ color: C.teal }} />
                <span style={{ color: C.muted }} className="text-xs">{s.name}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => go("repairs")}><Wrench size={16} /> Book a Repair</Button>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <Wrench size={40} style={{ color: C.gold }} strokeWidth={1.2} />
          <p style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold">Same-day diagnosis</p>
          <p style={{ color: C.faint }} className="text-xs">Bring your device in, or message us on WhatsApp to get started.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div style={{ background: `linear-gradient(120deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.line}` }} className="rounded-3xl p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-2xl sm:text-3xl font-bold mb-3">Get Your Phone. <span style={{ color: C.gold }}>Pay in Installments.</span></h2>
            <p style={{ color: C.muted }} className="text-sm sm:text-base mb-6 max-w-lg">Take home select phones today and spread the cost over time. Reach out on WhatsApp for current terms and eligibility.</p>
            <Button onClick={() => go("installments")}>See Installment Phones <ArrowRight size={16} /></Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {PRODUCTS.filter((p) => p.installment).slice(0, 3).map((p) => (
              <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-3 text-center">
                <ProductImage src={p.image} icon={Smartphone} alt={p.name} className="h-16 w-full rounded-lg mb-2" />
                <p style={{ color: C.text }} className="text-[11px] font-medium line-clamp-1">{p.name}</p>
                <p style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs font-semibold">GH₵{p.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <SectionHeading eyebrow="Trust" title="What Customers Say" subtitle="We're building our public review collection — real customer feedback will appear here soon." />
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: C.surface, border: `1px dashed ${C.line}` }} className="rounded-2xl p-6 flex flex-col items-center text-center gap-2">
              <div className="flex gap-0.5">{[...Array(5)].map((_, s) => <Star key={s} size={14} style={{ color: C.faint }} />)}</div>
              <p style={{ color: C.faint }} className="text-xs">Customer review coming soon</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   SHOP PAGE (search, filters, sort)
============================================================ */
const DEFAULT_MAX_PRICE = 5000;

function Shop({ openProduct, addToCart, search, setSearch, initialFilters, categoryLock, title, subtitle }) {
  const [brand, setBrand] = useState(initialFilters?.brand || "");
  const [category, setCategory] = useState(initialFilters?.category || "");
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE);
  const [stockFilter, setStockFilter] = useState("all"); // all | in | low | out
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [installmentOnly, setInstallmentOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { setCategory(initialFilters?.category || ""); setBrand(initialFilters?.brand || ""); }, [initialFilters]);

  const pool = categoryLock ? PRODUCTS.filter((p) => categoryLock.includes(p.category)) : PRODUCTS;

  const clearFilters = () => {
    setBrand(""); setCategory(""); setMaxPrice(DEFAULT_MAX_PRICE);
    setStockFilter("all"); setFeaturedOnly(false); setInstallmentOnly(false);
  };

  const activeFilterCount = [
    brand, category, maxPrice !== DEFAULT_MAX_PRICE, stockFilter !== "all", featuredOnly, installmentOnly,
  ].filter(Boolean).length;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = pool.filter((p) => {
      if (q) {
        const haystack = [p.name, p.brand, p.category, p.description, ...(p.specs || [])].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (brand && p.brand !== brand) return false;
      if (category && p.category !== category) return false;
      if (p.price > maxPrice) return false;
      if (featuredOnly && !p.featured) return false;
      if (installmentOnly && !p.installment) return false;
      if (stockFilter !== "all") {
        const status = getStockStatus(p);
        if (stockFilter === "in" && status !== "In Stock") return false;
        if (stockFilter === "low" && status !== "Low Stock") return false;
        if (stockFilter === "out" && status !== "Out of Stock") return false;
      }
      return true;
    });
    if (sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price);
    if (sort === "newest") items = [...items].sort((a, b) => (b.id > a.id ? 1 : -1));
    if (sort === "featured") items = [...items].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return items;
  }, [pool, search, brand, category, maxPrice, stockFilter, featuredOnly, installmentOnly, sort]);

  const availableBrands = [...new Set(pool.map((p) => p.brand))];
  const availableCategories = [...new Set(pool.map((p) => p.category))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="Shop" title={title || "All Products"} subtitle={subtitle || "Genuine phones and accessories, priced fairly."} />

      <div className="flex items-center gap-3 mb-4">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl flex-1">
          <Search size={16} style={{ color: C.faint }} />
          <label htmlFor="omb-shop-search" className="sr-only">Search products</label>
          <input id="omb-shop-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." style={{ color: C.text }} className="bg-transparent outline-none flex-1 text-sm placeholder:text-[#5C6774]" />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" style={{ color: C.faint }}><X size={16} /></button>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-label="Toggle filters" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.text }} className="relative p-2.5 rounded-xl lg:hidden">
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span style={{ background: C.gold, color: "#1C1400" }} className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <label htmlFor="omb-sort" className="sr-only">Sort products</label>
        <select id="omb-sort" value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.text }} className="hidden lg:block px-3 py-2.5 rounded-xl text-sm outline-none">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center flex-wrap gap-2 mb-6">
          {category && <FilterChip label={`Category: ${category}`} onRemove={() => setCategory("")} />}
          {brand && <FilterChip label={`Brand: ${brand}`} onRemove={() => setBrand("")} />}
          {maxPrice !== DEFAULT_MAX_PRICE && <FilterChip label={`Max GH₵${maxPrice}`} onRemove={() => setMaxPrice(DEFAULT_MAX_PRICE)} />}
          {stockFilter !== "all" && <FilterChip label={stockFilter === "in" ? "In Stock" : stockFilter === "low" ? "Low Stock" : "Out of Stock"} onRemove={() => setStockFilter("all")} />}
          {featuredOnly && <FilterChip label="Featured" onRemove={() => setFeaturedOnly(false)} />}
          {installmentOnly && <FilterChip label="Installment Available" onRemove={() => setInstallmentOnly(false)} />}
          <button onClick={clearFilters} style={{ color: C.gold }} className="text-xs font-semibold ml-1">Clear all</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`} aria-label="Filters">
          <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-4 space-y-6 lg:sticky lg:top-24">
            <div className="lg:hidden">
              <label htmlFor="omb-sort-mobile" style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide">Sort</label>
              <select id="omb-sort-mobile" value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full mt-2 px-3 py-2 rounded-lg text-sm outline-none">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            {!categoryLock && (
              <div>
                <p style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide mb-2">Category</p>
                <div className="space-y-1.5">
                  <button onClick={() => setCategory("")} style={{ color: !category ? C.gold : C.muted }} className="block text-sm">All Categories</button>
                  {availableCategories.map((c) => (
                    <button key={c} onClick={() => setCategory(c)} style={{ color: category === c ? C.gold : C.muted }} className="block text-sm text-left">{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide mb-2">Brand</p>
              <div className="space-y-1.5">
                <button onClick={() => setBrand("")} style={{ color: !brand ? C.gold : C.muted }} className="block text-sm">All Brands</button>
                {availableBrands.map((b) => (
                  <button key={b} onClick={() => setBrand(b)} style={{ color: brand === b ? C.gold : C.muted }} className="block text-sm text-left">{b}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="omb-max-price" style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide mb-2 block">Max Price: GH₵{maxPrice}</label>
              <input id="omb-max-price" type="range" min="20" max="5000" step="20" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-amber-400" />
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-xs font-semibold uppercase tracking-wide mb-2">Availability</p>
              <div className="space-y-1.5">
                {[["all", "All"], ["in", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"]].map(([val, label]) => (
                  <button key={val} onClick={() => setStockFilter(val)} style={{ color: stockFilter === val ? C.gold : C.muted }} className="block text-sm text-left">{label}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="accent-amber-400" />
              <span style={{ color: C.muted }} className="text-sm">Featured only</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={installmentOnly} onChange={(e) => setInstallmentOnly(e.target.checked)} className="accent-amber-400" />
              <span style={{ color: C.muted }} className="text-sm">Installment available</span>
            </label>
          </div>
        </aside>

        <div>
          <p style={{ color: C.faint }} className="text-xs mb-4">{list.length} product{list.length !== 1 ? "s" : ""} found</p>
          {list.length === 0 ? (
            <div style={{ color: C.faint }} className="text-center py-20 text-sm flex flex-col items-center gap-3">
              <Search size={28} style={{ color: C.faint }} />
              <p>No products match your search or filters.</p>
              <Button variant="outline" onClick={() => { setSearch(""); clearFilters(); }} className="!py-2">Clear search &amp; filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {list.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} onAddToCart={addToCart} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full">
      {label}
      <button onClick={onRemove} aria-label={`Remove filter: ${label}`} style={{ color: C.faint }}><X size={12} /></button>
    </span>
  );
}

/* ============================================================
   PRODUCT DETAILS
============================================================ */
function ProductDetails({ product, go, addToCart }) {
  const [qty, setQty] = useState(1);
  const [addResult, setAddResult] = useState(null);

  useEffect(() => { setQty(1); setAddResult(null); }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p style={{ color: C.muted }}>Product not found.</p>
        <Button className="mt-4" onClick={() => go("shop")}>Back to Shop</Button>
      </div>
    );
  }

  const status = getStockStatus(product);
  const outOfStock = status === "Out of Stock";
  const max = getMaxOrderable(product);
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAdd = () => {
    const result = addToCart(product, qty);
    setAddResult(result);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => go("shop")} style={{ color: C.muted }} className="text-xs mb-6 flex items-center gap-1"><ChevronRight size={13} className="rotate-180" /> Back to Shop</button>
      <div className="grid lg:grid-cols-2 gap-10">
        <ProductGallery product={product} />
        <div>
          <span style={{ color: C.faint }} className="text-xs uppercase tracking-wide">{product.brand} · {product.category}</span>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-2xl sm:text-3xl font-bold mt-2 mb-3">{product.name}</h1>
          <Price price={product.price} previousPrice={product.previousPrice} size="lg" />
          <div className="mt-3"><StockBadge status={status} /></div>
          <p style={{ color: C.muted }} className="text-sm leading-relaxed mt-5">{product.description}</p>

          {product.specs?.length > 0 && (
            <ul className="mt-5 space-y-2">
              {product.specs.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                  <span style={{ background: C.gold }} className="w-1.5 h-1.5 rounded-full shrink-0" /> {s}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 mt-7">
            <div style={{ border: `1px solid ${C.line}` }} className="flex items-center rounded-xl">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={outOfStock} aria-label="Decrease quantity" className="p-3 disabled:opacity-40" style={{ color: C.text }}><Minus size={14} /></button>
              <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace" }} className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={outOfStock || qty >= max} aria-label="Increase quantity" className="p-3 disabled:opacity-40" style={{ color: C.text }}><Plus size={14} /></button>
            </div>
            <Button onClick={handleAdd} disabled={outOfStock} className="flex-1">
              <ShoppingCart size={16} /> {outOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
          {Number.isFinite(max) && !outOfStock && (
            <p style={{ color: C.faint }} className="text-xs mt-2">Only {max} left in stock.</p>
          )}
          {addResult?.ok && (
            <p style={{ color: C.teal }} className="text-xs mt-2 flex items-center gap-1"><CheckCircle2 size={13} /> Added to cart.</p>
          )}

          <WaButton message={buildProductEnquiryMessage(product, qty)} full className="mt-3 !py-3" ariaLabel={`Ask about ${product.name} on WhatsApp`}>
            Ask About This Product
          </WaButton>
          {product.installment && (
            <WaButton message={buildInstallmentMessage(product)} full className="mt-3 !py-3 !bg-transparent" ariaLabel={`Ask about installment payments for ${product.name}`} >
              Enquire About Installments
            </WaButton>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <SectionHeading eyebrow="You may also like" title="Related Products" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} onOpen={(pr) => go("product", { id: pr.id })} onAddToCart={addToCart} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   REPAIRS PAGE
============================================================ */
const REPAIR_DEVICES = ["iPhone", "Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Oppo", "Vivo", "Laptop", "iPad / Tablet", "Other"];

function Repairs() {
  const [form, setForm] = useState({ device: "", problem: "", date: "", name: "", phone: "" });
  const [touched, setTouched] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = form.device && form.problem.trim() && form.name.trim() && form.phone.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="Repairs" title="Professional Phone & Device Repairs" subtitle="Genuine parts, transparent pricing and technicians who take care of your device like it's their own." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
        {REPAIR_SERVICES.map((s) => (
          <div key={s.name} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-5 flex flex-col gap-3">
            <div style={{ background: C.surface2 }} className="w-10 h-10 rounded-xl flex items-center justify-center">
              <s.icon size={18} style={{ color: C.gold }} />
            </div>
            <p style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-sm">{s.name}</p>
            <p style={{ color: C.faint }} className="text-xs leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-3xl p-6 sm:p-10 grid lg:grid-cols-[1fr_1.1fr] gap-10">
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-xl font-bold mb-2">Book a Repair</h3>
          <p style={{ color: C.muted }} className="text-sm mb-6">Fill in the details below — we'll open WhatsApp with your booking ready to send.</p>
          <div className="space-y-4">
            {[
              ["Preferred date & time", "date", "date"],
              ["Your name", "name", "text"],
              ["Phone / WhatsApp number", "phone", "tel"],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label htmlFor={`repair-${key}`} style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">{label}</label>
                <input id={`repair-${key}`} type={type} value={form[key]} onChange={set(key)} style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="repair-device" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Device</label>
          <select id="repair-device" value={form.device} onChange={set("device")} style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none mb-4">
            <option value="">Select device</option>
            {REPAIR_DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label htmlFor="repair-problem" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Describe the problem</label>
          <textarea id="repair-problem" value={form.problem} onChange={set("problem")} rows={5} placeholder="e.g. Cracked screen, phone won't charge, battery drains fast..." style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none placeholder:text-[#5C6774]" />
          {canSubmit ? (
            <WaButton message={buildRepairMessage(form)} full className="mt-5 !py-3.5" ariaLabel="Send repair booking via WhatsApp">
              Book via WhatsApp
            </WaButton>
          ) : (
            <button
              type="button"
              onClick={() => setTouched(true)}
              style={{ background: C.surface2, color: C.faint }}
              className="w-full mt-5 py-3.5 rounded-xl text-sm font-semibold cursor-not-allowed"
            >
              {touched ? "Please fill in device, problem, name & phone" : "Fill in device, problem, name & phone"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INSTALLMENTS PAGE
============================================================ */
function Installments() {
  const phones = PRODUCTS.filter((p) => p.installment);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="Installments" title="Get Your Phone. Pay in Installments." subtitle="Take home the phone you need today and spread the cost over manageable payments." />

      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-6 sm:p-8 mb-12 grid sm:grid-cols-3 gap-6">
        {[
          [BadgeCheck, "Choose your phone", "Pick from our range of installment-eligible smartphones."],
          [ShieldCheck, "Pay a deposit", "Secure your device with an initial deposit, discussed on WhatsApp."],
          [Clock, "Spread the balance", "Pay the remaining balance over an agreed period."],
        ].map(([Icon, t, s], i) => (
          <div key={i} className="flex flex-col gap-2">
            <Icon size={20} style={{ color: C.gold }} />
            <p style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-sm">{t}</p>
            <p style={{ color: C.faint }} className="text-xs leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
      <p style={{ color: C.faint }} className="text-xs mb-8 max-w-2xl">
        Installment terms (deposit amount, duration and eligibility) are confirmed directly with our team and may vary by device. Message us on WhatsApp for current terms — we don't process installment applications automatically on this site.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {phones.map((p) => {
          const status = getStockStatus(p);
          return (
            <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl overflow-hidden flex flex-col">
              <ProductImage src={p.image} icon={Smartphone} alt={p.name} className="h-36 w-full" />
              <div className="p-4 flex flex-col gap-2 flex-1">
                <span style={{ color: C.faint }} className="text-[11px] uppercase tracking-wide">{p.brand}</span>
                <h3 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-sm">{p.name}</h3>
                <Price price={p.price} />
                <StockBadge status={status} />
                <p style={{ color: C.faint }} className="text-xs">Deposit &amp; plan: ask on WhatsApp</p>
                <WaButton message={buildInstallmentMessage(p)} full className="mt-auto !py-2.5 text-xs" ariaLabel={`Enquire about installments for ${p.name}`}>
                  Enquire on WhatsApp
                </WaButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ABOUT PAGE
============================================================ */
function About({ go }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="About OMB" title="Only My Brothers" subtitle="Modern technology, honest service, and a brand built on trust." />
      <div className="grid lg:grid-cols-2 gap-10 mb-16">
        <div className="space-y-4" style={{ color: C.muted }}>
          <p className="text-sm leading-relaxed">
            OMB Stores — short for <strong style={{ color: C.text }}>Only My Brothers</strong> — is a Ghanaian phone and accessories business based at Kasoa Danchira, Mataheko Junction. We sell genuine smartphones and accessories, and offer professional phone repair services to our community.
          </p>
          <p className="text-sm leading-relaxed">
            Our name reflects how we treat every customer: like family. Whether you're buying your first smartphone, upgrading your accessories, or getting your phone fixed, our goal is straightforward, honest service every time.
          </p>
          <p className="text-sm leading-relaxed">
            Every phone we sell is checked, every repair is handled with care, and every customer is treated like they walked in with a brother — because that's the standard we built OMB Stores on.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            [ShieldCheck, "Trust", "We stand behind what we sell and what we repair."],
            [BadgeCheck, "Quality", "Genuine parts and accessories, not knock-offs."],
            [Clock, "Convenience", "Everything phone-related, under one roof."],
            [Zap, "Affordable", "Fair pricing for quality technology."],
          ].map(([Icon, t, s], i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-5 flex flex-col gap-2">
              <Icon size={18} style={{ color: C.gold }} />
              <p style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-sm">{t}</p>
              <p style={{ color: C.faint }} className="text-xs leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin size={20} style={{ color: C.gold }} />
          <div>
            <p style={{ color: C.text }} className="text-sm font-semibold">Visit us</p>
            <p style={{ color: C.faint }} className="text-xs">{BUSINESS_ADDRESS}</p>
          </div>
        </div>
        <WaButton message={`Hi ${BUSINESS_NAME}, I'd like to know more about your shop.`} className="!px-5 !py-3">Chat With Us</WaButton>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT PAGE
============================================================ */
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Please enter a valid email.";
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(GOOGLE_MAPS_QUERY)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="Contact" title="Get in Touch" subtitle="Questions about a product, a repair, or an order? We're happy to help." />
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          {[
            [MapPin, "Address", BUSINESS_ADDRESS],
            [Phone, "Phone", CONTACT_PHONE],
            [MessageCircle, "WhatsApp", "Tap to chat with us instantly"],
            [Mail, "Email", CONTACT_EMAIL],
            ...(OPENING_HOURS ? [[Clock, "Opening Hours", "Monday–Saturday: 8:00 AM – 7:00 PM · Sunday: 10:00 AM – 5:00 PM"]] : []),
          ].map(([Icon, label, val], i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-4 flex items-center gap-3">
              <div style={{ background: C.surface2 }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={17} style={{ color: C.gold }} />
              </div>
              <div>
                <p style={{ color: C.text }} className="text-sm font-semibold">{label}</p>
                <p style={{ color: C.faint }} className="text-xs">{val}</p>
              </div>
            </div>
          ))}
          <WaButton message={`Hi ${BUSINESS_NAME}, I have a question.`} full className="!py-3.5">Chat on WhatsApp</WaButton>

          <a href={GOOGLE_MAPS_LINK} target="_blank" rel="noopener noreferrer" aria-label="Open OMB Stores location in Google Maps" style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl overflow-hidden h-52 relative block">
            <iframe
              title={`${BUSINESS_NAME} location`}
              className="w-full h-full grayscale opacity-80"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapSrc}
            />
            <span className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "rgba(10,15,39,.9)", color: C.text }}>Open exact location in Google Maps ↗</span>
          </a>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-6 sm:p-8">
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-lg font-bold mb-2">Send a Message</h3>
          <p style={{ color: C.faint }} className="text-xs mb-5">This opens WhatsApp with your message pre-filled, so we can reply to you directly and quickly.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!validate()) return;
              window.open(waLink(buildContactMessage(form)), "_blank", "noopener,noreferrer");
            }}
            className="space-y-4"
            noValidate
          >
            <div>
              <label htmlFor="contact-name" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Name</label>
              <input id="contact-name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-err" : undefined} style={{ background: C.surface2, border: `1px solid ${errors.name ? C.red : C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" />
              {errors.name && <p id="contact-name-err" style={{ color: C.red }} className="text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="contact-email" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Email</label>
              <input id="contact-email" type="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-err" : undefined} style={{ background: C.surface2, border: `1px solid ${errors.email ? C.red : C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" />
              {errors.email && <p id="contact-email-err" style={{ color: C.red }} className="text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="contact-message" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Message</label>
              <textarea id="contact-message" rows={5} value={form.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "contact-message-err" : undefined} style={{ background: C.surface2, border: `1px solid ${errors.message ? C.red : C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none" />
              {errors.message && <p id="contact-message-err" style={{ color: C.red }} className="text-xs mt-1">{errors.message}</p>}
            </div>
            <Button type="submit" className="w-full !py-3.5">Send via WhatsApp</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CART PAGE
============================================================ */
function CartPage({ cart, updateQty, removeItem, clearCart, go, notify }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const items = cart
    .map((c) => ({ ...c, product: PRODUCTS.find((p) => p.id === c.id) }))
    .filter((c) => c.product);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <ShoppingCart size={44} style={{ color: C.faint }} className="mx-auto mb-4" strokeWidth={1.2} />
        <h1 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p style={{ color: C.faint }} className="text-sm mb-6">Browse our shop and add products to get started.</p>
        <Button onClick={() => go("shop")}>Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <SectionHeading eyebrow="Your Cart" title="Cart & Order" />
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-3">
          {items.map((i) => {
            const max = getMaxOrderable(i.product);
            const status = getStockStatus(i.product);
            return (
              <div key={i.id} style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-4 flex items-center gap-4">
                <ProductImage src={i.product.image} icon={ICONS[i.product.category] || Smartphone} alt={i.product.name} className="w-16 h-16 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <p style={{ color: C.text }} className="text-sm font-semibold truncate">{i.product.name}</p>
                  <Price price={i.product.price} />
                  {status !== "In Stock" && <StockBadge status={status} className="mt-1" />}
                </div>
                <div style={{ border: `1px solid ${C.line}` }} className="flex items-center rounded-lg">
                  <button onClick={() => updateQty(i.id, Math.max(1, i.qty - 1), max)} aria-label={`Decrease quantity of ${i.product.name}`} className="p-2" style={{ color: C.text }}><Minus size={13} /></button>
                  <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace" }} className="w-6 text-center text-xs" aria-live="polite">{i.qty}</span>
                  <button onClick={() => updateQty(i.id, i.qty + 1, max)} disabled={i.qty >= max} aria-label={`Increase quantity of ${i.product.name}`} className="p-2 disabled:opacity-40" style={{ color: C.text }}><Plus size={13} /></button>
                </div>
                <button onClick={() => { removeItem(i.id); notify(`${i.product.name} removed from cart`); }} aria-label={`Remove ${i.product.name} from cart`} style={{ color: C.red }} className="p-2"><Trash2 size={16} /></button>
              </div>
            );
          })}
          <button onClick={() => { clearCart(); notify("Cart cleared"); }} style={{ color: C.faint }} className="text-xs mt-2 hover:text-white">Clear cart</button>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-2xl p-6 h-fit lg:sticky lg:top-24">
          <h3 style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }} className="font-bold mb-4">Order Summary</h3>
          <div className="flex justify-between text-sm mb-2" style={{ color: C.muted }}><span>Subtotal</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>GH₵{subtotal.toLocaleString()}</span></div>
          <p style={{ color: C.faint }} className="text-xs mb-4">Delivery/pickup arranged after order confirmation via WhatsApp.</p>
          <div style={{ borderTop: `1px solid ${C.line}` }} className="pt-4 mb-4 flex justify-between font-bold">
            <span style={{ color: C.text }}>Total</span>
            <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>GH₵{subtotal.toLocaleString()}</span>
          </div>
          <label htmlFor="cart-name" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Your name</label>
          <input id="cart-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none mb-3 placeholder:text-[#5C6774]" />
          <label htmlFor="cart-phone" style={{ color: C.muted }} className="text-xs font-medium block mb-1.5">Your phone (optional)</label>
          <input id="cart-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024xxxxxxx" style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.text }} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none mb-4 placeholder:text-[#5C6774]" />
          <WaButton message={buildOrderMessage({ name, phone, items, subtotal })} full className="!py-3.5" ariaLabel="Send order via WhatsApp">Order via WhatsApp</WaButton>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRIVACY & TERMS
============================================================ */
function LegalPage({ title, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: C.text }} className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
      <p style={{ color: C.faint }} className="text-xs mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="space-y-5 text-sm leading-relaxed" style={{ color: C.muted }}>{children}</div>
    </div>
  );
}

function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>{BUSINESS_NAME} ("we", "us", "our") respects your privacy. This page explains, in general terms, how information you share with us — for example through our contact form, WhatsApp, or when placing an order — may be used.</p>
      <p><strong style={{ color: C.text }}>Information we collect:</strong> Name, phone number, WhatsApp number, email address, and order details you provide when contacting us or placing an order.</p>
      <p><strong style={{ color: C.text }}>How we use it:</strong> To respond to enquiries, process orders and repair bookings, and communicate with you about your purchase or service.</p>
      <p><strong style={{ color: C.text }}>Sharing:</strong> We do not sell your personal information. Information is only shared as needed to fulfil your order (e.g. delivery arrangements).</p>
      <p><strong style={{ color: C.text }}>WhatsApp:</strong> Messages sent via WhatsApp are subject to WhatsApp's own privacy policy in addition to this one.</p>
      <p><strong style={{ color: C.text }}>Contact us:</strong> For questions about this policy, contact us at {CONTACT_EMAIL} or via WhatsApp.</p>
    </LegalPage>
  );
}

function Terms() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>By using this website or purchasing from {BUSINESS_NAME}, you agree to the following general terms.</p>
      <p><strong style={{ color: C.text }}>Products:</strong> We aim to display accurate pricing and availability, but stock and prices are subject to change without notice.</p>
      <p><strong style={{ color: C.text }}>Orders:</strong> Orders placed through this site are confirmed directly via WhatsApp before payment or delivery is arranged.</p>
      <p><strong style={{ color: C.text }}>Repairs:</strong> Repair bookings made through this site are requests only and are confirmed after diagnosis. Repair pricing is communicated before work begins.</p>
      <p><strong style={{ color: C.text }}>Installments:</strong> Installment terms are agreed individually with our team and are not automatically approved through this website.</p>
      <p><strong style={{ color: C.text }}>Warranty:</strong> Warranty terms, where applicable, will be communicated at the time of purchase or repair.</p>
    </LegalPage>
  );
}

/* ============================================================
   SEO HEAD (title, meta description, canonical, OG/Twitter, JSON-LD)
============================================================ */
const PAGE_META = {
  home: { title: `${BUSINESS_NAME} | Phone Shop & Repairs in Kasoa, Ghana`, desc: `${BUSINESS_NAME} — quality phones, genuine accessories and professional phone repairs in Kasoa Danchira, Mataheko Junction, Ghana.` },
  shop: { title: `Shop | ${BUSINESS_NAME}`, desc: `Browse smartphones and accessories at ${BUSINESS_NAME}, your phone shop in Kasoa, Ghana.` },
  phones: { title: `Phones | ${BUSINESS_NAME}`, desc: "Shop Apple, Samsung, Tecno, Infinix, Itel, Xiaomi, Oppo and Vivo phones at OMB Stores Kasoa." },
  accessories: { title: `Accessories | ${BUSINESS_NAME}`, desc: "Genuine phone accessories in Kasoa, Ghana — cases, chargers, earbuds, power banks and more." },
  repairs: { title: `Phone Repairs in Kasoa | ${BUSINESS_NAME}`, desc: "Professional phone repair in Ghana — screens, batteries, charging ports, software and more. Book a repair with OMB Stores Kasoa." },
  installments: { title: `Installment Phones | ${BUSINESS_NAME}`, desc: `Get your next phone and pay in installments with ${BUSINESS_NAME}, Kasoa.` },
  about: { title: `About Us | ${BUSINESS_NAME}`, desc: `Learn about ${BUSINESS_NAME} — Only My Brothers — a trusted phone and accessories business in Kasoa, Ghana.` },
  contact: { title: `Contact Us | ${BUSINESS_NAME}`, desc: `Contact ${BUSINESS_NAME} in Kasoa Danchira, Mataheko Junction, Ghana — by phone, WhatsApp or email.` },
  cart: { title: `Your Cart | ${BUSINESS_NAME}`, desc: `Review your cart and order via WhatsApp from ${BUSINESS_NAME}.` },
  product: { title: `Product | ${BUSINESS_NAME}`, desc: `Shop quality phones and accessories at ${BUSINESS_NAME}.` },
  privacy: { title: `Privacy Policy | ${BUSINESS_NAME}`, desc: `${BUSINESS_NAME} privacy policy.` },
  terms: { title: `Terms & Conditions | ${BUSINESS_NAME}`, desc: `${BUSINESS_NAME} terms and conditions.` },
};

function setMeta(attr, key, content) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function useSEO(page, product) {
  useEffect(() => {
    const meta = PAGE_META[page] || PAGE_META.home;
    const title = page === "product" && product ? `${product.name} | ${BUSINESS_NAME}` : meta.title;
    const desc = page === "product" && product ? product.description : meta.desc;

    document.title = title;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", page === "product" ? "product" : "website");
    if (product?.image) setMeta("property", "og:image", product.image);
    setMeta("name", "twitter:card", product?.image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);

    if (SITE_URL) {
      const path = page === "product" && product ? `/product/${product.id}` : page === "home" ? "/" : `/${page}`;
      const canonicalUrl = `${SITE_URL.replace(/\/$/, "")}${path}`;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = canonicalUrl;
      setMeta("property", "og:url", canonicalUrl);
    }

    // LocalBusiness JSON-LD — only confirmed fields are included.
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ElectronicsStore",
      name: BUSINESS_NAME,
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE,
      address: { "@type": "PostalAddress", streetAddress: BUSINESS_ADDRESS },
      ...(SITE_URL ? { url: SITE_URL } : {}),
      ...(OPENING_HOURS ? { openingHoursSpecification: OPENING_HOURS } : {}),
    };
    let script = document.getElementById("omb-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "omb-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [page, product]);
}

/* ============================================================
   TOAST
============================================================ */
function useToast() {
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);
  const notify = useCallback((msg) => {
    setToast(msg);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(""), 2200);
  }, []);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  return { toast, notify };
}

/* ============================================================
   ROOT APP
============================================================ */
export default function App() {
  const initial = typeof window !== "undefined" ? parseHash() : { page: "home" };
  const [page, setPage] = useState(initial.page);
  const [filters, setFilters] = useState({});
  const [selectedId, setSelectedId] = useState(initial.id || null);
  const [search, setSearch] = useState("");
  const { toast, notify } = useToast();
  const { cart, addToCart, updateQty, removeItem, clearCart } = useCart();

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash();
      setPage(parsed.page);
      if (parsed.id) setSelectedId(parsed.id);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const go = (key, opts = {}) => {
    setPage(key);
    if (opts.category || opts.brand) setFilters({ category: opts.category, brand: opts.brand });
    else if (key === "shop") setFilters({});
    if (opts.id) setSelectedId(opts.id);
    setHash(key, opts.id);
  };

  const openProduct = (product) => {
    setSelectedId(product.id);
    setPage("product");
    setHash("product", product.id);
  };

  const handleAddToCart = (product, qty = 1) => {
    if (product.price == null) { notify(`${product.name}: price on request`); return { ok: false, reason: "price-on-request" }; }
    const result = addToCart(product, qty);
    if (result.ok) notify(`${product.name} added to cart`);
    else notify(`${product.name} is out of stock`);
    return result;
  };

  const handleUpdateQty = (id, qty, max) => {
    updateQty(id, qty, max);
  };

  const selectedProduct = PRODUCTS.find((p) => p.id === selectedId);
  const cartCount = cart.reduce((n, c) => n + c.qty, 0);

  useSEO(page, selectedProduct);

  let content;
  if (page === "home") content = <Home go={go} openProduct={openProduct} addToCart={handleAddToCart} />;
  else if (page === "shop") content = <Shop openProduct={openProduct} addToCart={handleAddToCart} search={search} setSearch={setSearch} initialFilters={filters} />;
  else if (page === "phones") content = <Shop openProduct={openProduct} addToCart={handleAddToCart} search={search} setSearch={setSearch} initialFilters={filters} categoryLock={["Smartphones"]} title="Phones" subtitle="Apple, Samsung, Tecno, Infinix, Itel, Xiaomi, Oppo and Vivo — genuine phones at fair prices." />;
  else if (page === "accessories") content = <Shop openProduct={openProduct} addToCart={handleAddToCart} search={search} setSearch={setSearch} initialFilters={filters} categoryLock={ACCESSORY_CATEGORIES} title="Accessories" subtitle="Cases, chargers, cables, power banks, earbuds and more." />;
  else if (page === "product") content = <ProductDetails product={selectedProduct} go={go} addToCart={handleAddToCart} />;
  else if (page === "repairs") content = <Repairs />;
  else if (page === "installments") content = <Installments />;
  else if (page === "about") content = <About go={go} />;
  else if (page === "contact") content = <Contact />;
  else if (page === "cart") content = <CartPage cart={cart} updateQty={handleUpdateQty} removeItem={removeItem} clearCart={clearCart} go={go} notify={notify} />;
  else if (page === "privacy") content = <Privacy />;
  else if (page === "terms") content = <Terms />;
  else content = <Home go={go} openProduct={openProduct} addToCart={handleAddToCart} />;

  return (
    <div style={{ background: C.ink, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="antialiased">
      <style>{`
        ${FONT_IMPORT}
        * { scroll-behavior: smooth; }
        ::selection { background: ${C.gold}; color: #1C1400; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
        input:focus, textarea:focus, select:focus, button:focus-visible, a:focus-visible {
          outline: 2px solid ${C.gold}; outline-offset: 2px;
        }
        body { background: ${C.ink}; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      `}</style>

      <a href="#omb-main-content" className="sr-only">Skip to content</a>
      <Navbar page={page} go={go} cartCount={cartCount} search={search} setSearch={setSearch} />

      <main id="omb-main-content" className="pb-4 lg:pb-0">{content}</main>

      <Footer go={go} />

      <div aria-live="polite" className="sr-only">{toast}</div>
      {toast && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.text }} className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl z-50 flex items-center gap-2 animate-[float_0.3s_ease-out]">
          <CheckCircle2 size={15} style={{ color: C.teal }} /> {toast}
        </div>
      )}
    </div>
  );
}
