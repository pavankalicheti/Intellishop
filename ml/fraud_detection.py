"""
IntelliShop — Fraud Detection Engine
=====================================
Standalone ML module for real-time transaction fraud risk scoring.

This module provides two complementary approaches:
  1. Rule-Based Scoring  — A deterministic, interpretable system that assigns
     risk points based on known fraud indicators (VPN usage, velocity anomalies,
     device fingerprint mismatches, etc.).
  2. ML Model Scoring    — A Random Forest classifier trained on historical
     transaction features to predict fraud probability.

The final risk score is a weighted blend of both systems, giving the
operations team both explainability and predictive power.

Usage:
    python fraud_detection.py

Dependencies:
    scikit-learn, pandas, numpy  (see requirements.txt)

Note:
    This is a supplementary analytics module. It does NOT connect to or
    modify any part of the IntelliShop frontend or backend.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import json
import warnings

warnings.filterwarnings("ignore")


# =============================================================================
# 1. RULE-BASED FRAUD SCORING ENGINE
# =============================================================================

class RuleBasedFraudScorer:
    """
    Deterministic fraud scoring based on configurable business rules.
    Each rule contributes weighted risk points to a composite score (0–100).
    """

    # Default rule weights — tunable by the risk team
    DEFAULT_RULES = {
        "vpn_detected":              15,   # VPN / proxy / Tor exit node
        "ip_geolocation_mismatch":   12,   # IP city ≠ billing city
        "multiple_cards_session":    18,   # >1 card used in a single session
        "velocity_anomaly":          20,   # Orders per minute exceeds threshold
        "disposable_email":          10,   # Throwaway email domain
        "device_fingerprint_change":  8,   # Device hash changed mid-session
        "high_value_new_account":    14,   # Order > ₹10K on account < 7 days old
        "excessive_returns":         10,   # Return rate > 40% in last 30 days
        "bot_signature":             20,   # Headless browser / automation detected
        "card_bin_mismatch":         12,   # Card issuing country ≠ India
        "promo_abuse":                8,   # Same promo code across linked accounts
        "shipping_freight_forwarder": 6,   # Known freight-forwarding address
    }

    # Well-known disposable email domains
    DISPOSABLE_DOMAINS = {
        "tempmail.com", "guerrillamail.com", "mailinator.com", "throwaway.email",
        "yopmail.com", "sharklasers.com", "dispostable.com", "fakeinbox.com",
        "trashmail.com", "10minutemail.com", "temp-mail.org", "getnada.com",
    }

    def __init__(self, custom_weights=None):
        self.weights = {**self.DEFAULT_RULES, **(custom_weights or {})}

    def score_transaction(self, txn: dict) -> dict:
        """
        Evaluate a single transaction and return a detailed risk breakdown.

        Parameters
        ----------
        txn : dict
            Transaction payload with keys like 'ip_city', 'billing_city',
            'email', 'cards_used', 'orders_last_minute', 'account_age_days',
            'order_amount', 'return_rate', 'vpn', 'bot', 'device_changed',
            'card_country', 'promo_linked_accounts', 'freight_forwarder'.

        Returns
        -------
        dict
            { "score": int, "flags": list[str], "recommendation": str }
        """
        flags = []
        total = 0

        # --- VPN / Proxy ---
        if txn.get("vpn", False):
            flags.append("VPN/Proxy Detected")
            total += self.weights["vpn_detected"]

        # --- IP ≠ Billing City ---
        if txn.get("ip_city", "").lower() != txn.get("billing_city", "").lower():
            if txn.get("ip_city") and txn.get("billing_city"):
                flags.append(f"IP Geolocation Mismatch ({txn['ip_city']} ≠ {txn['billing_city']})")
                total += self.weights["ip_geolocation_mismatch"]

        # --- Multiple Cards ---
        if txn.get("cards_used", 1) > 1:
            flags.append(f"Multiple Cards in Session ({txn['cards_used']} cards)")
            total += self.weights["multiple_cards_session"]

        # --- Velocity ---
        if txn.get("orders_last_minute", 0) >= 3:
            flags.append(f"Velocity Anomaly ({txn['orders_last_minute']} orders/min)")
            total += self.weights["velocity_anomaly"]

        # --- Disposable Email ---
        email = txn.get("email", "")
        domain = email.split("@")[-1].lower() if "@" in email else ""
        if domain in self.DISPOSABLE_DOMAINS:
            flags.append(f"Disposable Email Domain ({domain})")
            total += self.weights["disposable_email"]

        # --- Device Fingerprint Change ---
        if txn.get("device_changed", False):
            flags.append("Device Fingerprint Changed Mid-Session")
            total += self.weights["device_fingerprint_change"]

        # --- High-Value Order on New Account ---
        if txn.get("account_age_days", 365) < 7 and txn.get("order_amount", 0) > 10000:
            flags.append(f"High-Value Order on New Account (₹{txn['order_amount']:,}, {txn['account_age_days']}d old)")
            total += self.weights["high_value_new_account"]

        # --- Excessive Returns ---
        if txn.get("return_rate", 0) > 0.40:
            flags.append(f"Excessive Return Rate ({txn['return_rate']:.0%})")
            total += self.weights["excessive_returns"]

        # --- Bot Signature ---
        if txn.get("bot", False):
            flags.append("Bot / Headless Browser Detected")
            total += self.weights["bot_signature"]

        # --- Card BIN Mismatch ---
        if txn.get("card_country", "IN").upper() != "IN":
            flags.append(f"Card BIN Country Mismatch ({txn['card_country']})")
            total += self.weights["card_bin_mismatch"]

        # --- Promo Abuse ---
        if txn.get("promo_linked_accounts", 0) >= 3:
            flags.append(f"Promo Code Abuse ({txn['promo_linked_accounts']} linked accounts)")
            total += self.weights["promo_abuse"]

        # --- Freight Forwarder ---
        if txn.get("freight_forwarder", False):
            flags.append("Shipping to Known Freight Forwarder")
            total += self.weights["shipping_freight_forwarder"]

        # Clamp to 0–100
        score = min(100, max(0, total))

        # Recommendation
        if score >= 80:
            recommendation = "AUTO_BLOCK"
        elif score >= 60:
            recommendation = "MANUAL_REVIEW"
        elif score >= 40:
            recommendation = "FLAG_FOR_MONITORING"
        else:
            recommendation = "APPROVE"

        return {
            "score": score,
            "flags": flags,
            "flag_count": len(flags),
            "recommendation": recommendation,
        }


# =============================================================================
# 2. ML-BASED FRAUD CLASSIFIER (Random Forest)
# =============================================================================

class MLFraudClassifier:
    """
    Supervised fraud classifier using a Random Forest trained on
    engineered transaction features.

    Features used:
        - order_amount          (₹)
        - account_age_days      (days since account creation)
        - orders_last_hour      (velocity)
        - cards_used            (in current session)
        - return_rate           (0.0 – 1.0)
        - avg_session_duration  (seconds)
        - vpn                   (0 or 1)
        - device_changes        (count of fingerprint changes)
        - hour_of_day           (0–23, cyclic-encoded)
        - is_weekend            (0 or 1)
    """

    FEATURE_COLUMNS = [
        "order_amount", "account_age_days", "orders_last_hour",
        "cards_used", "return_rate", "avg_session_duration",
        "vpn", "device_changes", "hour_of_day", "is_weekend",
    ]

    def __init__(self, n_estimators=200, max_depth=12, random_state=42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight="balanced",   # Handle class imbalance
            random_state=random_state,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self.is_trained = False

    def _generate_synthetic_training_data(self, n_samples=10000):
        """
        Generate realistic synthetic training data for demonstration.
        In production, this would be replaced with real transaction logs.
        """
        np.random.seed(42)

        # --- Legitimate transactions (90%) ---
        n_legit = int(n_samples * 0.90)
        legit = pd.DataFrame({
            "order_amount":        np.random.lognormal(mean=7.5, sigma=0.8, size=n_legit).clip(199, 25000),
            "account_age_days":    np.random.exponential(scale=120, size=n_legit).clip(1, 1000).astype(int),
            "orders_last_hour":    np.random.poisson(lam=0.3, size=n_legit),
            "cards_used":          np.ones(n_legit, dtype=int),
            "return_rate":         np.random.beta(a=2, b=10, size=n_legit),
            "avg_session_duration": np.random.normal(loc=300, scale=80, size=n_legit).clip(30, 900),
            "vpn":                 np.random.binomial(1, 0.05, size=n_legit),
            "device_changes":      np.zeros(n_legit, dtype=int),
            "hour_of_day":         np.random.choice(range(8, 23), size=n_legit),
            "is_weekend":          np.random.binomial(1, 0.28, size=n_legit),
            "is_fraud":            np.zeros(n_legit, dtype=int),
        })

        # --- Fraudulent transactions (10%) ---
        n_fraud = n_samples - n_legit
        fraud = pd.DataFrame({
            "order_amount":        np.random.lognormal(mean=9.0, sigma=0.6, size=n_fraud).clip(5000, 50000),
            "account_age_days":    np.random.exponential(scale=5, size=n_fraud).clip(0, 30).astype(int),
            "orders_last_hour":    np.random.poisson(lam=4, size=n_fraud),
            "cards_used":          np.random.choice([1, 2, 3, 4], size=n_fraud, p=[0.2, 0.3, 0.3, 0.2]),
            "return_rate":         np.random.beta(a=5, b=3, size=n_fraud),
            "avg_session_duration": np.random.normal(loc=45, scale=20, size=n_fraud).clip(5, 120),
            "vpn":                 np.random.binomial(1, 0.70, size=n_fraud),
            "device_changes":      np.random.poisson(lam=2, size=n_fraud),
            "hour_of_day":         np.random.choice([0, 1, 2, 3, 4, 23], size=n_fraud),
            "is_weekend":          np.random.binomial(1, 0.55, size=n_fraud),
            "is_fraud":            np.ones(n_fraud, dtype=int),
        })

        return pd.concat([legit, fraud], ignore_index=True).sample(frac=1, random_state=42)

    def train(self, data=None):
        """Train the model. Uses synthetic data if none provided."""
        if data is None:
            data = self._generate_synthetic_training_data()

        X = data[self.FEATURE_COLUMNS]
        y = data["is_fraud"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, stratify=y, random_state=42
        )

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        y_prob = self.model.predict_proba(X_test_scaled)[:, 1]

        print("=" * 60)
        print("  IntelliShop Fraud Detection — Model Training Report")
        print("=" * 60)
        print(f"\n  Training samples : {len(X_train):,}")
        print(f"  Test samples     : {len(X_test):,}")
        print(f"  Fraud ratio      : {y.mean():.1%}")
        print(f"\n  ROC-AUC Score    : {roc_auc_score(y_test, y_prob):.4f}")
        print(f"\n{'─' * 60}")
        print("  Classification Report:")
        print("─" * 60)
        print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))

        # Feature importance
        importances = pd.Series(
            self.model.feature_importances_,
            index=self.FEATURE_COLUMNS
        ).sort_values(ascending=False)

        print("─" * 60)
        print("  Feature Importance Ranking:")
        print("─" * 60)
        for feat, imp in importances.items():
            bar = "█" * int(imp * 50)
            print(f"    {feat:<25s} {imp:.4f}  {bar}")
        print()

        return {
            "roc_auc": roc_auc_score(y_test, y_prob),
            "feature_importance": importances.to_dict(),
        }

    def predict(self, txn: dict) -> dict:
        """
        Score a single transaction.

        Returns
        -------
        dict
            { "fraud_probability": float, "is_fraud": bool, "risk_tier": str }
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call .train() first.")

        features = pd.DataFrame([{col: txn.get(col, 0) for col in self.FEATURE_COLUMNS}])
        features_scaled = self.scaler.transform(features)

        probability = self.model.predict_proba(features_scaled)[0][1]
        is_fraud = probability >= 0.50

        if probability >= 0.85:
            tier = "CRITICAL"
        elif probability >= 0.65:
            tier = "HIGH"
        elif probability >= 0.40:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        return {
            "fraud_probability": round(probability, 4),
            "is_fraud": bool(is_fraud),
            "risk_tier": tier,
        }


# =============================================================================
# 3. COMPOSITE SCORER — Blends Rule-Based + ML scores
# =============================================================================

class CompositeFraudScorer:
    """
    Combines rule-based and ML scores into a single unified risk score.
    Default blend: 40% rules + 60% ML.
    """

    def __init__(self, rule_weight=0.40, ml_weight=0.60):
        self.rule_scorer = RuleBasedFraudScorer()
        self.ml_scorer = MLFraudClassifier()
        self.rule_weight = rule_weight
        self.ml_weight = ml_weight

    def initialize(self):
        """Train the ML model (call once at startup)."""
        print("\n🔧 Training ML Fraud Classifier...\n")
        self.ml_scorer.train()
        print("✅ Composite Fraud Scorer ready.\n")

    def score(self, txn: dict) -> dict:
        """
        Score a transaction using both engines.

        Returns
        -------
        dict
            Unified result with composite score, flags, and recommendation.
        """
        rule_result = self.rule_scorer.score_transaction(txn)
        ml_result = self.ml_scorer.predict(txn)

        # Blend: normalize ML probability to 0–100 scale
        ml_score = ml_result["fraud_probability"] * 100
        composite = (self.rule_weight * rule_result["score"]) + (self.ml_weight * ml_score)
        composite = min(100, max(0, round(composite)))

        # Final recommendation
        if composite >= 80:
            action = "AUTO_BLOCK"
        elif composite >= 55:
            action = "MANUAL_REVIEW"
        elif composite >= 35:
            action = "FLAG_FOR_MONITORING"
        else:
            action = "APPROVE"

        return {
            "composite_score": composite,
            "rule_score": rule_result["score"],
            "ml_probability": ml_result["fraud_probability"],
            "ml_risk_tier": ml_result["risk_tier"],
            "flags": rule_result["flags"],
            "recommendation": action,
            "scored_at": datetime.now().isoformat(),
        }


# =============================================================================
# 4. DEMO — Run standalone
# =============================================================================

if __name__ == "__main__":
    scorer = CompositeFraudScorer()
    scorer.initialize()

    # Sample transactions
    test_transactions = [
        {
            "email": "aarav.sharma42@gmail.com",
            "order_amount": 1299,
            "account_age_days": 180,
            "orders_last_hour": 0,
            "orders_last_minute": 0,
            "cards_used": 1,
            "return_rate": 0.05,
            "avg_session_duration": 320,
            "vpn": False,
            "bot": False,
            "device_changes": 0,
            "device_changed": False,
            "hour_of_day": 14,
            "is_weekend": False,
            "ip_city": "Mumbai",
            "billing_city": "Mumbai",
            "card_country": "IN",
            "promo_linked_accounts": 0,
            "freight_forwarder": False,
        },
        {
            "email": "xuser99@tempmail.com",
            "order_amount": 18500,
            "account_age_days": 2,
            "orders_last_hour": 6,
            "orders_last_minute": 4,
            "cards_used": 3,
            "return_rate": 0.65,
            "avg_session_duration": 35,
            "vpn": True,
            "bot": True,
            "device_changes": 3,
            "device_changed": True,
            "hour_of_day": 2,
            "is_weekend": True,
            "ip_city": "Moscow",
            "billing_city": "Delhi",
            "card_country": "RU",
            "promo_linked_accounts": 5,
            "freight_forwarder": True,
        },
        {
            "email": "priya.patel@gmail.com",
            "order_amount": 4999,
            "account_age_days": 45,
            "orders_last_hour": 1,
            "orders_last_minute": 0,
            "cards_used": 1,
            "return_rate": 0.22,
            "avg_session_duration": 180,
            "vpn": True,
            "bot": False,
            "device_changes": 1,
            "device_changed": False,
            "hour_of_day": 22,
            "is_weekend": False,
            "ip_city": "Bangalore",
            "billing_city": "Pune",
            "card_country": "IN",
            "promo_linked_accounts": 1,
            "freight_forwarder": False,
        },
    ]

    labels = ["✅ Normal Purchase", "🚨 Highly Suspicious", "⚠️ Moderate Risk"]

    print("\n" + "=" * 60)
    print("  LIVE SCORING DEMO — Sample Transactions")
    print("=" * 60)

    for txn, label in zip(test_transactions, labels):
        result = scorer.score(txn)
        print(f"\n{'─' * 60}")
        print(f"  {label}")
        print(f"  Email       : {txn['email']}")
        print(f"  Amount      : ₹{txn['order_amount']:,}")
        print(f"  Account Age : {txn['account_age_days']} days")
        print(f"{'─' * 60}")
        print(f"  Composite Score : {result['composite_score']}/100")
        print(f"  Rule Score      : {result['rule_score']}/100")
        print(f"  ML Probability  : {result['ml_probability']:.2%}")
        print(f"  ML Risk Tier    : {result['ml_risk_tier']}")
        print(f"  Recommendation  : {result['recommendation']}")
        if result["flags"]:
            print(f"  Flags ({len(result['flags'])}):")
            for flag in result["flags"]:
                print(f"    • {flag}")
        print()
