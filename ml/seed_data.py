"""
IntelliShop — E-Commerce Mock Data Seeder
==========================================
Generates realistic, production-quality mock data for an Indian fashion
e-commerce platform. Outputs JSON files that can be used for testing,
demos, or seeding a database.

Data generated:
  • Users           — 500 Indian customers with realistic profiles
  • Products        — 120 fashion products across categories
  • Orders          — 5,000 orders over 90 days with fraud scoring
  • Reviews         — 2,000 product reviews with ratings and text
  • Addresses       — Multiple addresses per user
  • Promo Codes     — Active discount codes

Output:
  All files are written to ./ml/seed_output/ as JSON.

Usage:
    python seed_data.py

Dependencies:
    numpy  (see requirements.txt)

Note:
    This is a supplementary data generation module. It does NOT connect to
    or modify any part of the IntelliShop frontend or backend.
"""

import numpy as np
import json
import os
from datetime import datetime, timedelta


# =============================================================================
# CONSTANTS — Indian Fashion E-Commerce Domain
# =============================================================================

FIRST_NAMES_MALE = [
    "Aarav", "Rohan", "Vikram", "Arjun", "Rahul", "Aditya", "Karthik",
    "Nikhil", "Siddharth", "Manish", "Deepak", "Harsh", "Varun", "Amit",
    "Rajesh", "Vivek", "Pranav", "Ankit", "Suresh", "Gaurav",
]

FIRST_NAMES_FEMALE = [
    "Priya", "Ananya", "Sneha", "Kavya", "Diya", "Meera", "Ishita",
    "Pooja", "Shruti", "Neha", "Ritu", "Swati", "Ankita", "Tanvi",
    "Simran", "Sakshi", "Nisha", "Divya", "Ruhi", "Aisha",
]

SURNAMES = [
    "Sharma", "Patel", "Gupta", "Singh", "Reddy", "Iyer", "Mehta",
    "Nair", "Verma", "Kapoor", "Joshi", "Rao", "Das", "Kumar",
    "Pillai", "Bhat", "Kulkarni", "Mishra", "Tiwari", "Saxena",
    "Deshmukh", "Malhotra", "Srinivasan", "Chopra", "Kaur", "Chauhan",
    "Bhatt", "Pandey", "Agarwal", "Menon",
]

CITIES = [
    {"name": "Mumbai",       "state": "Maharashtra",    "pin_prefix": "400"},
    {"name": "Delhi",        "state": "Delhi",          "pin_prefix": "110"},
    {"name": "Bangalore",    "state": "Karnataka",      "pin_prefix": "560"},
    {"name": "Hyderabad",    "state": "Telangana",      "pin_prefix": "500"},
    {"name": "Chennai",      "state": "Tamil Nadu",     "pin_prefix": "600"},
    {"name": "Kolkata",      "state": "West Bengal",    "pin_prefix": "700"},
    {"name": "Pune",         "state": "Maharashtra",    "pin_prefix": "411"},
    {"name": "Ahmedabad",    "state": "Gujarat",        "pin_prefix": "380"},
    {"name": "Jaipur",       "state": "Rajasthan",      "pin_prefix": "302"},
    {"name": "Lucknow",      "state": "Uttar Pradesh",  "pin_prefix": "226"},
    {"name": "Chandigarh",   "state": "Punjab",         "pin_prefix": "160"},
    {"name": "Kochi",        "state": "Kerala",         "pin_prefix": "682"},
    {"name": "Indore",       "state": "Madhya Pradesh", "pin_prefix": "452"},
    {"name": "Nagpur",       "state": "Maharashtra",    "pin_prefix": "440"},
    {"name": "Surat",        "state": "Gujarat",        "pin_prefix": "395"},
]

STREETS = [
    "MG Road", "Station Road", "Ring Road", "Park Street", "Lake View Colony",
    "Gandhi Nagar", "Nehru Enclave", "Rajaji Street", "Civil Lines", "Cantonment Area",
    "Sector 17", "Phase 2", "Old City Road", "New Market Road", "Industrial Area",
]

BRANDS = [
    {"name": "Fabindia",     "tier": "premium"},
    {"name": "Allen Solly",  "tier": "mid"},
    {"name": "Zara",         "tier": "premium"},
    {"name": "H&M",          "tier": "mid"},
    {"name": "Levi's",       "tier": "premium"},
    {"name": "Raymond",      "tier": "premium"},
    {"name": "Peter England","tier": "mid"},
    {"name": "Biba",         "tier": "mid"},
    {"name": "W",            "tier": "mid"},
    {"name": "Nike",         "tier": "premium"},
    {"name": "Adidas",       "tier": "premium"},
    {"name": "Puma",         "tier": "mid"},
    {"name": "Roadster",     "tier": "budget"},
    {"name": "Manyavar",     "tier": "premium"},
    {"name": "FabAlley",     "tier": "mid"},
]

CATEGORIES = {
    "Men's Clothing": [
        ("Premium Cotton T-Shirt",    599,  1299),
        ("Slim Fit Formal Shirt",     899,  2499),
        ("Chino Trousers",            999,  2999),
        ("Denim Jeans",               1299, 3499),
        ("Formal Blazer",             2999, 7999),
        ("Casual Polo Shirt",         699,  1499),
        ("Linen Kurta",               899,  2499),
        ("Track Pants",               599,  1299),
    ],
    "Women's Clothing": [
        ("Designer Kurti",            799,  2499),
        ("Silk Saree",                1999, 8999),
        ("Anarkali Dress",            1499, 4999),
        ("Palazzo Pants",             699,  1499),
        ("Denim Jacket",              1299, 3499),
        ("Crop Top",                  499,  1299),
        ("Maxi Dress",                999,  2999),
        ("Cotton Dupatta",            299,  799),
    ],
    "Footwear": [
        ("Running Shoes",             1999, 5999),
        ("Canvas Sneakers",           999,  2499),
        ("Formal Oxford Shoes",       1499, 4999),
        ("Kolhapuri Chappals",        499,  1299),
        ("High-Heel Sandals",         999,  2999),
        ("Sports Flip-Flops",         299,  699),
    ],
    "Accessories": [
        ("Leather Wallet",            499,  1999),
        ("Sports Watch",              1499, 4999),
        ("Sunglasses",                999,  3999),
        ("Laptop Bag",                799,  2499),
        ("Gold Plated Earrings",      399,  1499),
        ("Silver Ring",               299,  999),
        ("Leather Belt",              499,  1499),
        ("Perfume Gift Set",          1499, 4999),
        ("Silk Scarf",                599,  1999),
    ],
    "Ethnic Wear": [
        ("Sherwani Set",              3999, 12999),
        ("Lehenga Choli",             2999, 9999),
        ("Dhoti Kurta Set",           1499, 3999),
        ("Banarasi Saree",            3999, 14999),
        ("Nehru Jacket",              1999, 4999),
        ("Pattu Pavadai",             1299, 3999),
    ],
    "Sportswear": [
        ("Yoga Pants",                699,  1499),
        ("Gym Tank Top",              399,  999),
        ("Compression Shorts",        599,  1299),
        ("Windbreaker Jacket",        1499, 3999),
        ("Sports Bra",                499,  1299),
    ],
}

REVIEW_TEMPLATES_POSITIVE = [
    "Amazing quality! The fabric feels premium and the fit is perfect.",
    "Super fast delivery, product exactly as shown. Love it!",
    "Great value for money. Will definitely order again.",
    "Color is exactly as pictured. Very comfortable to wear all day.",
    "Bought this for a wedding and received so many compliments!",
    "Excellent stitching quality. Better than what you'd get in stores.",
    "Perfect gift for my brother. He absolutely loved it.",
    "Soft material, true to size. My new favorite outfit!",
    "IntelliShop never disappoints. This is my 5th order here.",
    "Beautiful design and the packaging was also very premium.",
]

REVIEW_TEMPLATES_NEUTRAL = [
    "Decent product. Nothing exceptional but okay for the price.",
    "Product is fine, but delivery took longer than expected.",
    "Color is slightly different from the photo, but still acceptable.",
    "Fits well but the material could be better for this price range.",
    "Average quality. Expected a bit more based on the description.",
]

REVIEW_TEMPLATES_NEGATIVE = [
    "Poor stitching quality. Thread coming loose after first wash.",
    "Size runs small. Had to return and reorder a larger size.",
    "Color faded after two washes. Very disappointed.",
    "Product doesn't match the images at all. Feels cheap.",
    "Terrible packaging. Product arrived damaged.",
]

PROMO_CODES = [
    {"code": "WELCOME10",    "discount_pct": 10, "min_order": 500,   "max_uses": 1,    "type": "new_user"},
    {"code": "FESTIVE25",    "discount_pct": 25, "min_order": 2000,  "max_uses": 3,    "type": "seasonal"},
    {"code": "ETHNIC20",     "discount_pct": 20, "min_order": 1500,  "max_uses": 5,    "type": "category"},
    {"code": "FLAT500OFF",   "discount_pct": 0,  "min_order": 3000,  "max_uses": 2,    "type": "flat",      "flat_discount": 500},
    {"code": "LOYALTY15",    "discount_pct": 15, "min_order": 1000,  "max_uses": 10,   "type": "loyalty"},
    {"code": "SUMMER30",     "discount_pct": 30, "min_order": 2500,  "max_uses": 2,    "type": "seasonal"},
    {"code": "FREEDELIVERY", "discount_pct": 0,  "min_order": 799,   "max_uses": 999,  "type": "shipping",  "free_shipping": True},
    {"code": "BUNDLE20",     "discount_pct": 20, "min_order": 4000,  "max_uses": 3,    "type": "bundle"},
]

PAYMENT_METHODS = [
    "UPI - GPay", "UPI - PhonePe", "UPI - Paytm", "Credit Card - Visa",
    "Credit Card - Mastercard", "Debit Card - RuPay", "Net Banking - HDFC",
    "Net Banking - SBI", "Wallet - Paytm", "COD",
]


# =============================================================================
# SEED FUNCTIONS
# =============================================================================

def seed_users(n=500):
    """Generate user profiles."""
    np.random.seed(42)
    users = []

    all_names = FIRST_NAMES_MALE + FIRST_NAMES_FEMALE

    for i in range(n):
        first = np.random.choice(all_names)
        last = np.random.choice(SURNAMES)
        city = CITIES[np.random.randint(0, len(CITIES))]
        joined = datetime.now() - timedelta(days=np.random.randint(1, 400))

        users.append({
            "user_id": f"USR-{1000 + i:05d}",
            "name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{np.random.randint(1, 99)}@gmail.com",
            "phone": f"+91{np.random.randint(7000000000, 9999999999)}",
            "city": city["name"],
            "state": city["state"],
            "pincode": f"{city['pin_prefix']}{np.random.randint(10, 99):02d}{np.random.randint(0, 9)}",
            "gender": "Male" if first in FIRST_NAMES_MALE else "Female",
            "joined_date": joined.strftime("%Y-%m-%d"),
            "total_orders": int(np.random.poisson(lam=8)),
            "total_spent": round(float(np.random.lognormal(mean=8, sigma=1.2)), 2),
            "loyalty_tier": np.random.choice(["Bronze", "Silver", "Gold", "Platinum"],
                                              p=[0.50, 0.25, 0.15, 0.10]),
            "risk_score": round(float(np.random.beta(2, 8) * 100), 1),
            "status": np.random.choice(["Active", "Active", "Watchlist", "Blocked"],
                                        p=[0.80, 0.05, 0.10, 0.05]),
        })

    return users


def seed_products(count_per_category=None):
    """Generate the full product catalog."""
    np.random.seed(42)
    products = []
    pid = 1

    for category, items in CATEGORIES.items():
        for name, price_min, price_max in items:
            brand = BRANDS[np.random.randint(0, len(BRANDS))]
            price = np.random.randint(price_min, price_max + 1)
            # Round to nearest 99
            price = (price // 100) * 100 + 99

            sizes = ["XS", "S", "M", "L", "XL", "XXL"] if "Clothing" in category or "Ethnic" in category or "Sportswear" in category else \
                    ["6", "7", "8", "9", "10", "11"] if "Footwear" in category else \
                    ["One Size"]

            products.append({
                "product_id": pid,
                "title": name,
                "brand": brand["name"],
                "brand_tier": brand["tier"],
                "category": category,
                "price": price,
                "mrp": round(price * np.random.uniform(1.3, 2.0)),
                "discount_pct": round((1 - price / round(price * np.random.uniform(1.3, 2.0))) * 100),
                "sizes": sizes,
                "colors": list(np.random.choice(
                    ["Black", "White", "Navy", "Red", "Blue", "Green", "Maroon",
                     "Beige", "Grey", "Pink", "Yellow", "Olive"],
                    size=np.random.randint(2, 5), replace=False
                )),
                "stock": int(np.random.randint(0, 200)),
                "units_sold": int(np.random.randint(10, 500)),
                "rating": round(float(np.random.uniform(3.2, 4.9)), 1),
                "review_count": int(np.random.randint(5, 250)),
                "tags": [category.split("'")[0].strip(), brand["tier"], "trending" if np.random.random() > 0.7 else "regular"],
                "is_featured": bool(np.random.random() > 0.8),
            })
            pid += 1

    return products


def seed_orders(users, products, n=5000):
    """Generate order history."""
    np.random.seed(42)
    orders = []

    statuses = ["Delivered", "Shipped", "Processing", "Cancelled", "Returned", "Flagged"]
    status_weights = [0.55, 0.15, 0.10, 0.08, 0.07, 0.05]

    for i in range(n):
        user = users[np.random.randint(0, len(users))]
        product = products[np.random.randint(0, len(products))]
        quantity = int(np.random.choice([1, 1, 1, 2, 2, 3]))
        discount = float(np.random.choice([0, 0, 5, 10, 15, 20, 25, 30],
                                           p=[0.30, 0.10, 0.10, 0.15, 0.10, 0.10, 0.10, 0.05]))
        amount = round(product["price"] * quantity * (1 - discount / 100), 2)
        order_date = datetime.now() - timedelta(
            days=np.random.randint(0, 90),
            hours=np.random.randint(0, 24),
            minutes=np.random.randint(0, 60)
        )
        risk_score = round(float(np.random.beta(2, 8) * 100), 1)

        orders.append({
            "order_id": f"ORD-{10000 + i:06d}",
            "user_id": user["user_id"],
            "customer_name": user["name"],
            "email": user["email"],
            "phone": user["phone"],
            "product_id": product["product_id"],
            "product_name": product["title"],
            "brand": product["brand"],
            "category": product["category"],
            "quantity": quantity,
            "unit_price": product["price"],
            "discount_pct": discount,
            "total_amount": amount,
            "payment_method": np.random.choice(PAYMENT_METHODS),
            "city": user["city"],
            "state": user["state"],
            "status": np.random.choice(statuses, p=status_weights),
            "risk_score": risk_score,
            "is_flagged": risk_score > 65,
            "order_date": order_date.strftime("%Y-%m-%d %H:%M:%S"),
            "delivery_estimate": (order_date + timedelta(days=np.random.randint(3, 7))).strftime("%Y-%m-%d"),
        })

    return sorted(orders, key=lambda x: x["order_date"], reverse=True)


def seed_reviews(users, products, n=2000):
    """Generate product reviews."""
    np.random.seed(42)
    reviews = []

    for i in range(n):
        user = users[np.random.randint(0, len(users))]
        product = products[np.random.randint(0, len(products))]
        rating = int(np.random.choice([1, 2, 3, 4, 4, 5, 5, 5], p=[0.03, 0.05, 0.12, 0.20, 0.15, 0.20, 0.15, 0.10]))

        if rating >= 4:
            text = np.random.choice(REVIEW_TEMPLATES_POSITIVE)
        elif rating == 3:
            text = np.random.choice(REVIEW_TEMPLATES_NEUTRAL)
        else:
            text = np.random.choice(REVIEW_TEMPLATES_NEGATIVE)

        review_date = datetime.now() - timedelta(days=np.random.randint(1, 120))

        reviews.append({
            "review_id": f"REV-{i + 1:05d}",
            "user_id": user["user_id"],
            "user_name": user["name"],
            "product_id": product["product_id"],
            "product_name": product["title"],
            "rating": rating,
            "title": f"{'Great' if rating >= 4 else 'Okay' if rating == 3 else 'Disappointing'} purchase",
            "text": text,
            "helpful_votes": int(np.random.poisson(lam=3)),
            "verified_purchase": bool(np.random.random() > 0.15),
            "date": review_date.strftime("%Y-%m-%d"),
        })

    return reviews


def seed_addresses(users):
    """Generate 1–3 addresses per user."""
    np.random.seed(42)
    addresses = []
    aid = 1

    for user in users:
        n_addresses = int(np.random.choice([1, 1, 2, 2, 3], p=[0.30, 0.20, 0.25, 0.15, 0.10]))
        for j in range(n_addresses):
            city = CITIES[np.random.randint(0, len(CITIES))]
            addresses.append({
                "address_id": f"ADDR-{aid:05d}",
                "user_id": user["user_id"],
                "label": ["Home", "Work", "Other"][min(j, 2)],
                "is_default": j == 0,
                "full_name": user["name"],
                "phone": user["phone"],
                "line1": f"{np.random.randint(1, 500)}, {np.random.choice(STREETS)}",
                "line2": f"Near {np.random.choice(['Metro Station', 'Bus Stand', 'Market', 'Hospital', 'School'])}",
                "city": city["name"],
                "state": city["state"],
                "pincode": f"{city['pin_prefix']}{np.random.randint(10, 99):02d}{np.random.randint(0, 9)}",
            })
            aid += 1

    return addresses


# =============================================================================
# MAIN — Generate and Save
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  IntelliShop — Mock Data Seeder")
    print("  Generating realistic e-commerce dataset...")
    print("=" * 60)

    # Output directory
    out_dir = os.path.join(os.path.dirname(__file__), "seed_output")
    os.makedirs(out_dir, exist_ok=True)

    # Generate
    print("\n  👥 Generating users...")
    users = seed_users(500)

    print("  🛍️ Generating product catalog...")
    products = seed_products()

    print("  📦 Generating orders...")
    orders = seed_orders(users, products, 5000)

    print("  ⭐ Generating reviews...")
    reviews = seed_reviews(users, products, 2000)

    print("  📍 Generating addresses...")
    addresses = seed_addresses(users)

    # Promo codes (static)
    promos = PROMO_CODES

    # Save
    datasets = {
        "users.json": users,
        "products.json": products,
        "orders.json": orders,
        "reviews.json": reviews,
        "addresses.json": addresses,
        "promo_codes.json": promos,
    }

    for filename, data in datasets.items():
        path = os.path.join(out_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        print(f"  ✅ Saved {filename:<20s} — {len(data):,} records")

    # Summary
    print(f"\n{'─' * 60}")
    print(f"  📁 Output directory: {out_dir}")
    print(f"  📊 Total records generated:")
    print(f"       Users      : {len(users):>6,}")
    print(f"       Products   : {len(products):>6,}")
    print(f"       Orders     : {len(orders):>6,}")
    print(f"       Reviews    : {len(reviews):>6,}")
    print(f"       Addresses  : {len(addresses):>6,}")
    print(f"       Promo Codes: {len(promos):>6,}")
    print(f"       {'─'*20}")
    total = len(users) + len(products) + len(orders) + len(reviews) + len(addresses) + len(promos)
    print(f"       Total      : {total:>6,}")
    print(f"\n{'=' * 60}")
    print(f"  ✅ Seeding complete!")
    print(f"{'=' * 60}\n")
