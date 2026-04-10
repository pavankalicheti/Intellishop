"""
IntelliShop — E-Commerce Data Analysis Module
===============================================
Generates business intelligence insights from order, user, and sales data
for the IntelliShop fashion e-commerce platform.

Reports generated:
  • Revenue & Sales KPIs (daily, weekly, monthly trends)
  • Customer Segmentation (RFM analysis)
  • Product Performance Rankings
  • Geographic Sales Distribution
  • Payment Method Analytics
  • Fraud Rate Trends
  • Cohort Retention Analysis

Usage:
    python data_analysis.py

Dependencies:
    pandas, numpy  (see requirements.txt)

Note:
    This is a supplementary analytics module. It does NOT connect to or
    modify any part of the IntelliShop frontend or backend.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict
import json


# =============================================================================
# 1. SYNTHETIC DATA LOADER
# =============================================================================

INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
    "Chandigarh", "Kochi", "Indore", "Nagpur", "Surat",
]

CATEGORIES = ["Clothing", "Footwear", "Accessories", "Ethnic Wear", "Sportswear"]

PAYMENT_METHODS = [
    "UPI - GPay", "UPI - PhonePe", "Credit Card - Visa",
    "Debit Card - RuPay", "Net Banking - HDFC", "COD", "Wallet - Paytm",
]

PRODUCTS = [
    ("Premium Cotton T-Shirt", "Clothing", 799),
    ("Slim Fit Jeans", "Clothing", 1499),
    ("Leather Wallet", "Accessories", 599),
    ("Running Shoes Nike", "Footwear", 4999),
    ("Formal Blazer", "Clothing", 3999),
    ("Silk Saree", "Ethnic Wear", 2499),
    ("Designer Kurti", "Ethnic Wear", 1299),
    ("Sports Watch", "Accessories", 1999),
    ("Sunglasses Ray-Ban", "Accessories", 3499),
    ("Laptop Bag", "Accessories", 899),
    ("Gold Plated Earrings", "Accessories", 699),
    ("Cotton Bedsheet Set", "Clothing", 1199),
    ("Wireless Earbuds", "Accessories", 1499),
    ("Yoga Pants", "Sportswear", 999),
    ("Denim Jacket", "Clothing", 2299),
    ("Ethnic Sherwani", "Ethnic Wear", 5999),
    ("Canvas Sneakers", "Footwear", 1799),
    ("Silver Ring", "Accessories", 499),
    ("Perfume Gift Set", "Accessories", 2999),
    ("Leather Belt", "Accessories", 799),
]


def generate_orders(n=5000, days_back=90):
    """Generate a realistic order dataset for analysis."""
    np.random.seed(42)
    now = datetime.now()

    records = []
    for i in range(n):
        product = PRODUCTS[np.random.randint(0, len(PRODUCTS))]
        quantity = np.random.choice([1, 1, 1, 2, 2, 3], p=[0.45, 0.20, 0.10, 0.10, 0.10, 0.05])
        base_price = product[2]
        discount = np.random.choice([0, 0, 0, 0.05, 0.10, 0.15, 0.20, 0.30],
                                     p=[0.30, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10, 0.05])
        amount = round(base_price * quantity * (1 - discount), 2)
        order_date = now - timedelta(days=np.random.randint(0, days_back),
                                      hours=np.random.randint(0, 24),
                                      minutes=np.random.randint(0, 60))
        status = np.random.choice(
            ["Delivered", "Shipped", "Processing", "Cancelled", "Returned", "Flagged"],
            p=[0.55, 0.15, 0.10, 0.08, 0.07, 0.05]
        )
        risk_score = np.random.beta(2, 8) * 100  # Skewed low

        records.append({
            "order_id": f"ORD-{10000 + i:06d}",
            "user_id": f"USR-{np.random.randint(1000, 1200):05d}",
            "product_name": product[0],
            "category": product[1],
            "base_price": base_price,
            "quantity": quantity,
            "discount_pct": discount,
            "amount": amount,
            "payment_method": np.random.choice(PAYMENT_METHODS),
            "city": np.random.choice(INDIAN_CITIES),
            "status": status,
            "risk_score": round(risk_score, 1),
            "is_flagged": risk_score > 65,
            "order_date": order_date,
        })

    return pd.DataFrame(records)


def generate_users(n=500):
    """Generate a realistic user dataset."""
    np.random.seed(42)
    names = [
        "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun",
        "Kavya", "Rahul", "Diya", "Aditya", "Meera", "Karthik", "Ishita",
        "Nikhil", "Pooja", "Siddharth", "Shruti", "Manish", "Neha",
    ]
    surnames = [
        "Sharma", "Patel", "Gupta", "Singh", "Reddy", "Iyer", "Mehta",
        "Nair", "Verma", "Kapoor", "Joshi", "Rao", "Das", "Kumar",
    ]

    records = []
    for i in range(n):
        name = f"{np.random.choice(names)} {np.random.choice(surnames)}"
        joined = datetime.now() - timedelta(days=np.random.randint(1, 400))
        records.append({
            "user_id": f"USR-{1000 + i:05d}",
            "name": name,
            "email": f"{name.lower().replace(' ', '.')}{np.random.randint(1, 99)}@gmail.com",
            "city": np.random.choice(INDIAN_CITIES),
            "joined_date": joined,
            "total_orders": np.random.poisson(lam=8),
            "total_spent": round(np.random.lognormal(mean=8, sigma=1.2), 2),
            "risk_score": round(np.random.beta(2, 8) * 100, 1),
            "status": np.random.choice(["Active", "Active", "Active", "Watchlist", "Blocked"],
                                        p=[0.70, 0.10, 0.05, 0.10, 0.05]),
        })

    return pd.DataFrame(records)


# =============================================================================
# 2. REVENUE & SALES KPI ANALYSIS
# =============================================================================

def analyze_revenue(orders: pd.DataFrame) -> dict:
    """Compute core revenue KPIs."""
    delivered = orders[orders["status"] == "Delivered"]
    total_revenue = delivered["amount"].sum()
    total_orders = len(delivered)
    avg_order_value = delivered["amount"].mean()
    median_order_value = delivered["amount"].median()

    # Daily revenue trend
    delivered = delivered.copy()
    delivered["date"] = delivered["order_date"].dt.date
    daily = delivered.groupby("date")["amount"].sum().reset_index()
    daily.columns = ["date", "revenue"]
    daily = daily.sort_values("date")

    # Week-over-week growth
    weekly = delivered.set_index("order_date").resample("W")["amount"].sum()
    wow_growth = weekly.pct_change().dropna().mean() * 100

    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "avg_order_value": round(avg_order_value, 2),
        "median_order_value": round(median_order_value, 2),
        "wow_growth_pct": round(wow_growth, 2),
        "daily_trend_sample": daily.tail(7).to_dict("records"),
    }


# =============================================================================
# 3. CUSTOMER SEGMENTATION — RFM Analysis
# =============================================================================

def rfm_segmentation(orders: pd.DataFrame) -> pd.DataFrame:
    """
    Perform RFM (Recency, Frequency, Monetary) segmentation.

    Segments:
        Champions      — Recent, frequent, high spend
        Loyal           — Frequent buyers
        At Risk         — Used to buy, haven't recently
        Hibernating     — Long inactive
        New Customers   — Recent first-timers
    """
    now = orders["order_date"].max()
    delivered = orders[orders["status"] == "Delivered"]

    rfm = delivered.groupby("user_id").agg(
        recency=("order_date", lambda x: (now - x.max()).days),
        frequency=("order_id", "nunique"),
        monetary=("amount", "sum"),
    ).reset_index()

    # Score each dimension 1–5
    rfm["r_score"] = pd.qcut(rfm["recency"], 5, labels=[5, 4, 3, 2, 1]).astype(int)
    rfm["f_score"] = pd.qcut(rfm["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm["m_score"] = pd.qcut(rfm["monetary"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm["rfm_total"] = rfm["r_score"] + rfm["f_score"] + rfm["m_score"]

    # Assign segment
    def segment(row):
        if row["rfm_total"] >= 13:
            return "Champions"
        elif row["f_score"] >= 4:
            return "Loyal"
        elif row["r_score"] <= 2 and row["f_score"] >= 3:
            return "At Risk"
        elif row["r_score"] <= 2:
            return "Hibernating"
        else:
            return "New Customers"

    rfm["segment"] = rfm.apply(segment, axis=1)
    return rfm


# =============================================================================
# 4. PRODUCT PERFORMANCE
# =============================================================================

def product_performance(orders: pd.DataFrame) -> pd.DataFrame:
    """Rank products by revenue, units sold, and average rating proxy."""
    delivered = orders[orders["status"].isin(["Delivered", "Shipped"])]

    perf = delivered.groupby("product_name").agg(
        units_sold=("quantity", "sum"),
        total_revenue=("amount", "sum"),
        avg_order_value=("amount", "mean"),
        order_count=("order_id", "nunique"),
    ).reset_index()

    perf = perf.sort_values("total_revenue", ascending=False)
    perf["revenue_share_pct"] = round(perf["total_revenue"] / perf["total_revenue"].sum() * 100, 2)
    perf["cumulative_share"] = perf["revenue_share_pct"].cumsum()
    perf["pareto_class"] = perf["cumulative_share"].apply(
        lambda x: "A (Top 80%)" if x <= 80 else "B (Next 15%)" if x <= 95 else "C (Bottom 5%)"
    )

    return perf


# =============================================================================
# 5. GEOGRAPHIC DISTRIBUTION
# =============================================================================

def geographic_analysis(orders: pd.DataFrame) -> pd.DataFrame:
    """Revenue and order distribution by city."""
    geo = orders.groupby("city").agg(
        total_orders=("order_id", "nunique"),
        total_revenue=("amount", "sum"),
        avg_order_value=("amount", "mean"),
        flagged_count=("is_flagged", "sum"),
        unique_users=("user_id", "nunique"),
    ).reset_index()

    geo["fraud_rate_pct"] = round(geo["flagged_count"] / geo["total_orders"] * 100, 2)
    geo = geo.sort_values("total_revenue", ascending=False)
    return geo


# =============================================================================
# 6. PAYMENT METHOD ANALYTICS
# =============================================================================

def payment_analysis(orders: pd.DataFrame) -> pd.DataFrame:
    """Breakdown of payment methods with fraud correlation."""
    pay = orders.groupby("payment_method").agg(
        order_count=("order_id", "nunique"),
        total_revenue=("amount", "sum"),
        avg_order_value=("amount", "mean"),
        avg_risk_score=("risk_score", "mean"),
        flagged_count=("is_flagged", "sum"),
    ).reset_index()

    pay["share_pct"] = round(pay["order_count"] / pay["order_count"].sum() * 100, 2)
    pay["fraud_rate_pct"] = round(pay["flagged_count"] / pay["order_count"] * 100, 2)
    pay = pay.sort_values("order_count", ascending=False)
    return pay


# =============================================================================
# 7. FRAUD RATE TREND
# =============================================================================

def fraud_trend(orders: pd.DataFrame, period="W") -> pd.DataFrame:
    """Weekly or daily fraud rate trend over time."""
    orders = orders.copy()
    orders["period"] = orders["order_date"].dt.to_period(period)

    trend = orders.groupby("period").agg(
        total_orders=("order_id", "nunique"),
        flagged=("is_flagged", "sum"),
        avg_risk=("risk_score", "mean"),
    ).reset_index()

    trend["fraud_rate_pct"] = round(trend["flagged"] / trend["total_orders"] * 100, 2)
    trend["period"] = trend["period"].astype(str)
    return trend


# =============================================================================
# 8. COHORT RETENTION
# =============================================================================

def cohort_retention(orders: pd.DataFrame) -> pd.DataFrame:
    """Monthly cohort retention matrix."""
    orders = orders.copy()
    orders["order_month"] = orders["order_date"].dt.to_period("M")

    # Cohort = month of first purchase
    cohorts = orders.groupby("user_id")["order_month"].min().reset_index()
    cohorts.columns = ["user_id", "cohort"]
    orders = orders.merge(cohorts, on="user_id")

    # Periods since cohort
    orders["periods_since"] = (orders["order_month"] - orders["cohort"]).apply(lambda x: x.n)

    # Retention matrix
    retention = orders.groupby(["cohort", "periods_since"])["user_id"].nunique().reset_index()
    retention.columns = ["cohort", "period", "users"]

    # Pivot
    pivot = retention.pivot(index="cohort", columns="period", values="users").fillna(0).astype(int)

    # Normalize to percentages
    cohort_sizes = pivot[0]
    retention_pct = pivot.divide(cohort_sizes, axis=0) * 100
    retention_pct = retention_pct.round(1)
    retention_pct.index = retention_pct.index.astype(str)

    return retention_pct


# =============================================================================
# 9. MAIN — Generate Full Report
# =============================================================================

def print_section(title):
    """Helper for formatted section headers."""
    print(f"\n{'=' * 64}")
    print(f"  {title}")
    print(f"{'=' * 64}")


if __name__ == "__main__":
    print("\n🔍 IntelliShop Data Analysis Engine")
    print("    Generating insights from synthetic e-commerce data...\n")

    # Load data
    orders = generate_orders(5000, days_back=90)
    users = generate_users(500)

    # --- Revenue KPIs ---
    print_section("📊 Revenue & Sales KPIs")
    rev = analyze_revenue(orders)
    print(f"  Total Revenue       : ₹{rev['total_revenue']:,.2f}")
    print(f"  Delivered Orders    : {rev['total_orders']:,}")
    print(f"  Avg Order Value     : ₹{rev['avg_order_value']:,.2f}")
    print(f"  Median Order Value  : ₹{rev['median_order_value']:,.2f}")
    print(f"  WoW Growth          : {rev['wow_growth_pct']:+.1f}%")

    # --- RFM Segmentation ---
    print_section("👥 Customer Segmentation (RFM)")
    rfm = rfm_segmentation(orders)
    seg_summary = rfm.groupby("segment").agg(
        count=("user_id", "nunique"),
        avg_monetary=("monetary", "mean"),
        avg_recency=("recency", "mean"),
    ).reset_index()
    for _, row in seg_summary.iterrows():
        print(f"  {row['segment']:<18s}  {row['count']:>4d} users  "
              f"Avg Spend: ₹{row['avg_monetary']:>10,.0f}  "
              f"Avg Recency: {row['avg_recency']:.0f} days")

    # --- Product Performance ---
    print_section("🛍️ Top 10 Products by Revenue")
    perf = product_performance(orders)
    for _, row in perf.head(10).iterrows():
        print(f"  {row['product_name']:<30s}  ₹{row['total_revenue']:>10,.0f}  "
              f"{row['units_sold']:>4d} units  [{row['pareto_class']}]")

    # --- Geographic ---
    print_section("🗺️ Revenue by City (Top 10)")
    geo = geographic_analysis(orders)
    for _, row in geo.head(10).iterrows():
        print(f"  {row['city']:<15s}  ₹{row['total_revenue']:>10,.0f}  "
              f"{row['total_orders']:>4d} orders  Fraud: {row['fraud_rate_pct']:.1f}%")

    # --- Payment ---
    print_section("💳 Payment Method Breakdown")
    pay = payment_analysis(orders)
    for _, row in pay.iterrows():
        print(f"  {row['payment_method']:<22s}  {row['share_pct']:>5.1f}%  "
              f"₹{row['total_revenue']:>10,.0f}  Fraud: {row['fraud_rate_pct']:.1f}%")

    # --- Fraud Trend ---
    print_section("🚨 Weekly Fraud Rate Trend")
    ft = fraud_trend(orders, "W")
    for _, row in ft.iterrows():
        bar = "█" * int(row["fraud_rate_pct"] * 2)
        print(f"  {row['period']:<12s}  {row['fraud_rate_pct']:>5.1f}%  {bar}")

    # --- Cohort Retention ---
    print_section("📈 Monthly Cohort Retention (%)")
    ret = cohort_retention(orders)
    print(ret.to_string())

    print(f"\n{'=' * 64}")
    print("  ✅ Analysis complete. All data is synthetic / demo-only.")
    print(f"{'=' * 64}\n")
